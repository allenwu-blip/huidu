// Type the post into 即刻's composer WITHOUT sending it, so Allen can read it in place.
// Deliberately does not touch any 发送 button: a public post cannot be unsent, and I told him
// he would see the final text before it goes out.
(() => {
  const TEXT = `翻微信读书的时候看到一条自己四年前划的线。

那本书讲跟父母的边界感，我在旁边写了一句：想搞清楚是什么原因让许多孩子苦恼，想去帮助别人。

我完全不记得写过这句话。

四年划了九十多条，十七本书，划完就沉底了，一次都没再看过。微信读书没有回顾这一层，Readwise 有但它不支持微信读书。

所以做了个小东西。每天推 5 条你自己划过的旧句子回来，看完点「记住了」或者「再来」。

有一个地方我想了很久：你当时写的想法默认是收起的。先只给你看当年划的原文，下面一行小字「你当时写了一句话」，点开才看得到。

因为真正让人停一下的不是那句书里的话，是「我当时到底在想什么」。一上来全摊开，那一下就没了。

不用注册，没有云，没有 AI，数据只在你自己浏览器里。想找几十个人试试，尤其是同样在微信读书上划了一堆线的。

https://allenwu-blip.github.io/huidu/`;

  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 40 && r.height > 10 && s.visibility !== 'hidden' && s.display !== 'none';
  };

  const box =
    [...document.querySelectorAll('textarea')].filter(vis)[0] ||
    [...document.querySelectorAll('[contenteditable="true"]')].filter(vis)[0];
  if (!box) {
    return {
      ok: false,
      why: 'no composer found',
      candidates: [...document.querySelectorAll('textarea,[contenteditable]')].map((e) => ({
        tag: e.tagName,
        ph: e.placeholder || e.getAttribute('data-placeholder') || '',
        vis: vis(e),
      })),
    };
  }

  box.focus();
  if (box.tagName === 'TEXTAREA') {
    const d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(box), 'value');
    d.set.call(box, TEXT);
    box.dispatchEvent(new Event('input', { bubbles: true }));
    box.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    box.textContent = TEXT;
    box.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }

  const sendBtn = [...document.querySelectorAll('button')]
    .filter(vis)
    .find((b) => /^(发送|发布)$/.test((b.innerText || '').trim()));

  return {
    ok: true,
    tag: box.tagName,
    chars: (box.value || box.textContent || '').length,
    sendButtonFound: !!sendBtn,
    sendButtonDisabled: sendBtn ? sendBtn.disabled : null,
    NOT_SENT: true,
  };
})();
