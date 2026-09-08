// Is this page showing a logged-in session? Written generically so the same probe works on
// V2EX and 即刻 — both put the account entry point in the header and a sign-in link when out.
(() => {
  const txt = document.body.innerText;
  const has = (s) => txt.includes(s);
  const hrefs = [...document.querySelectorAll('a')].map((a) => a.getAttribute('href') || '');
  return {
    url: location.href,
    title: document.title,
    signInWords: ['登录', '注册', 'Sign In', 'Sign Up'].filter(has),
    accountWords: ['我的节点', '未读提醒', '设置', '发布主题', '创作', '个人主页', '登出', '退出'].filter(has),
    hasSigninHref: hrefs.some((h) => /signin|login|\/login/.test(h)),
    hasMemberHref: hrefs.some((h) => /^\/member\//.test(h)),
    memberLink: hrefs.find((h) => /^\/member\//.test(h)) || null,
    head: txt.replace(/\n{2,}/g, '\n').slice(0, 300),
  };
})();
