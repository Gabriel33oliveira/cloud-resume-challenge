// Local edit mode for index.html.
//
// How to use:
//   1. Run the dev server and open http://localhost:8791/?edit
//   2. Click any text and type. Alt+click a link, a skill tag or a metric number
//      to change its hidden value (link address, tooltip, or the number itself).
//   3. Press "Save index.html" and pick the index.html in this folder.
//   4. git add, commit and push. GitHub Actions publishes it.
//
// This file is never uploaded to S3 (the deploy workflow only copies the site files),
// and script.js only loads it on localhost.

const EDITABLE = [
  '.nav-brand', '.nav-links a', '.nav-cta',
  '.hero-kicker', '.hero-title', '.hero-sub', '.hero-foot > span:not(.hero-scroll-cue)',
  '.section-label', '.section-title', '.section-heading', '.metric-label',
  '.timeline-date', '.timeline-role', '.timeline-company', '.timeline-entry li', '.highlight-tag',
  '.edu-degree', '.edu-school', '.edu-meta', '.edu-block-label', '.edu-block li',
  '.project-status', '.project-title', '.project-desc', '.project-tags span',
  '.skills-group-label', '.skills-tags span',
  '.cert-name', '.cert-meta',
  '.contact-badge', '.contact-heading', '.contact-sub', '.contact-btn',
].join(', ');
// Hidden values edited with Alt+click: [attribute, label shown in the prompt].
const HIDDEN = [['data-tip', 'Tooltip text'], ['href', 'Link address'], ['data-target', 'Number']];
const DRAFT_KEY = 'portfolio-edit-draft';

const inScope = (root) => [...root.querySelectorAll(EDITABLE)].filter((el) => el.closest('nav, main'));
const hiddenScope = (root) => [...root.querySelectorAll('nav [href], main [href], main [data-tip], main [data-target]')];

const editables = inScope(document);
const hiddenEls = hiddenScope(document);
const original = editables.map((el) => el.innerHTML);
const originalAttrs = hiddenEls.map((el) => HIDDEN.map(([a]) => el.getAttribute(a)));

// ---------- Toolbar ----------
const style = document.createElement('style');
style.textContent = `
  .is-editing [data-editable] { outline: 1px dashed transparent; outline-offset: 3px; border-radius: 2px; cursor: text; transition: outline-color 120ms; }
  .is-editing [data-editable]:hover { outline-color: rgba(91, 157, 255, 0.55); }
  .is-editing [data-editable]:focus { outline: 1px solid #5b9dff; background: rgba(91, 157, 255, 0.06); }
  .is-editing [data-editable].is-changed { outline-color: rgba(0, 217, 163, 0.6); }
  .is-editing .counter { outline: 1px dashed rgba(0, 217, 163, 0.5); outline-offset: 4px; cursor: pointer; }
  .edit-bar { position: fixed; left: 50%; bottom: 20px; z-index: 1000; translate: -50% 0; display: flex; align-items: center; gap: 10px;
    padding: 8px 8px 8px 16px; border: 1px solid rgba(255,255,255,0.16); border-radius: 12px; background: rgba(8, 11, 19, 0.92);
    backdrop-filter: blur(12px); font: 500 12px 'JetBrains Mono', monospace; color: #9098a6; box-shadow: 0 12px 32px -12px rgba(0,0,0,0.7); }
  .edit-bar b { color: #e8eaee; font-weight: 500; }
  .edit-bar .dot { width: 7px; height: 7px; border-radius: 50%; background: #00d9a3; }
  .edit-bar button { font: inherit; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.16); background: transparent; color: #e8eaee; cursor: pointer; }
  .edit-bar button:hover { border-color: #5b9dff; }
  .edit-bar button.primary { background: #3b82f6; border-color: #3b82f6; color: #fff; }
  .edit-bar button.primary:hover { background: #2f68c9; }
  .edit-bar button:disabled { opacity: 0.4; cursor: default; }
  .edit-bar .hint { color: #7d8494; }
  @media (max-width: 720px) { .edit-bar .hint { display: none; } }
`;
document.head.appendChild(style);

