/**
 * Small presentation helpers. Kept out of index.html so they can be reasoned about and,
 * later, tested — they carry the judgement calls that make the app feel considered.
 */

/** Book-cloth colours. Hand-picked and muted rather than a free hue rotation, so no two
 *  books ever clash and none of them shouts. Index is a stable hash of the bookId. */
export const CLOTH = [
  { h: 18, s: 42, l: 46 }, // 赭石
  { h: 148, s: 22, l: 38 }, // 松绿
  { h: 210, s: 28, l: 44 }, // 靛青
  { h: 38, s: 48, l: 45 }, // 秋香
  { h: 350, s: 30, l: 46 }, // 绛
  { h: 265, s: 20, l: 46 }, // 藕荷
  { h: 96, s: 24, l: 38 }, // 竹青
  { h: 5, s: 34, l: 42 }, // 檀
  { h: 190, s: 26, l: 40 }, // 天水
  { h: 45, s: 30, l: 40 }, // 枯黄
];

export function clothOf(bookId) {
  let h = 0;
  const s = String(bookId ?? '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return CLOTH[h % CLOTH.length];
}

export function clothCss(bookId, { l, a } = {}) {
  const c = clothOf(bookId);
  const light = l ?? c.l;
  return a === undefined ? `hsl(${c.h} ${c.s}% ${light}%)` : `hsl(${c.h} ${c.s}% ${light}% / ${a})`;
}

const D = 86400;

/**
 * How long ago, said the way a person would say it.
 * The "N 年前的今天" case is the whole reason this exists: it is the line that makes a reader
 * stop and feel the distance, and a bare 2022-08-06 never does that.
 */
export function agoText(then, now) {
  if (!then) return '';
  const days = Math.floor((now - then) / D);
  if (days < 0) return '刚刚';
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 30) return `${days} 天前`;

  const a = new Date(then * 1000);
  const b = new Date(now * 1000);
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) months--;

  const sameDayOfYear = a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
  const years = Math.floor(months / 12);
  if (years >= 1 && sameDayOfYear) return `${years} 年前的今天`;
  if (years >= 1) {
    const rem = months % 12;
    return rem ? `${years} 年 ${rem} 个月前` : `${years} 年前`;
  }
  return `${months} 个月前`;
}

/** 2022-08-06 -> 2022 年 8 月 */
export function monthText(ts) {
  const d = new Date(ts * 1000);
  return `${d.getUTCFullYear()} 年 ${d.getUTCMonth() + 1} 月`;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/**
 * Chinese text that opens with a quotation or bracket looks indented against a flush left rule.
 * Pulling that first glyph into the margin is the kind of detail nobody names but everybody sees.
 */
export const HANGING = new Set(['「', '『', '“', '‘', '（', '《', '〈', '"', "'"]);
export function hangsFirstGlyph(text) {
  return HANGING.has(String(text ?? '')[0]);
}

/** 92 -> "92"; 1234 -> "1,234". Tabular numerals plus grouping keeps the stat row calm. */
export function num(n) {
  return Number(n ?? 0).toLocaleString('en-US');
}
