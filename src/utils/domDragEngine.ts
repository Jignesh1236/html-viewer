/**
 * domDragEngine.ts — Real DOM reordering for the visual HTML editor.
 *
 * Architecture
 * ────────────
 * All functions are pure helpers that operate on live DOM / iframe documents.
 * The drag *trigger* (pointer events) lives in SelectionOverlay — only that
 * thin layer needs to change if you later swap in SortableJS or dnd-kit.
 *
 * To migrate to SortableJS in the future:
 *   1. Remove the pointer-event wiring in SelectionOverlay's reorder branch.
 *   2. Create a SortableJS instance on the container.
 *   3. In Sortable's `onEnd`, call buildReparentUpdater() + performDomInsert()
 *      exactly as today — the rest of the system stays unchanged.
 *
 * Libraries referenced in the design
 * ────────────────────────────────────
 * • SortableJS      — best for nested drag-drop in custom editors; used by
 *                     Webflow internally; supports multi-list nesting via
 *                     `group` option; lightweight (~30 kB min+gz).
 * • dnd-kit         — best for React-native DnD; uses sensors + modifiers
 *                     pattern; needs a Droppable wrapper per container, making
 *                     it verbose for arbitrary DOM trees.
 * • Dragula         — simplest API; no nested container awareness by default;
 *                     good for flat lists.
 * • interact.js     — best for raw gesture detection (drag, resize, snap);
 *                     not opinionated about DOM placement; would replace the
 *                     pointer-event layer here.
 * • Muuri           — adds grid/masonry layout physics on top of DnD.
 * • GrapesJS        — solves this exact problem; its DomComponents manager
 *                     maintains a parallel component tree, syncing real DOM on
 *                     every drop via model.move().
 *
 * Recommendation for a visual website builder:
 *   SortableJS is the easiest drop-in for nested DOM reordering without a
 *   framework dependency. dnd-kit is best if the whole editor migrates to a
 *   React-managed virtual tree (like GrapesJS). For this editor's architecture
 *   (iframe + live DOM + source sync), this custom engine + SortableJS adapter
 *   is the cleanest path.
 */

// ─────────────────────────────────────────────────────────────────────────────
//  Element classification
// ─────────────────────────────────────────────────────────────────────────────

/** Tags that cannot have children — dropping INSIDE them is never valid. */
export const VOID_ELEMENTS = new Set([
  'area','base','br','col','embed','hr','img','input','link',
  'meta','param','source','track','wbr',
]);

/**
 * Returns true if `el` is allowed to contain child nodes.
 * The check is intentionally broad — void elements are the only hard block.
 */
export function isValidContainer(el: HTMLElement): boolean {
  return !VOID_ELEMENTS.has(el.tagName.toLowerCase());
}

/**
 * Returns true if placing `dragged` inside `container` would be
 * semantically valid HTML.  Only blocks clearly wrong combinations;
 * we trust the developer for everything else.
 */
