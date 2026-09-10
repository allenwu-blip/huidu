// Open 微信认证 from the sidebar and read what it says for this 个人 account.
//
// The registration page claimed 「个人类型暂不支持微信认证」 while the official 虚拟支付：个人
// page lists 「已完成小程序认证、备案」 as a precondition. Both cannot be true. This settles it
// from inside the account rather than from documentation that may lag the product.
(() => {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const hit = [...document.querySelectorAll('a,div,span,li')]
    .filter((e) => vis(e) && (e.innerText || '').trim() === '微信认证' && e.getBoundingClientRect().height < 70)
    .pop();
  if (!hit) {
    // it lives under 管理 in some layouts; expand and retry
    const mgmt = [...document.querySelectorAll('a,div,span,li')]
      .filter((e) => vis(e) && (e.innerText || '').trim() === '管理')[0];
    if (mgmt) mgmt.click();
    return { ok: false, why: '微信认证 not visible; expanded 管理, run again' };
  }
  const href = hit.closest('a') ? hit.closest('a').getAttribute('href') : null;
  hit.click();
  return { ok: true, href };
})();
