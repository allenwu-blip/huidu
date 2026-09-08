// Click 发送. This is the irreversible step, so it refuses rather than guesses: the body must
// still contain the link, a circle must still be attached, and the button must be enabled.
(() => {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };

  const box = [...document.querySelectorAll('[contenteditable="true"],textarea')].filter(vis)[0];
  const body = box ? (box.innerText || box.value || '') : '';
  if (!body.includes('allenwu-blip.github.io/huidu')) {
    return { ok: false, why: 'link missing from body — refusing to send', chars: body.length };
  }
  if (body.length < 300) {
    return { ok: false, why: 'body looks truncated — refusing to send', chars: body.length };
  }

  const circleChip = [...document.querySelectorAll('div,span')].filter(vis)
    .some((e) => (e.innerText || '').trim() === '读书会');
  if (!circleChip) return { ok: false, why: 'circle 读书会 is not attached — refusing to send' };

  const send = [...document.querySelectorAll('button')].filter(vis)
    .find((b) => (b.innerText || '').trim() === '发送');
  if (!send) return { ok: false, why: 'no 发送 button' };
  if (send.disabled) return { ok: false, why: '发送 is disabled' };

  send.click();
  return { ok: true, sentChars: body.length };
})();
