import React, { useState, useEffect } from "react";

function usePageMeta({ title, description, canonical, ogImage }: {
  title: string; description: string; canonical: string; ogImage: string;
}) {
  useEffect(() => {
    const prev = {
      title: document.title,
      desc: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "",
    };
    document.title = title;
    const setMeta = (sel: string, attr: string, val: string) => {
      let el = document.querySelector(sel);
      if (!el) { el = document.createElement("meta"); document.head.appendChild(el); }
      el.setAttribute(attr, val);
    };
    setMeta('meta[name="description"]', "content", description);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:url"]', "content", canonical);
    setMeta('meta[property="og:image"]', "content", ogImage);
    setMeta('meta[name="twitter:title"]', "content", title);
    setMeta('meta[name="twitter:description"]', "content", description);
    setMeta('meta[name="twitter:image"]', "content", ogImage);
    let canon = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canon) { canon = document.createElement("link") as HTMLLinkElement; canon.rel = "canonical"; document.head.appendChild(canon); }
    canon.href = canonical;
    return () => {
      document.title = prev.title;
      setMeta('meta[name="description"]', "content", prev.desc);
    };
  }, [title, description, canonical, ogImage]);
}

const CODE = {
  charsetWorking: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Page – UTF-8 ✓</title>
</head>
<body>
  <h1>नमस्ते • こんにちは • 你好 • مرحبا</h1>
  <p>Hindi, Japanese, Chinese, Arabic – all render perfectly!</p>
  <p>Special chars: © ® € £ ¥ — " " ' '</p>
</body>
</html>`,

  charsetBroken: `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- ❌ NO meta charset tag here -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Page – broken</title>
</head>
<body>
  <!-- Without charset declaration the browser may
       guess wrong (often ISO-8859-1) and display:
       â€œGarbled textâ€? instead of "Garbled text" -->
  <h1>नमस्ते</h1>
  <!-- May display as: à¤¨à¤®à¤¸à¥à¤¤à¥‡ -->
  <p>Copyright © 2024</p>
  <!-- May display as: Copyright Â© 2024 -->
</body>
</html>`,

  htmlTags: `<!-- ── Document Structure ── -->
<!DOCTYPE html>          <!-- Tells browser: HTML5 document -->
<html lang="en">         <!-- Root element, lang for SEO/a11y -->
<head> … </head>         <!-- Meta info (not visible) -->
<body> … </body>         <!-- Visible page content -->

<!-- ── Metadata (inside <head>) ── -->
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="description" content="Page description for Google snippets" />
<meta name="author" content="Jignesh D Maru" />
<meta name="keywords" content="HTML, SEO, tutorial" />
<title>Page Title – shown in tab & search results</title>
<link rel="canonical" href="https://example.com/page" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="stylesheet" href="style.css" />
<script src="app.js" defer></script>

<!-- ── Open Graph (Social sharing) ── -->
<meta property="og:title" content="Page Title" />
<meta property="og:description" content="Short description" />
<meta property="og:image" content="https://example.com/og.png" />
<meta property="og:url" content="https://example.com/page" />
<meta property="og:type" content="website" />

<!-- ── Twitter Card ── -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Page Title" />
<meta name="twitter:image" content="https://example.com/og.png" />

<!-- ── Headings (SEO hierarchy) ── -->
<h1>Main Heading – ONE per page</h1>
<h2>Section Heading</h2>
<h3>Sub-section</h3>
<h4>…</h4> <h5>…</h5> <h6>Smallest</h6>

<!-- ── Text Content ── -->
<p>Paragraph – basic building block of text</p>
<strong>Bold / important</strong>
<em>Italic / emphasis</em>
<small>Fine print</small>
<abbr title="Search Engine Optimisation">SEO</abbr>
<mark>Highlighted text</mark>
<del>Deleted text</del>
<ins>Inserted text</ins>
<code>inline code</code>
<pre><code>
  multi-line
  code block
</code></pre>
<blockquote cite="https://source.com">A quote</blockquote>
<q>An inline quotation</q>
<cite>Source title</cite>

<!-- ── Links & Media ── -->
<a href="https://example.com" target="_blank" rel="noopener">Link text</a>
<img src="photo.jpg" alt="Descriptive alt text – crucial for Image SEO"
     width="800" height="600" loading="lazy" />
<figure>
  <img src="chart.png" alt="Sales chart 2024" />
  <figcaption>Fig 1: Sales chart 2024</figcaption>
</figure>
<video src="clip.mp4" controls width="640"></video>
<audio src="audio.mp3" controls></audio>

<!-- ── Lists ── -->
<ul>                     <!-- Unordered (bullets) -->
  <li>Item one</li>
  <li>Item two</li>
</ul>
<ol>                     <!-- Ordered (numbers) -->
  <li>Step one</li>
  <li>Step two</li>
</ol>
<dl>                     <!-- Definition list -->
  <dt>Term</dt>
  <dd>Definition</dd>
</dl>

<!-- ── Tables ── -->
<table>
  <caption>Monthly sales</caption>
  <thead>
    <tr><th scope="col">Month</th><th scope="col">Sales</th></tr>
  </thead>
  <tbody>
    <tr><td>January</td><td>₹ 50,000</td></tr>
    <tr><td>February</td><td>₹ 62,000</td></tr>
  </tbody>
  <tfoot>
    <tr><td>Total</td><td>₹ 1,12,000</td></tr>
  </tfoot>
</table>

<!-- ── Forms ── -->
<form action="/submit" method="post">
  <label for="name">Full Name</label>
  <input type="text" id="name" name="name" required placeholder="John Doe" />

  <label for="email">Email</label>
  <input type="email" id="email" name="email" />

  <label for="msg">Message</label>
  <textarea id="msg" name="msg" rows="4"></textarea>

  <select name="topic">
    <option value="">Choose topic</option>
    <option value="seo">SEO</option>
    <option value="html">HTML</option>
  </select>

  <input type="checkbox" id="agree" name="agree" />
  <label for="agree">I agree to terms</label>

  <button type="submit">Send</button>
</form>

<!-- ── Semantic / Layout ── -->
<header>      <!-- Site header / hero -->
  <nav>       <!-- Navigation links -->
    <a href="/">Home</a>
  </nav>
</header>
<main>        <!-- Primary content (ONE per page) -->
  <article>   <!-- Self-contained content (blog post, news) -->
    <section> <!-- Themed grouping inside article/page -->
      <aside> <!-- Sidebar / tangentially related -->
      </aside>
    </section>
  </article>
</main>
<footer>      <!-- Site footer -->
  <address>   <!-- Contact / author info -->
    <a href="mailto:jignesh@example.com">jignesh@example.com</a>
  </address>
</footer>

<!-- ── Interactive ── -->
<details>
  <summary>Click to expand</summary>
  <p>Hidden content shown on click</p>
</details>
<dialog id="myDialog">
  <p>Modal dialog content</p>
  <button onclick="document.getElementById('myDialog').close()">Close</button>
</dialog>
<progress value="70" max="100">70%</progress>
<meter value="0.6">60%</meter>

<!-- ── Inline vs Block ── -->
<span>inline element – doesn't break line</span>
<div>block element – takes full width</div>`,

  cssBasic: `/* ── Selectors ── */
* { box-sizing: border-box; }   /* universal */
body { margin: 0; }             /* element */
.card { padding: 1rem; }        /* class */
#hero { height: 100vh; }        /* id */
a:hover { color: orange; }      /* pseudo-class */
p::first-line { font-weight: bold; } /* pseudo-element */
input[type="email"] { border: 1px solid #ccc; } /* attribute */

/* ── CSS Variables ── */
:root {
  --color-primary: #e34c26;
  --color-bg: #1e1e1e;
  --font-size-base: 1rem;
  --radius: 0.5rem;
}

/* ── Box Model ── */
.box {
  width: 300px;
  height: 200px;
  padding: 16px 24px;         /* top-bottom left-right */
  margin: 0 auto;             /* centered */
  border: 2px solid #333;
  border-radius: var(--radius);
  outline: 2px dashed red;    /* outside border, no layout impact */
}

/* ── Backgrounds ── */
.hero {
  background-color: #1e1e1e;
  background-image: url('/og-image.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background: linear-gradient(135deg, #e34c26, #264de4);
}

/* ── Typography ── */
body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: #f0f0f0;
}
h1 { font-size: clamp(1.8rem, 5vw, 3rem); font-weight: 700; }
p  { text-align: justify; letter-spacing: 0.02em; }
a  { text-decoration: none; color: var(--color-primary); }

/* ── Colors ── */
.badge { color: #fff; background: rgba(227,76,38,0.9); }
.muted { color: rgb(160, 160, 160); }
.success { color: hsl(142, 70%, 45%); }
.glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(10px); }

/* ── Display & Positioning ── */
.hidden   { display: none; }
.inline   { display: inline; }
.block    { display: block; }
.flex-row { display: flex; gap: 1rem; align-items: center; }
.grid-2   { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }

.relative-parent { position: relative; }
.absolute-child  { position: absolute; top: 0; right: 0; }
.fixed-nav       { position: fixed; top: 0; left: 0; width: 100%; z-index: 100; }
.sticky-header   { position: sticky; top: 0; }

/* ── Flexbox ── */
.navbar {
  display: flex;
  justify-content: space-between; /* main axis */
  align-items: center;            /* cross axis */
  flex-wrap: wrap;
  gap: 1rem;
}
.card-grid {
  display: flex;
  flex-direction: row;
  flex: 1;                        /* grow to fill space */
}

/* ── Grid ── */
.layout {
  display: grid;
  grid-template-columns: 250px 1fr 300px;  /* sidebar | main | aside */
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header  header  header"
    "sidebar main    aside"
    "footer  footer  footer";
  min-height: 100vh;
  gap: 1rem;
}
.layout > header { grid-area: header; }
.layout > main   { grid-area: main; }
.layout > aside  { grid-area: aside; }
.layout > footer { grid-area: footer; }

/* ── Transitions & Animations ── */
.btn {
  transition: background 0.3s ease, transform 0.2s ease;
}
.btn:hover {
  background: var(--color-primary);
  transform: translateY(-2px);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-in {
  animation: fadeIn 0.6s ease forwards;
}

/* ── Responsive (Mobile-first) ── */
/* Base = mobile */
.container { width: 100%; padding: 0 1rem; }

/* Tablet 768px+ */
@media (min-width: 768px) {
  .container { max-width: 768px; margin: 0 auto; }
  .grid-2 { grid-template-columns: 1fr 1fr; }
}

/* Desktop 1024px+ */
@media (min-width: 1024px) {
  .container { max-width: 1200px; }
}

/* Dark/Light mode */
@media (prefers-color-scheme: dark) {
  body { background: #1e1e1e; color: #f0f0f0; }
}

/* ── Shadows ── */
.card { box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
.card:hover { box-shadow: 0 20px 40px rgba(0,0,0,0.5); }

/* ── Overflow & Scroll ── */
.scroll-x { overflow-x: auto; white-space: nowrap; }
.truncate  { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.clamp     { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }`,

  imageSEO: `<!-- ── Image SEO Best Practices ── -->

<!-- 1. ALWAYS write descriptive alt text -->
<!-- Bad: -->
<img src="photo.jpg" alt="image" />
<img src="photo.jpg" alt="" />         <!-- empty = decorative -->

<!-- Good: -->
<img src="html-editor-screenshot.jpg"
     alt="HTML Editor with Monaco code editor and live preview side by side" />

<!-- 2. Use descriptive filenames (affects Google Images ranking) -->
<!-- Bad:  IMG_20240315_085423.jpg -->
<!-- Good: html-editor-monaco-preview-split-view.jpg -->

<!-- 3. Always specify width and height to prevent layout shift (CLS) -->
<img src="hero.jpg" alt="Hero banner"
     width="1200" height="630" />

<!-- 4. Lazy load images below the fold -->
<img src="feature.jpg" alt="Feature screenshot"
     loading="lazy" decoding="async"
     width="800" height="450" />

<!-- 5. Eager load above-fold / hero images (LCP element) -->
<img src="hero.jpg" alt="Hero"
     loading="eager" fetchpriority="high"
     width="1200" height="630" />

<!-- 6. Provide caption using <figure> + <figcaption> -->
<figure>
  <img src="chart.png"
       alt="Bar chart showing monthly page views Jan–Dec 2024"
       width="800" height="400" loading="lazy" />
  <figcaption>Fig 1: Monthly page views increased 3× in 2024</figcaption>
</figure>

<!-- 7. Use modern formats: WebP > JPEG > PNG for photos -->
<picture>
  <source srcset="hero.avif" type="image/avif" />
  <source srcset="hero.webp" type="image/webp" />
  <img src="hero.jpg" alt="Hero image" width="1200" height="630" />
</picture>

<!-- 8. Responsive srcset for different screen sizes -->
<img
  src="hero-800.jpg"
  srcset="hero-400.jpg 400w,
          hero-800.jpg 800w,
          hero-1200.jpg 1200w"
  sizes="(max-width: 600px) 400px,
         (max-width: 900px) 800px,
         1200px"
  alt="HTML Editor interface"
  width="1200" height="630" />

<!-- 9. Open Graph image (shared on Facebook, LinkedIn, WhatsApp) -->
<!-- Ideal size: 1200×630 px (1.91:1 ratio) -->
<meta property="og:image" content="https://example.com/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="HTML Editor – Visual & Code Web Page Builder" />

<!-- 10. Twitter / X Card image -->
<meta name="twitter:image" content="https://example.com/og-image.png" />
<meta name="twitter:image:alt" content="HTML Editor screenshot" />

<!-- 11. Structured Data (JSON-LD) for images -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ImageObject",
  "url": "https://example.com/html-editor-screenshot.jpg",
  "name": "HTML Editor interface screenshot",
  "description": "Monaco code editor with real-time HTML preview",
  "width": 1200,
  "height": 630,
  "author": { "@type": "Person", "name": "Jignesh D Maru" }
}
</script>`,

  ogFavicon: `<!-- ── Open Graph (OG) Tags ── -->
<!-- Add inside <head> — controls how your page looks when shared -->

<!-- Basic OG -->
<meta property="og:title"       content="HTML Editor – Visual & Code Web Page Builder" />
<meta property="og:description" content="Build web pages with Monaco editor, drag-and-drop visual designer, and live preview. Export as ZIP." />
<meta property="og:url"         content="https://html-editor.replit.app/" />
<meta property="og:type"        content="website" />
<meta property="og:locale"      content="en_US" />
<meta property="og:site_name"   content="HTML Editor" />

<!-- OG Image — must be absolute URL, 1200×630 px recommended -->
<meta property="og:image"        content="https://html-editor.replit.app/og-image.png" />
<meta property="og:image:url"    content="https://html-editor.replit.app/og-image.png" />
<meta property="og:image:secure_url" content="https://html-editor.replit.app/og-image.png" />
<meta property="og:image:type"   content="image/png" />
<meta property="og:image:width"  content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt"    content="HTML Editor – Monaco editor with live HTML preview" />

<!-- Twitter / X Card -->
<meta name="twitter:card"        content="summary_large_image" />
<meta name="twitter:site"        content="@yourtwitterhandle" />
<meta name="twitter:creator"     content="@jigneshdmaru" />
<meta name="twitter:title"       content="HTML Editor – Visual & Code Web Page Builder" />
<meta name="twitter:description" content="Build web pages with Monaco editor and live preview" />
<meta name="twitter:image"       content="https://html-editor.replit.app/og-image.png" />
<meta name="twitter:image:alt"   content="HTML Editor screenshot" />

<!-- ── Favicon — all formats for all devices ── -->
<!-- Modern browsers – SVG (scalable, supports dark mode) -->
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />

<!-- Fallback PNG for older browsers -->
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
<link rel="icon" href="/favicon-16.png" sizes="16x16" type="image/png" />

<!-- Apple Touch Icon (iPhone home screen) 180×180 px -->
<link rel="apple-touch-icon" href="/icon-192.png" />

<!-- Android Chrome (PWA) -->
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#e34c26" />

<!-- Windows tile color -->
<meta name="msapplication-TileColor" content="#e34c26" />

<!-- ── SVG Favicon with dark-mode support ── -->
<!-- Save as /public/favicon.svg -->
<!--
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <style>
    /* Light mode: orange icon */
    rect { fill: #e34c26; }
    text { fill: #fff; }
    /* Dark mode: lighter background */
    @media (prefers-color-scheme: dark) {
      rect { fill: #ff6b3d; }
    }
  </style>
  <rect width="32" height="32" rx="6" />
  <text x="16" y="22" text-anchor="middle"
        font-family="monospace" font-size="18" font-weight="bold">&lt;/&gt;</text>
</svg>
-->`,
};

type Tab = "charset" | "htmltags" | "css" | "imageseo" | "ogfavicon";

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "charset", label: "meta charset", icon: "🔤" },
  { id: "htmltags", label: "HTML Tags", icon: "🏷️" },
  { id: "css", label: "CSS Basics", icon: "🎨" },
  { id: "imageseo", label: "Image SEO", icon: "🖼️" },
  { id: "ogfavicon", label: "OG + Favicon", icon: "🔗" },
];

function CodeBlock({ code, label, variant }: { code: string; label?: string; variant?: "ok" | "bad" | "default" }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const borderColor =
    variant === "ok" ? "#22c55e" : variant === "bad" ? "#ef4444" : "#3f3f46";

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      {label && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.5rem",
          }}
        >
          {variant === "ok" && (
            <span
              style={{
                background: "#166534",
                color: "#bbf7d0",
                padding: "2px 10px",
                borderRadius: "999px",
                fontSize: "0.75rem",
                fontWeight: 700,
              }}
            >
              ✓ WORKING
            </span>
          )}
          {variant === "bad" && (
            <span
              style={{
                background: "#7f1d1d",
                color: "#fecaca",
                padding: "2px 10px",
                borderRadius: "999px",
                fontSize: "0.75rem",
                fontWeight: 700,
              }}
            >
              ✗ NOT WORKING
            </span>
          )}
          <span
            style={{ color: "#a1a1aa", fontSize: "0.85rem", fontWeight: 600 }}
          >
            {label}
          </span>
        </div>
      )}
      <div style={{ position: "relative" }}>
        <pre
          style={{
            background: "#18181b",
            border: `1.5px solid ${borderColor}`,
            borderRadius: "0.5rem",
            padding: "1.25rem 1rem 1.25rem 1.25rem",
            overflowX: "auto",
            fontSize: "0.78rem",
            lineHeight: "1.7",
            color: "#e4e4e7",
            margin: 0,
            fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
          }}
        >
          <code>{code}</code>
        </pre>
        <button
          onClick={copy}
          style={{
            position: "absolute",
            top: "0.6rem",
            right: "0.6rem",
            background: copied ? "#166534" : "#27272a",
            color: copied ? "#bbf7d0" : "#a1a1aa",
            border: "1px solid #3f3f46",
            borderRadius: "0.35rem",
            padding: "3px 10px",
            fontSize: "0.7rem",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function CharsetSection() {
  const [previewMode, setPreviewMode] = useState<"working" | "broken">("working");

  const workingHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>body{font-family:sans-serif;padding:2rem;background:#18181b;color:#f4f4f5;line-height:1.8}h1{color:#22c55e;font-size:1.4rem}p{margin:.5rem 0}.badge{display:inline-block;background:#166534;color:#bbf7d0;padding:2px 10px;border-radius:4px;font-size:.75rem;margin-bottom:1rem}</style></head><body><div class="badge">✓ meta charset="UTF-8" present</div><h1>All scripts render correctly ✓</h1><p>🇮🇳 Hindi: <strong>नमस्ते दुनिया</strong></p><p>🇯🇵 Japanese: <strong>こんにちは世界</strong></p><p>🇨🇳 Chinese: <strong>你好世界</strong></p><p>🇸🇦 Arabic: <strong>مرحبا بالعالم</strong></p><p>🇷🇺 Russian: <strong>Привет мир</strong></p><p>🇬🇷 Greek: <strong>Γεια σου κόσμε</strong></p><p>Symbols: © ® ™ € £ ¥ ₹ § ¶ ∞ ≠ ≤ ≥ ±</p><p>Quotes: "curly" 'single' « guillemets »</p><p>Emoji: 🚀🎉✅🔥💻</p></body></html>`;

  const brokenHtml = `<!DOCTYPE html><html><head><style>body{font-family:sans-serif;padding:2rem;background:#18181b;color:#f4f4f5;line-height:1.8}h1{color:#ef4444;font-size:1.4rem}p{margin:.5rem 0}.badge{display:inline-block;background:#7f1d1d;color:#fecaca;padding:2px 10px;border-radius:4px;font-size:.75rem;margin-bottom:1rem}.note{background:#451a03;border:1px solid #b45309;padding:1rem;border-radius:6px;font-size:.82rem;margin-top:1rem}</style></head><body><div class="badge">✗ No meta charset – browser guesses encoding</div><h1>Text may appear garbled ✗</h1><p>Hindi attempt: <strong>à¤¨à¤®à¤¸à¥à¤¤à¥‡</strong> <em>(should be नमस्ते)</em></p><p>Quotes attempt: <strong>â€œcurlyâ€?</strong> <em>(should be "curly")</em></p><p>Copyright: <strong>Â©</strong> <em>(should be ©)</em></p><p>Euro: <strong>â‚¬</strong> <em>(should be €)</em></p><p>Dash: <strong>â€"</strong> <em>(should be —)</em></p><div class="note">⚠️ Without <code>&lt;meta charset="UTF-8"&gt;</code> the browser defaults to ISO-8859-1 or Windows-1252, mangling multi-byte UTF-8 characters into garbage bytes.</div></body></html>`;

  return (
    <div>
      <h2 style={{ color: "#f4f4f5", marginBottom: "0.5rem", fontSize: "1.4rem" }}>
        <code style={{ color: "#e34c26" }}>&lt;meta charset="UTF-8"&gt;</code> — Working vs Not Working
      </h2>
      <p style={{ color: "#a1a1aa", marginBottom: "1.5rem", lineHeight: 1.6 }}>
        The <code style={{ color: "#fb923c", background: "#1c1917", padding: "1px 6px", borderRadius: 4 }}>meta charset</code> tag
        tells the browser which character encoding the page uses. Without it, browsers
        guess — often incorrectly — causing non-Latin scripts and special symbols to appear as garbled bytes.
        Always place it as the <strong style={{ color: "#f4f4f5" }}>very first tag</strong> inside <code style={{ color: "#fb923c", background: "#1c1917", padding: "1px 6px", borderRadius: 4 }}>&lt;head&gt;</code>.
      </p>

      <CodeBlock code={CODE.charsetWorking} label="With charset – all scripts work" variant="ok" />
      <CodeBlock code={CODE.charsetBroken} label="Without charset – garbled output" variant="bad" />

      <div style={{ marginTop: "1.5rem", marginBottom: "1rem" }}>
        <div style={{ color: "#a1a1aa", fontSize: "0.85rem", marginBottom: "0.75rem", fontWeight: 600 }}>
          Live Preview:
        </div>
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
          <button
            onClick={() => setPreviewMode("working")}
            style={{
              padding: "6px 18px",
              borderRadius: "6px",
              border: previewMode === "working" ? "2px solid #22c55e" : "2px solid #3f3f46",
              background: previewMode === "working" ? "#052e16" : "#27272a",
              color: previewMode === "working" ? "#bbf7d0" : "#a1a1aa",
              cursor: "pointer",
              fontSize: "0.82rem",
              fontWeight: 600,
            }}
          >
            ✓ Working (with charset)
          </button>
          <button
            onClick={() => setPreviewMode("broken")}
            style={{
              padding: "6px 18px",
              borderRadius: "6px",
              border: previewMode === "broken" ? "2px solid #ef4444" : "2px solid #3f3f46",
              background: previewMode === "broken" ? "#450a0a" : "#27272a",
              color: previewMode === "broken" ? "#fecaca" : "#a1a1aa",
              cursor: "pointer",
              fontSize: "0.82rem",
              fontWeight: 600,
            }}
          >
            ✗ Not Working (no charset)
          </button>
        </div>
        <iframe
          srcDoc={previewMode === "working" ? workingHtml : brokenHtml}
          title={previewMode === "working" ? "Working charset example" : "Broken charset example"}
          style={{
            width: "100%",
            height: "320px",
            border: `2px solid ${previewMode === "working" ? "#22c55e" : "#ef4444"}`,
            borderRadius: "0.5rem",
            background: "#18181b",
          }}
          sandbox="allow-same-origin"
        />
      </div>

      <div style={{
        background: "#0f172a",
        border: "1px solid #334155",
        borderRadius: "0.5rem",
        padding: "1rem 1.25rem",
        marginTop: "1.5rem",
      }}>
        <div style={{ color: "#38bdf8", fontWeight: 700, marginBottom: "0.5rem" }}>💡 Key Rules</div>
        <ul style={{ color: "#94a3b8", lineHeight: 2, margin: 0, paddingLeft: "1.25rem" }}>
          <li>Always use <code style={{ color: "#fb923c" }}>UTF-8</code> — it supports every human language and emoji</li>
          <li>Place the charset tag <strong style={{ color: "#f4f4f5" }}>before</strong> any other tags (even <code style={{ color: "#fb923c" }}>&lt;title&gt;</code>)</li>
          <li>Google requires UTF-8 for proper indexing of non-Latin content</li>
          <li>Affects SEO: garbled text gets penalised / ignored by crawlers</li>
          <li>Your text file must also be saved as UTF-8 in your editor</li>
        </ul>
      </div>
    </div>
  );
}

export default function SEOPage() {
  const [activeTab, setActiveTab] = useState<Tab>("charset");

  usePageMeta({
    title: "HTML & SEO Tutorial – meta charset, HTML Tags, CSS, Image SEO, Open Graph",
    description: "Learn HTML & SEO: meta charset UTF-8 working vs broken examples, all basic HTML tags, CSS basics, Image SEO for Google, Open Graph tags, and favicon setup. By Jignesh D Maru.",
    canonical: "https://html-viewer-gray-beta.vercel.app/seo",
    ogImage: "https://html-viewer-gray-beta.vercel.app/og-seo-tutorial.png",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#09090b",
        color: "#f4f4f5",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          background: "linear-gradient(135deg, #18181b 0%, #1c1917 100%)",
          borderBottom: "1px solid #27272a",
          padding: "2rem 1.5rem 1.5rem",
        }}
      >
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <span style={{
              background: "#e34c26",
              color: "#fff",
              padding: "4px 12px",
              borderRadius: "6px",
              fontWeight: 700,
              fontSize: "1rem",
              fontFamily: "monospace",
            }}>
              &lt;/&gt;
            </span>
            <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700, color: "#f4f4f5" }}>
              HTML &amp; SEO Tutorial
            </h1>
          </div>
          <p style={{ color: "#71717a", margin: "0.25rem 0 0", fontSize: "0.9rem" }}>
            meta charset · HTML tags · CSS · Image SEO · Open Graph · Favicon
          </p>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
            <span style={{ background: "#1c1917", border: "1px solid #292524", color: "#a8a29e", padding: "3px 10px", borderRadius: "999px", fontSize: "0.72rem" }}>
              👤 Author: Jignesh D Maru
            </span>
            <span style={{ background: "#1c1917", border: "1px solid #292524", color: "#a8a29e", padding: "3px 10px", borderRadius: "999px", fontSize: "0.72rem" }}>
              🛠️ Developer: Jignesh D Maru
            </span>
            <span style={{ background: "#1c1917", border: "1px solid #292524", color: "#a8a29e", padding: "3px 10px", borderRadius: "999px", fontSize: "0.72rem" }}>
              📅 2024
            </span>
            <a
              href="/"
              style={{
                background: "#1c1917",
                border: "1px solid #292524",
                color: "#e34c26",
                padding: "3px 10px",
                borderRadius: "999px",
                fontSize: "0.72rem",
                textDecoration: "none",
              }}
            >
              ← Back to Editor
            </a>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav
        style={{
          background: "#18181b",
          borderBottom: "1px solid #27272a",
          overflowX: "auto",
        }}
      >
        <div
          style={{
            maxWidth: "960px",
            margin: "0 auto",
            display: "flex",
            gap: "0",
            padding: "0 1.5rem",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: activeTab === tab.id ? "2px solid #e34c26" : "2px solid transparent",
                color: activeTab === tab.id ? "#f4f4f5" : "#71717a",
                padding: "0.85rem 1rem",
                cursor: "pointer",
                fontSize: "0.82rem",
                fontWeight: activeTab === tab.id ? 600 : 400,
                whiteSpace: "nowrap",
                transition: "color 0.15s",
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
        {activeTab === "charset" && <CharsetSection />}

        {activeTab === "htmltags" && (
          <div>
            <h2 style={{ color: "#f4f4f5", marginBottom: "0.5rem", fontSize: "1.4rem" }}>
              All Basic HTML Tags
            </h2>
            <p style={{ color: "#a1a1aa", marginBottom: "1.5rem", lineHeight: 1.6 }}>
              A comprehensive reference of the most important HTML tags — from document structure
              to semantic layout. Well-chosen tags improve accessibility, SEO, and maintainability.
            </p>
            <CodeBlock code={CODE.htmlTags} />
          </div>
        )}

        {activeTab === "css" && (
          <div>
            <h2 style={{ color: "#f4f4f5", marginBottom: "0.5rem", fontSize: "1.4rem" }}>
              Basic CSS Examples
            </h2>
            <p style={{ color: "#a1a1aa", marginBottom: "1.5rem", lineHeight: 1.6 }}>
              Essential CSS patterns covering selectors, the box model, flexbox, grid, typography,
              animations, and responsive design. All examples follow modern best practices.
            </p>
            <CodeBlock code={CODE.cssBasic} />
          </div>
        )}

        {activeTab === "imageseo" && (
          <div>
            <h2 style={{ color: "#f4f4f5", marginBottom: "0.5rem", fontSize: "1.4rem" }}>
              Image SEO — Google Images Optimisation
            </h2>
            <p style={{ color: "#a1a1aa", marginBottom: "1.5rem", lineHeight: 1.6 }}>
              Images are a major source of organic traffic from Google Images. These techniques
              help your images rank, improve page speed scores, and pass Core Web Vitals.
            </p>
            <CodeBlock code={CODE.imageSEO} />

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              marginTop: "1.5rem",
            }}>
              {[
                { icon: "📝", title: "Descriptive alt text", desc: "Describes the image for Google crawlers and screen readers. Primary ranking signal." },
                { icon: "📁", title: "Filename matters", desc: "Use-kebab-case-descriptive-names.jpg — Google reads filenames for context." },
                { icon: "📐", title: "Width & Height", desc: "Always specify dimensions to prevent Cumulative Layout Shift (CLS)." },
                { icon: "⚡", title: "loading='lazy'", desc: "Defer off-screen images to improve Time to Interactive (TTI) and LCP." },
                { icon: "🌐", title: "Modern formats", desc: "Serve AVIF / WebP for ~50% smaller file sizes vs JPEG at same quality." },
                { icon: "📱", title: "Responsive srcset", desc: "Serve correct size for each device — crucial for mobile-first indexing." },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    background: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: "0.5rem",
                    padding: "1rem",
                  }}
                >
                  <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>{item.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#f4f4f5", marginBottom: "0.3rem" }}>{item.title}</div>
                  <div style={{ fontSize: "0.78rem", color: "#71717a", lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "ogfavicon" && (
          <div>
            <h2 style={{ color: "#f4f4f5", marginBottom: "0.5rem", fontSize: "1.4rem" }}>
              Open Graph Tags &amp; Favicon
            </h2>
            <p style={{ color: "#a1a1aa", marginBottom: "1.5rem", lineHeight: 1.6 }}>
              Open Graph controls how your page appears when shared on Facebook, LinkedIn, WhatsApp,
              Slack, and iMessage. A proper favicon builds brand recognition across browser tabs,
              bookmarks, and PWA home screens.
            </p>
            <CodeBlock code={CODE.ogFavicon} />

            {/* OG Preview Card */}
            <div style={{ marginTop: "1.5rem" }}>
              <div style={{ color: "#a1a1aa", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                How this site looks when shared (OG Card preview):
              </div>
              <div style={{
                maxWidth: "520px",
                background: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "0.75rem",
                overflow: "hidden",
              }}>
                <img
                  src="/og-image.png"
                  alt="HTML Editor OG preview"
                  style={{ width: "100%", display: "block", aspectRatio: "1200/630", objectFit: "cover" }}
                />
                <div style={{ padding: "0.75rem 1rem" }}>
                  <div style={{ fontSize: "0.72rem", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em" }}>html-editor.replit.app</div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#f4f4f5", margin: "0.2rem 0" }}>HTML Editor – Visual &amp; Code Web Page Builder</div>
                  <div style={{ fontSize: "0.82rem", color: "#a1a1aa" }}>Build web pages with Monaco editor, drag-and-drop visual designer, and live preview.</div>
                </div>
              </div>
            </div>

            {/* Favicon preview */}
            <div style={{ marginTop: "1.5rem" }}>
              <div style={{ color: "#a1a1aa", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                Favicon — where it appears:
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "1rem",
              }}>
                {[
                  { place: "Browser tab", desc: "16×16 or 32×32 px — SVG preferred" },
                  { place: "Bookmarks bar", desc: "16×16 px beside page title" },
                  { place: "iPhone home screen", desc: "180×180 px apple-touch-icon" },
                  { place: "Android PWA", desc: "192×192 + 512×512 in manifest.json" },
                  { place: "Windows taskbar", desc: "Pinned site tile" },
                  { place: "Search results", desc: "Google sometimes shows favicon in SERPs" },
                ].map((f) => (
                  <div
                    key={f.place}
                    style={{
                      background: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "0.5rem",
                      padding: "0.85rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                      <img src="/favicon.svg" alt="favicon" style={{ width: 20, height: 20 }} />
                      <span style={{ fontWeight: 600, fontSize: "0.82rem", color: "#f4f4f5" }}>{f.place}</span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#71717a" }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid #27272a",
        background: "#18181b",
        padding: "1.5rem",
        textAlign: "center",
      }}>
        <p style={{ color: "#52525b", fontSize: "0.8rem", margin: 0 }}>
          HTML &amp; SEO Tutorial · Author &amp; Developer:{" "}
          <strong style={{ color: "#71717a" }}>Jignesh D Maru</strong> ·{" "}
          <a href="/" style={{ color: "#e34c26", textDecoration: "none" }}>← Back to HTML Editor</a>
        </p>
      </footer>
    </div>
  );
}
