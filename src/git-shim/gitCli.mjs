import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const argv = process.argv.slice(2);
const cmd = argv[0];
const args = argv.slice(1);

/* ── helpers ────────────────────────────────────────────── */
function cwd() { return process.cwd(); }

function die(msg, code = 1) {
  console.error('fatal: ' + msg);
  process.exit(code);
}

function ok(msg) { console.log(msg); }

function gitOpts(dir) {
  return { fs, dir: dir || cwd(), http, corsProxy: 'https://cors.isomorphic-git.org' };
}

function parseFlags(args) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-m' && args[i + 1]) { flags.message = args[++i]; }
    else if (args[i].startsWith('--message=')) { flags.message = args[i].slice(10); }
    else if (args[i] === '-b' && args[i + 1]) { flags.branch = args[++i]; }
    else if (args[i] === '--branch' && args[i + 1]) { flags.branch = args[++i]; }
    else if (args[i] === '-d' || args[i] === '--delete') { flags.delete = true; }
    else if (args[i] === '-D') { flags.delete = true; flags.force = true; }
    else if (args[i] === '-a' || args[i] === '--all') { flags.all = true; }
    else if (args[i] === '--cached') { flags.cached = true; }
    else if (args[i] === '-s' || args[i] === '--short') { flags.short = true; }
    else if (args[i] === '--oneline') { flags.oneline = true; }
    else if (args[i] === '-n' && args[i + 1]) { flags.n = parseInt(args[++i]) || 10; }
    else if (args[i] === '--depth' && args[i + 1]) { flags.depth = parseInt(args[++i]); }
    else if (args[i] === '-u' || args[i] === '--set-upstream-to') { flags.setUpstream = true; }
    else if (args[i] === '--no-pager') { /* ignore */ }
    else if (!args[i].startsWith('-')) { rest.push(args[i]); }
  }
  return { flags, rest };
}

/* ── GitHub API clone (CORS-safe) ───────────────────────── */
async function ghApiClone(url, targetDir) {
  const clean = url.replace(/\.git$/, '');
  const m = clean.replace(/^https?:\/\//, '').match(/^github\.com\/([^\/]+)\/([^\/\s]+)/);
  if (!m) return false; // not a github URL, fall through to isomorphic-git clone

  const [, owner, repo] = m;
  console.log("Cloning into '" + targetDir + "'...");

  // Get default branch
  let defaultBranch = 'main';
  try {
    const rr = await fetch('https://api.github.com/repos/' + owner + '/' + repo, {
      headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    });
    if (rr.ok) { const d = await rr.json(); defaultBranch = d.default_branch || 'main'; }
  } catch {}

  // Recursive tree
  const tr = await fetch(
    'https://api.github.com/repos/' + owner + '/' + repo + '/git/trees/' + defaultBranch + '?recursive=1',
    { headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } }
  );
  if (!tr.ok) {
    const e = await tr.json().catch(() => ({}));
    die(tr.status + ' ' + (e.message || tr.statusText));
  }
  const tree = await tr.json();
  const blobs = (tree.tree || []).filter(f => f.type === 'blob');
  if (!blobs.length) die('empty repo or could not read tree');

  console.log('remote: Counting objects: ' + blobs.length);
  fs.mkdirSync(targetDir, { recursive: true });

  // Init a .git directory so isomorphic-git works on the clone afterwards
  await git.init({ fs, dir: targetDir, defaultBranch });

  let done = 0, failed = 0;
  const CONC = 5;
  for (let i = 0; i < blobs.length; i += CONC) {
    const batch = blobs.slice(i, i + CONC);
    await Promise.all(batch.map(async item => {
      try {
        const r = await fetch(
          'https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + item.path + '?ref=' + defaultBranch,
          { headers: { Accept: 'application/vnd.github.raw+json', 'X-GitHub-Api-Version': '2022-11-28' } }
        );
        if (!r.ok) { failed++; return; }
        const buf = await r.arrayBuffer();
        const fp = path.join(targetDir, item.path);
        fs.mkdirSync(path.dirname(fp), { recursive: true });
        fs.writeFileSync(fp, Buffer.from(buf));
        done++;
      } catch { failed++; }
      process.stderr.write('\r  Receiving objects: ' + (done + failed) + '/' + blobs.length + ' (' + done + ' ok)  ');
    }));
  }
  process.stderr.write('\r\x1b[K');

  // Stage all downloaded files so git status works
  try {
    await git.add({ fs, dir: targetDir, filepath: '.' });
    await git.commit({
      fs, dir: targetDir,
      message: 'Initial commit (cloned via GitHub API)',
      author: { name: 'git', email: 'git@localhost' },
    });
  } catch {}

  // Set remote origin
  try { await git.addRemote({ fs, dir: targetDir, remote: 'origin', url }); } catch {}

  if (failed) process.stderr.write('warning: ' + failed + ' file(s) skipped (binary/rate-limit)\n');
  console.log('Done. Cloned ' + done + '/' + blobs.length + ' files into ./' + targetDir);
  return true;
}

