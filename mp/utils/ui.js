/**
 * Presentation helpers, ported from app/ui.mjs.
 *
 * These carry the judgement calls that make the product feel considered, so they are kept
 * identical to the web build on purpose: the same highlight should get the same book colour
 * and the same "四年前的今天" wherever a reader opens it.
 *
 * WXSS cannot compute colours the way CSS custom properties do in the browser, so clothCss
 * returns finished colour strings for the template to bind.
 */
const CLOTH = [
  { h: 18, s: 42, l: 46 },
  { h: 148, s: 22, l: 38 },
  { h: 210, s: 28, l: 44 },
  { h: 38, s: 48, l: 45 },
  { h: 350, s: 30, l: 46 },
  { h: 265, s: 20, l: 46 },
  { h: 96, s: 24, l: 38 },
  { h: 5, s: 34, l: 42 },
  { h: 190, s: 26, l: 40 },
  { h: 45, s: 30, l: 40 },
];

function clothOf(bookId) {
  let h = 0;
  const s = String(bookId == null ? '' : bookId);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return CLOTH[h % CLOTH.length];
}

function clothCss(bookId, light) {
  const c = clothOf(bookId);
  return 'hsl(' + c.h + ', ' + c.s + '%, ' + (light == null ? c.l : light) + '%)';
}

const DAY = 86400;

/**
 * How long ago, said the way a person would say it. The "N 年前的今天" case is the whole
 * reason this exists — a bare 2022-08-06 never makes anyone stop.
 */
function agoText(then, now) {
  if (!then) return '';
  const days = Math.floor((now - then) / DAY);
  if (days < 0) return '刚刚';
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 30) return days + ' 天前';

  const a = new Date(then * 1000);
  const b = new Date(now * 1000);
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) months--;

  const sameDay = a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
  const years = Math.floor(months / 12);
  if (years >= 1 && sameDay) return years + ' 年前的今天';
  if (years >= 1) {
    const rem = months % 12;
    return rem ? years + ' 年 ' + rem + ' 个月前' : years + ' 年前';
  }
  return months + ' 个月前';
}

function monthText(ts) {
  const d = new Date(ts * 1000);
  return d.getUTCFullYear() + ' 年 ' + (d.getUTCMonth() + 1) + ' 月';
}

/** Chinese text opening with a quote mark looks indented against a flush rule. */
const HANGING = ['「', '『', '“', '‘', '（', '《', '〈', '"', "'"];
function hangsFirstGlyph(text) {
  return HANGING.indexOf(String(text || '')[0]) !== -1;
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

/**
 * 3 -> 三, 16 -> 十六, 340 -> 三百四十. The 今日 page is typeset like a book page, and a book
 * page says 三年前 and 一／五, not 3 and 1/5. Covers 0..999; larger values fall back to digits.
 * Ported from app/ui.mjs; keep identical.
 */
const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
function cnNum(n) {
  n = Math.trunc(Number(n));
  if (!isFinite(n) || n < 0 || n > 999) return String(n);
  if (n < 10) return CN[n];
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  let s = '';
  if (h) s += CN[h] + '百';
  if (t) s += (h && t === 1 ? '一十' : t === 1 ? '十' : CN[t] + '十');
  else if (h && u) s += '零';
  if (u) s += CN[u];
  return s;
}

/** "3 年 10 个月前" -> "三年十个月前". Display-only; agoText keeps digits for 书架. */
function cnify(s) {
  return String(s == null ? '' : s).replace(/\s*(\d+)\s*/g, function (_, d) { return cnNum(d); });
}

/** The 藏书章 glyph for a book: its first CJK character, or 书 when there is none. */
function chopGlyph(title) {
  const m = String(title == null ? '' : title).match(/[㐀-䶿一-鿿]/);
  return m ? m[0] : '书';
}

module.exports = {
  CLOTH, clothOf, clothCss, agoText, monthText, hangsFirstGlyph, nowSec, DAY,
  cnNum, cnify, chopGlyph,
};
