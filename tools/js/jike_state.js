// What is staged, and is 发送 actually live? Also report the 圈子 (circle) picker state —
// on 即刻 an uncircled post reaches almost nobody, so this is not a cosmetic detail.
(() => {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const box = [...document.querySelectorAll('[contenteditable="true"],textarea')].filter(vis)[0];
  const send = [...document.querySelectorAll('button')].filter(vis)
    .find((b) => /^(发送|发布)$/.test((b.innerText || '').trim()));
  const circle = [...document.querySelectorAll('input')].filter(vis)
    .find((i) => /圈子/.test(i.placeholder || ''));
  const body = box ? (box.innerText || box.value || '') : '';
  return {
    charCount: body.length,
    firstLine: body.split('\n')[0],
    lastLine: body.trim().split('\n').pop(),
    hasLink: body.includes('allenwu-blip.github.io/huidu'),
    sendEnabled: send ? !send.disabled : null,
    circlePlaceholder: circle ? circle.placeholder : null,
    circleValue: circle ? circle.value : null,
  };
})();