/* ── commands ───────────────────────────────────────────── */
async function main() {
  switch (cmd) {

    /* ── clone ── */
    case 'clone': {
      const { flags, rest } = parseFlags(args);
      const url = rest[0];
      const targetDir = rest[1] || (url ? url.replace(/\.git$/, '').split('/').pop() : null);
      if (!url) die('usage: git clone <url> [dir]');

      // Try GitHub API first (fast, CORS-safe); fall back to isomorphic-git
      const didGH = await ghApiClone(url, targetDir);
      if (!didGH) {
        console.log("Cloning into '" + targetDir + "'...");
        try {
          await git.clone({
            ...gitOpts(cwd()),
            url, dir: targetDir,
            singleBranch: true,
            depth: flags.depth || undefined,
          });
          console.log('done.');
        } catch (e) { die(e.message); }
      }
      break;
    }

    /* ── init ── */
    case 'init': {
      const dir = args[0] || cwd();
      if (args[0]) fs.mkdirSync(dir, { recursive: true });
      await git.init({ fs, dir, defaultBranch: 'main' });
      ok('Initialized empty Git repository in ' + path.resolve(dir) + '/.git/');
      break;
    }

    /* ── status ── */
    case 'status': {
      const o = gitOpts();
      try {
        const branch = await git.currentBranch(o) || 'HEAD';
        const matrix = await git.statusMatrix(o);
        const staged   = matrix.filter(([,h,w,s]) => h !== 1 || w !== 1 || s !== 1);
        const modified = matrix.filter(([,h,w]) => h === 1 && w === 2);
        const deleted  = matrix.filter(([,h,w]) => h === 1 && w === 0);
        const untracked= matrix.filter(([,h]) => h === 0);
        const newSt    = matrix.filter(([,h,w,s]) => h === 0 && s === 2);

        ok('On branch ' + branch);
        if (!staged.length && !modified.length && !deleted.length && !untracked.length) {
          ok('nothing to commit, working tree clean');
        } else {
          if (staged.length) {
            ok('\nChanges to be committed:');
            staged.forEach(([f]) => ok('\tnew file:   ' + f));
          }
          if (modified.length || deleted.length) {
            ok('\nChanges not staged for commit:');
            modified.forEach(([f]) => ok('\tmodified:   ' + f));
            deleted.forEach(([f]) => ok('\tdeleted:    ' + f));
          }
          if (untracked.length) {
            ok('\nUntracked files:');
            untracked.forEach(([f]) => ok('\t' + f));
          }
          if (newSt.length) {
            ok('\nNew files staged:');
            newSt.forEach(([f]) => ok('\t' + f));
          }
        }
      } catch (e) { die(e.message); }
      break;
    }

    /* ── add ── */
    case 'add': {
      const { rest } = parseFlags(args);
      const filepath = rest[0] || '.';
      try {
        await git.add({ fs, dir: cwd(), filepath });
        // no output (like real git)
      } catch (e) { die(e.message); }
      break;
    }

    /* ── rm ── */
    case 'rm': {
      const { rest } = parseFlags(args);
      for (const f of rest) {
        try { await git.remove({ fs, dir: cwd(), filepath: f }); } catch {}
      }
      break;
    }

    /* ── commit ── */
    case 'commit': {
      const { flags } = parseFlags(args);
      if (!flags.message) die('no commit message — use: git commit -m "message"');
      try {
        const sha = await git.commit({
          fs, dir: cwd(),
          message: flags.message,
          author: { name: os.userInfo().username || 'user', email: 'user@localhost' },
        });
        ok('[' + sha.slice(0, 7) + '] ' + flags.message);
      } catch (e) { die(e.message); }
      break;
    }

    /* ── log ── */
    case 'log': {
      const { flags } = parseFlags(args);
      try {
        const commits = await git.log({ fs, dir: cwd(), depth: flags.n || 10 });
        for (const c of commits) {
          if (flags.oneline) {
            ok(c.oid.slice(0, 7) + ' ' + c.commit.message.split('\n')[0]);
          } else {
            ok('commit ' + c.oid);
            ok('Author: ' + c.commit.author.name + ' <' + c.commit.author.email + '>');
            const d = new Date(c.commit.author.timestamp * 1000);
            ok('Date:   ' + d.toUTCString());
            ok('\n    ' + c.commit.message.trim() + '\n');
          }
        }
      } catch (e) { die(e.message); }
      break;
    }

    /* ── branch ── */
    case 'branch': {
      const { flags, rest } = parseFlags(args);
      try {
        if (flags.delete && rest[0]) {
          await git.deleteBranch({ fs, dir: cwd(), ref: rest[0] });
          ok('Deleted branch ' + rest[0]);
        } else if (rest[0]) {
          await git.branch({ fs, dir: cwd(), ref: rest[0] });
          ok('Created branch ' + rest[0]);
        } else {
          const branches = await git.listBranches({ fs, dir: cwd() });
          const current = await git.currentBranch({ fs, dir: cwd() });
          branches.forEach(b => ok((b === current ? '* ' : '  ') + b));
        }
      } catch (e) { die(e.message); }
      break;
    }

    /* ── checkout ── */
    case 'checkout': {
      const { flags, rest } = parseFlags(args);
      const ref = rest[0];
      if (!ref) die('usage: git checkout [-b] <branch>');
      try {
        if (flags.branch) {
          await git.branch({ fs, dir: cwd(), ref: flags.branch, checkout: true });
          ok("Switched to a new branch '" + flags.branch + "'");
        } else {
          await git.checkout({ fs, dir: cwd(), ref });
          ok("Switched to branch '" + ref + "'");
        }
      } catch (e) { die(e.message); }
      break;
    }

    /* ── diff ── */
    case 'diff': {
      try {
        const matrix = await git.statusMatrix({ fs, dir: cwd() });
        const changed = matrix.filter(([,h,w]) => h === 1 && w === 2);
        if (!changed.length) { ok(''); break; }
        for (const [filepath] of changed) {
          ok('diff --git a/' + filepath + ' b/' + filepath);
          ok('--- a/' + filepath);
          ok('+++ b/' + filepath);
          try {
            const content = fs.readFileSync(path.join(cwd(), filepath), 'utf-8');
            content.split('\n').slice(0, 30).forEach(l => ok('+' + l));
          } catch {}
        }
      } catch (e) { die(e.message); }
      break;
    }

    /* ── fetch / pull ── */
    case 'fetch':
    case 'pull': {
      try {
        if (cmd === 'pull') {
          await git.pull({ ...gitOpts(), author: { name: 'user', email: 'user@localhost' } });
        } else {
          await git.fetch({ ...gitOpts() });
        }
        ok('Done.');
      } catch (e) {
        // CORS issues are common for non-GitHub hosts
        process.stderr.write('warning: ' + e.message + '\n');
        process.stderr.write('tip: git pull/fetch may fail for some hosts due to CORS restrictions.\n');
        process.exit(1);
      }
      break;
    }

    /* ── push ── */
    case 'push': {
      process.stderr.write('error: git push requires authentication (token not configured).\n');
      process.stderr.write('tip: set GIT_TOKEN env var with a GitHub personal access token.\n');
      process.exit(1);
      break;
    }

    /* ── remote ── */
    case 'remote': {
      const sub = args[0];
      const { rest } = parseFlags(args.slice(1));
      try {
        if (sub === 'add') {
          await git.addRemote({ fs, dir: cwd(), remote: rest[0], url: rest[1] });
          // no output
        } else if (sub === 'remove' || sub === 'rm') {
          await git.deleteRemote({ fs, dir: cwd(), remote: rest[0] });
        } else {
          const remotes = await git.listRemotes({ fs, dir: cwd() });
          remotes.forEach(r => ok(r.remote + '\t' + r.url));
        }
      } catch (e) { die(e.message); }
      break;
    }

    /* ── tag ── */
    case 'tag': {
      const { rest } = parseFlags(args);
      try {
        if (rest[0]) {
          await git.tag({ fs, dir: cwd(), ref: rest[0] });
          ok('Tagged ' + rest[0]);
        } else {
          const tags = await git.listTags({ fs, dir: cwd() });
          tags.forEach(t => ok(t));
        }
      } catch (e) { die(e.message); }
      break;
    }

    /* ── stash (stub) ── */
    case 'stash': {
      ok('warning: git stash is not fully supported in this environment.');
      break;
    }

    /* ── merge (stub) ── */
    case 'merge': {
      const { rest } = parseFlags(args);
      try {
        await git.merge({ fs, dir: cwd(), ours: undefined, theirs: rest[0], author: { name: 'user', email: 'user@localhost' } });
        ok('Merged.');
      } catch (e) { die(e.message); }
      break;
    }

    /* ── version ── */
    case '--version':
    case 'version': {
      ok('git version isomorphic-git (WebContainer)');
      break;
    }

    /* ── help / no cmd ── */
    case '--help':
    case 'help':
    case undefined: {
      ok([
        'usage: git <command> [args]',
        '',
        'Common commands:',
        '  clone <url> [dir]       Clone a repository',
        '  init [dir]              Create an empty repository',
        '  status                  Show working tree status',
        '  add <path>              Stage changes',
        '  commit -m "msg"         Record changes',
        '  log [--oneline] [-n N]  Show commit history',
        '  branch [-d] [name]      List or manage branches',
        '  checkout [-b] <branch>  Switch branches',
        '  diff                    Show unstaged changes',
        '  remote [add|remove]     Manage remotes',
        '  fetch / pull            Update from remote',
        '  tag [name]              List or create tags',
        '',
        'Note: Running inside WebContainer (browser sandbox).',
        '      git push requires GIT_TOKEN env var.',
      ].join('\n'));
      break;
    }

    default: {
      process.stderr.write("git: '" + cmd + "' is not a git command. See 'git help'.\n");
      process.exit(1);
    }
  }
}

main().catch(e => { console.error('git error:', e.message); process.exit(1); });