const bar = document.createElement('div');
bar.className = 'edit-bar';
bar.innerHTML = `
  <span class="dot"></span><b>Edit mode</b><span class="count">no changes</span>
  <span class="hint">Alt+click: link, tooltip or number</span>
  <button type="button" data-act="discard">Discard</button>
  <button type="button" data-act="exit">Exit</button>
  <button type="button" data-act="save" class="primary">Save index.html</button>`;
document.body.appendChild(bar);
const countEl = bar.querySelector('.count');
const saveBtn = bar.querySelector('[data-act="save"]');

// ---------- Make text editable ----------
editables.forEach((el) => {
  el.setAttribute('contenteditable', 'true');
  el.setAttribute('spellcheck', 'true');
  el.dataset.editable = '';
});

// Keep edits to plain text: no new lines, no pasted formatting.
document.addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('[data-editable]') && e.key === 'Enter') {
    e.preventDefault();
    e.target.blur();
  }
});
document.addEventListener('paste', (e) => {
  if (!e.target.closest || !e.target.closest('[data-editable]')) return;
  e.preventDefault();
  document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
});

// Some fields sit right next to each other (skill tags, project tags). A drag that
// starts in one and ends in the next creates a selection spanning both, and typing
// or deleting over it would wipe text out of two fields at once. Block that: if the
// current selection crosses two different editable fields, cancel the edit instead.
function editableHost(node) {
  const el = node.nodeType === 1 ? node : node.parentElement;
  return el && el.closest('[data-editable]');
}
document.addEventListener('beforeinput', (e) => {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const startHost = editableHost(range.startContainer);
  const endHost = editableHost(range.endContainer);
  if (startHost && endHost && startHost !== endHost) {
    e.preventDefault();
    sel.collapseToStart();
    window.alert('That selection crossed two separate fields, so nothing was changed. Edit one field at a time.');
  }
}, true);

// Links should not navigate while editing; Alt+click edits hidden values.
document.addEventListener('click', (e) => {
  if (e.target.closest('.edit-bar')) return;
  const link = e.target.closest('a');
  if (link) e.preventDefault();
  const counter = e.target.closest('.counter');
  const holder = e.altKey ? e.target.closest('[href], [data-tip], [data-target]') : counter;
  if (!holder) return;
  e.preventDefault();
  const attr = HIDDEN.find(([a]) => holder.hasAttribute(a));
  if (!attr) return;
  const next = window.prompt(attr[1], holder.getAttribute(attr[0]));
  if (next === null) return;
  holder.setAttribute(attr[0], next.trim());
  if (holder.classList.contains('counter')) {
    const d = parseInt(holder.dataset.decimals || '0', 10);
    holder.textContent = (holder.dataset.prefix || '') + parseFloat(next).toFixed(d) + (holder.dataset.suffix || '');
  }
  update();
}, true);

// ---------- Change tracking and drafts ----------
function currentState() {
  return {
    text: editables.map((el) => el.innerHTML),
    attrs: hiddenEls.map((el) => HIDDEN.map(([a]) => el.getAttribute(a))),
  };
}
function changedCount() {
  const st = currentState();
  let n = 0;
  st.text.forEach((html, i) => {
    const changed = html !== original[i];
    editables[i].classList.toggle('is-changed', changed);
    if (changed) n++;
  });
  st.attrs.forEach((vals, i) => { if (vals.some((v, k) => v !== originalAttrs[i][k])) n++; });
  return n;
}
function update() {
  const n = changedCount();
  countEl.textContent = n ? `${n} change${n > 1 ? 's' : ''}` : 'no changes';
  saveBtn.disabled = !n;
  try {
    if (n) localStorage.setItem(DRAFT_KEY, JSON.stringify(currentState()));
    else localStorage.removeItem(DRAFT_KEY);
  } catch (err) { /* private mode: no draft, still works */ }
}
document.addEventListener('input', update);

