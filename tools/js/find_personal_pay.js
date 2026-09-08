// The sidebar lists 虚拟支付：个人 as a sibling of the enterprise page. Find its real href
// rather than guessing the filename — two URL guesses have already 404'd on this docs site.
(() => {
  const links = [...document.querySelectorAll('a')]
    .map((a) => ({ t: (a.innerText || '').trim(), h: a.href }))
    .filter((x) => x.t && /虚拟支付|会员订阅|技术服务费/.test(x.t));
  return { url: location.href, sidebar: links };
})();
