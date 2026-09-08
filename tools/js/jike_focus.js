// Focus 即刻's composer and clear whatever is in it, ready for Input.insertText.
// Returns what it found so a failure is visible rather than silent.
(() => {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 40 && r.height > 10 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const cands = [...document.querySelectorAll('textarea,[contenteditable="true"]')].filter(vis);
  if (!cands.length) return { ok: false, why: 'no visible composer' };
  const box = cands[0];
  box.focus();
  box.click();
  // select-all so the insert replaces any leftover draft instead of appending to it
  document.execCommand && document.execCommand('selectAll', false, null);
  return {
    ok: true,
    tag: box.tagName,
    editable: box.getAttribute('contenteditable'),
    ph: box.getAttribute('data-placeholder') || box.placeholder || '',
    isActive: document.activeElement === box,
  };
})();