export function isValidNesting(dragged: HTMLElement, container: HTMLElement): boolean {
  if (!isValidContainer(container)) return false;

  const dt = dragged.tagName.toLowerCase();
  const ct = container.tagName.toLowerCase();

  // Never drop an ancestor inside its own descendant
  if (container === dragged || container.contains(dragged)) return false;

  // Table-structure rules
  if (dt === 'tr'  && !['table','thead','tbody','tfoot'].includes(ct)) return false;
  if ((dt === 'td' || dt === 'th') && ct !== 'tr') return false;

  // List-item rules
  if (dt === 'li' && ct !== 'ul' && ct !== 'ol') return false;

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Drop-target detection
// ─────────────────────────────────────────────────────────────────────────────

export type InsertPosition = 'before' | 'after' | 'inside';

export interface DropTarget {
  /** Element that becomes the new parent ('inside') or sibling's parent ('before'/'after'). */
  container: HTMLElement;
  /** How to insert relative to `reference`. */
  position: InsertPosition;
  /** Reference sibling for before/after; null when appending inside. */
  reference: HTMLElement | null;
}

/**
 * Given mouse coordinates in **iframe viewport space**, return the best DropTarget.
 *
 * Algorithm (mirrors GrapesJS drag manager + SortableJS threshold logic):
 *  1. Use elementFromPoint() to get the element under the cursor.
 *  2. Walk up the tree to find the nearest valid container.
 *  3. Within that container, check each child rect:
 *       top EDGE_RATIO    → before
 *       middle            → inside child (if it's a container) or before/after
 *       bottom EDGE_RATIO → after
 *  4. If no child is hit, append inside the container.
 *
 * @param doc       The iframe's contentDocument
 * @param mouseX    X in iframe viewport coordinates
 * @param mouseY    Y in iframe viewport coordinates
 * @param dragged   The element being dragged (temporarily excluded from hit-test)
 * @param skipTags  Tag names to never use as containers (html, head, body, etc.)
 */
export function getDropTarget(
  doc: Document,
  mouseX: number,
  mouseY: number,
  dragged: HTMLElement,
  skipTags: Set<string>,
): DropTarget | null {
  // Hide dragged element from hit-test so we see what's below it
  const prevPE = dragged.style.pointerEvents;
  dragged.style.pointerEvents = 'none';
  const hit = doc.elementFromPoint(mouseX, mouseY) as HTMLElement | null;
  dragged.style.pointerEvents = prevPE;

  if (!hit) return null;

  // Walk up to find a valid container ancestor of the hit element
  let candidate: HTMLElement | null = hit;
  while (candidate) {
    if (candidate === dragged) { candidate = candidate.parentElement; continue; }
    const tag = candidate.tagName.toLowerCase();
    if (skipTags.has(tag)) { candidate = null; break; }
    if (isValidNesting(dragged, candidate)) break;
    candidate = candidate.parentElement;
  }

  if (!candidate) return null;

  // Edge threshold: top/bottom 25 % of a child → before/after; middle 50 % → inside
  const EDGE = 0.25;

  const children = Array.from(candidate.children).filter(
    (c): c is HTMLElement => c instanceof HTMLElement && c !== dragged,
  );

  for (const child of children) {
    const r = child.getBoundingClientRect();

    // Skip children whose bounding box doesn't contain the cursor
    if (mouseX < r.left || mouseX > r.right) continue;
    if (mouseY < r.top  || mouseY > r.bottom) continue;

    const relY = (mouseY - r.top) / Math.max(r.height, 1);

    if (relY < EDGE) {
      // Top zone → insert BEFORE this child
      return { container: candidate, position: 'before', reference: child };
    }

    if (relY > 1 - EDGE) {
      // Bottom zone → insert AFTER this child
      return { container: candidate, position: 'after', reference: child };
    }

    // Middle zone → try to nest INSIDE the child if it accepts children
    if (isValidNesting(dragged, child)) {
      return { container: child, position: 'inside', reference: null };
    }

    // Child can't be a container — use nearest half as before/after
    return relY < 0.5
      ? { container: candidate, position: 'before', reference: child }
      : { container: candidate, position: 'after',  reference: child };
  }

  // Cursor is in the container but not over any child → append at end
  return { container: candidate, position: 'inside', reference: null };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Visual indicators (injected into the iframe document)
// ─────────────────────────────────────────────────────────────────────────────

const INDICATOR_ID = '__dd-insert-line';
const HIGHLIGHT_ID = '__dd-container-hl';
const ACCENT       = '#e5a45a';

/** Create (or return existing) drop-line indicator element in the iframe. */
export function ensureDropIndicator(doc: Document): HTMLElement {
  let el = doc.getElementById(INDICATOR_ID) as HTMLElement | null;
  if (el) return el;

  el = doc.createElement('div');
  el.id = INDICATOR_ID;
  Object.assign(el.style, {
    position:      'fixed',
    pointerEvents: 'none',
    zIndex:        '2147483646',
    display:       'none',
    height:        '3px',
    background:    ACCENT,
    borderRadius:  '2px',
    boxShadow:     `0 0 8px ${ACCENT}, 0 0 2px #fff`,
    transition:    'top 0.06s ease, left 0.06s ease, width 0.06s ease',
  });
  // Arrowhead on the left end
  el.innerHTML = `<div style="position:absolute;left:-6px;top:-4px;width:0;height:0;` +
    `border-top:5px solid transparent;border-bottom:5px solid transparent;` +
    `border-right:10px solid ${ACCENT}"></div>`;

  doc.body.appendChild(el);
  return el;
}

/** Create (or return existing) container-highlight box in the iframe. */
export function ensureContainerHighlight(doc: Document): HTMLElement {
  let el = doc.getElementById(HIGHLIGHT_ID) as HTMLElement | null;
  if (el) return el;

  el = doc.createElement('div');
  el.id = HIGHLIGHT_ID;
  Object.assign(el.style, {
    position:      'fixed',
    pointerEvents: 'none',
    zIndex:        '2147483645',
    display:       'none',
    border:        `2px dashed ${ACCENT}`,
    borderRadius:  '4px',
    background:    'rgba(229,164,90,0.07)',
    boxSizing:     'border-box',
    transition:    'all 0.06s ease',
  });

  doc.body.appendChild(el);
  return el;
}

/**
 * Reposition the drop-line indicator in the iframe.
 * All coordinates come from getBoundingClientRect() which is already in
 * iframe-viewport space — matching `position:fixed` coordinates exactly.
 */
export function positionDropIndicator(
  indicator: HTMLElement,
  target: DropTarget,
): void {
  const { container, position, reference } = target;

  let left: number, top: number, width: number;

  if (reference) {
    const rr   = reference.getBoundingClientRect();
    left  = rr.left;
    width = rr.width;
    top   = position === 'before' ? rr.top - 1.5 : rr.bottom - 1.5;
  } else {
    // 'inside' with no reference → show line at the bottom of the container
    const cr = container.getBoundingClientRect();
    left  = cr.left;
    width = cr.width;
    top   = cr.bottom - 1.5;
  }

  Object.assign(indicator.style, {
    display: 'block',
    left:    `${left}px`,
    top:     `${top}px`,
    width:   `${Math.max(width, 24)}px`,
  });
}

/** Reposition the container-highlight box over the drop container. */
export function positionContainerHighlight(
  highlight: HTMLElement,
  container: HTMLElement,
): void {
  const r = container.getBoundingClientRect();
  Object.assign(highlight.style, {
    display: 'block',
    left:    `${r.left}px`,
    top:     `${r.top}px`,
    width:   `${r.width}px`,
    height:  `${r.height}px`,
  });
}

/** Hide both indicators without removing them. */
export function hideDropIndicators(doc: Document): void {
  const ind = doc.getElementById(INDICATOR_ID);
  const hl  = doc.getElementById(HIGHLIGHT_ID);
  if (ind) ind.style.display = 'none';
  if (hl)  hl.style.display  = 'none';
}

/** Remove both indicator elements from the iframe document. */
export function removeDropIndicators(doc: Document): void {
  doc.getElementById(INDICATOR_ID)?.remove();
  doc.getElementById(HIGHLIGHT_ID)?.remove();
}

// ─────────────────────────────────────────────────────────────────────────────
//  DOM operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Perform the actual DOM reparenting on a live document.
 * Uses native: insertBefore / Element.before() / Element.after() / appendChild.
 */
export function performDomInsert(dragged: HTMLElement, target: DropTarget): void {
  const { container, position, reference } = target;

  if (position === 'before' && reference) {
    reference.before(dragged);
  } else if (position === 'after' && reference) {
    reference.after(dragged);
  } else {
    // 'inside' — append as last child
    container.appendChild(dragged);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Source-sync helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a replay function that applies the *same structural reparent* to a
 * different document (the parsed source HTML file).
 *
 * IMPORTANT: call this BEFORE performing the live DOM insert, so the paths
 * are computed against the original tree structure.
 *
 * How it works (mirrors Dragula's internal approach):
 *  - We encode the dragged element, container, and reference sibling as
 *    sequences of child-index steps from <body>.
 *  - The replay function walks those paths in the source document and applies
 *    the same DOM operation.
 *  - This avoids any dependency on ids/classes that might not exist in the
 *    source file.
 *
 * Returns null if the path cannot be encoded (e.g. element not in <body>).
 */
export function buildReparentUpdater(
  dragged: HTMLElement,
  target: DropTarget,
): ((sourceDoc: Document) => void) | null {
  const { container, position, reference } = target;

  /** Walk from body to el, recording each child index along the way. */
  function getPath(el: HTMLElement): number[] | null {
    const path: number[] = [];
    let node: HTMLElement | null = el;
    const doc = el.ownerDocument;
    if (!doc) return null;
    while (node && node !== doc.body) {
      const parent: HTMLElement | null = node.parentElement;
      if (!parent) return null;
      const idx = Array.from(parent.children).indexOf(node);
      if (idx < 0) return null;
      path.unshift(idx);
      node = parent;
    }
    return path;
  }

  const draggedPath   = getPath(dragged);
  const containerPath = getPath(container);
  const referencePath = reference ? getPath(reference) : null;

  if (!draggedPath || !containerPath) return null;

  return (sourceDoc: Document) => {
    /** Walk a path from body in sourceDoc. */
    function walk(path: number[]): HTMLElement | null {
      let node: HTMLElement = sourceDoc.body;
      for (const idx of path) {
        const child = node.children[idx] as HTMLElement | undefined;
        if (!child) return null;
        node = child;
      }
      return node;
    }

    const srcDragged   = walk(draggedPath);
    const srcContainer = walk(containerPath);
    const srcReference = referencePath ? walk(referencePath) : null;

    if (!srcDragged || !srcContainer) return;

    if (position === 'before' && srcReference) {
      srcReference.before(srcDragged);
    } else if (position === 'after' && srcReference) {
      srcReference.after(srcDragged);
    } else {
      srcContainer.appendChild(srcDragged);
    }
  };
}
