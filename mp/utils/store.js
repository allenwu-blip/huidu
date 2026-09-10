/**
 * Local storage for the mini program.
 *
 * The web build uses IndexedDB; there is no IndexedDB here, so this is the one layer that is
 * genuinely rewritten rather than generated from src/. Everything above it — schema, importer,
 * review engine — is shared, and test/mp-parity.test.mjs proves the two clients agree.
 *
 * wx storage is a single key/value space with a 10 MB cap per mini program. 92 cards of real
 * data are about 200 KB, so one key holding the whole array is well within budget and avoids
 * the read-modify-write races that per-card keys would invite.
 */
const KEY = 'huidu.cards.v1';

function readAll() {
  try {
    const raw = wx.getStorageSync(KEY);
    if (!raw) return [];
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    // A corrupt blob must not brick the app: report empty and let the reader re-import.
    console.error('[huidu] storage read failed', e);
    return [];
  }
}

function writeAll(cards) {
  try {
    wx.setStorageSync(KEY, JSON.stringify(cards));
    return true;
  } catch (e) {
    console.error('[huidu] storage write failed', e);
    wx.showToast({ title: '保存失败，可能存储已满', icon: 'none' });
    return false;
  }
}

/** Replace or insert a single card, keeping the rest untouched. */
function putOne(card) {
  const all = readAll();
  const i = all.findIndex((c) => c.id === card.id);
  if (i === -1) all.push(card);
  else all[i] = card;
  writeAll(all);
  return card;
}

function clearAll() {
  try {
    wx.removeStorageSync(KEY);
  } catch (e) {
    console.error('[huidu] storage clear failed', e);
  }
}

/** Rough footprint, so the import screen can warn before the 10 MB ceiling bites. */
function sizeInfo() {
  try {
    const info = wx.getStorageInfoSync();
    return { usedKB: info.currentSize, limitKB: info.limitSize };
  } catch (e) {
    return { usedKB: null, limitKB: null };
  }
}

module.exports = { KEY, readAll, writeAll, putOne, clearAll, sizeInfo };
