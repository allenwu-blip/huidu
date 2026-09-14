/**
 * 回甘 — 每天把你划过的线推几条回来。
 *
 * Local-first: every highlight lives in this device's wx storage. There is no server, no
 * account, and no network call anywhere in this mini program, which is also why the whole
 * thing works offline.
 */
App({
  globalData: {
    // last import summary, so the 今日 page can show a sensible first-run message
    lastImport: null,
  },

  onLaunch() {
    // A brand-new install has nothing; the pages handle that themselves. Nothing to warm up.
  },

  onError(err) {
    console.error('[huidu] uncaught', err);
  },
});