// Restore an unsaved draft from a previous visit.
try {
  const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
  if (draft && draft.text.length === editables.length && draft.attrs.length === hiddenEls.length) {
    draft.text.forEach((html, i) => { editables[i].innerHTML = html; });
    draft.attrs.forEach((vals, i) => HIDDEN.forEach(([a], k) => { if (vals[k] !== null) hiddenEls[i].setAttribute(a, vals[k]); }));
    document.querySelectorAll('.counter').forEach((c) => {
      const d = parseInt(c.dataset.decimals || '0', 10);
      c.textContent = (c.dataset.prefix || '') + parseFloat(c.dataset.target).toFixed(d) + (c.dataset.suffix || '');
    });
  }
} catch (err) { /* ignore a broken draft */ }
update();

// ---------- Save ----------
// Start from the untouched index.html on disk and copy only the edited parts into it,
// so nothing the scripts add at runtime (labels, animation classes) ends up in the file.
async function buildHtml() {
  const src = await (await fetch('index.html', { cache: 'no-store' })).text();
  const doc = new DOMParser().parseFromString(src, 'text/html');
  const targets = inScope(doc);
  const hiddenTargets = hiddenScope(doc);
  if (targets.length !== editables.length || hiddenTargets.length !== hiddenEls.length) {
    throw new Error('index.html on disk no longer matches this page. Reload and try again.');
  }
  editables.forEach((el, i) => {
    if (el.innerHTML === original[i]) return;
    const clean = el.cloneNode(true);
    clean.querySelectorAll('[style]').forEach((c) => c.removeAttribute('style'));
    clean.querySelectorAll('br').forEach((br) => br.remove());
    targets[i].innerHTML = clean.innerHTML.trim();
  });
  hiddenEls.forEach((el, i) => HIDDEN.forEach(([a]) => {
    if (el.hasAttribute(a)) hiddenTargets[i].setAttribute(a, el.getAttribute(a));
  }));
  // The browser's serializer reflows a couple of spots; put them back so git diffs stay small.
  return ('<!DOCTYPE html>\n' + doc.documentElement.outerHTML + '\n')
    .replace('<html lang="en"><head>', '<html lang="en">\n<head>')
    .replace(/ crossorigin=""/g, ' crossorigin');
}

let fileHandle = null;
async function save() {
  let html;
  try {
    html = await buildHtml();
  } catch (err) {
    window.alert(err.message);
    return;
  }
  try {
    if (window.showSaveFilePicker) {
      // Chrome and Edge: write straight into the project folder.
      fileHandle = fileHandle || await window.showSaveFilePicker({
        suggestedName: 'index.html',
        types: [{ description: 'HTML', accept: { 'text/html': ['.html'] } }],
      });
      const w = await fileHandle.createWritable();
      await w.write(html);
      await w.close();
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      a.download = 'index.html';
      a.click();
      URL.revokeObjectURL(a.href);
    }
  } catch (err) {
    if (err.name !== 'AbortError') window.alert('Could not save: ' + err.message);
    return;
  }
  try { localStorage.removeItem(DRAFT_KEY); } catch (err) { /* ignore */ }
  editables.forEach((el, i) => { original[i] = el.innerHTML; });
  hiddenEls.forEach((el, i) => { originalAttrs[i] = HIDDEN.map(([a]) => el.getAttribute(a)); });
  update();
  countEl.textContent = 'saved';
}

bar.addEventListener('click', (e) => {
  const act = e.target.closest('button') && e.target.closest('button').dataset.act;
  if (act === 'save') save();
  if (act === 'discard' && window.confirm('Throw away all unsaved edits?')) {
    try { localStorage.removeItem(DRAFT_KEY); } catch (err) { /* ignore */ }
    location.reload();
  }
  // Unsaved edits survive Exit and reloads: they are kept as a draft in this browser.
  if (act === 'exit') location.href = location.pathname;
});
