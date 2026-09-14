import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cnNum, cnify, chopGlyph, agoText } from '../app/ui.mjs';

// The 今日 page is typeset like a book page: folio, intervals and dates in Chinese numerals.
test('cnNum covers every number the page can show', () => {
  assert.equal(cnNum(0), '零');
  assert.equal(cnNum(1), '一');
  assert.equal(cnNum(5), '五');
  assert.equal(cnNum(10), '十');
  assert.equal(cnNum(11), '十一');
  assert.equal(cnNum(16), '十六');
  assert.equal(cnNum(20), '二十');
  assert.equal(cnNum(35), '三十五');
  assert.equal(cnNum(75), '七十五');
  assert.equal(cnNum(100), '一百');
  assert.equal(cnNum(105), '一百零五');
  assert.equal(cnNum(110), '一百一十');
  assert.equal(cnNum(160), '一百六十');
  assert.equal(cnNum(340), '三百四十');
  assert.equal(cnNum(999), '九百九十九');
});

test('cnNum falls back to digits outside its range', () => {
  assert.equal(cnNum(1000), '1000');
  assert.equal(cnNum(-1), '-1');
});

test('cnify rewrites agoText for the page without touching agoText itself', () => {
  const D = 86400;
  const now = 1789000000;
  assert.equal(cnify(agoText(now - 5 * D, now)), '五天前');
  assert.equal(cnify('3 年 10 个月前'), '三年十个月前');
  assert.equal(cnify('2 年前的今天'), '二年前的今天');
  assert.equal(cnify('今天'), '今天');
  assert.equal(cnify(''), '');
  // the catalogue views keep digits, so the underlying helper must be untouched
  assert.equal(agoText(now - 5 * D, now), '5 天前');
});

test('chopGlyph takes the first CJK character and never the punctuation around it', () => {
  assert.equal(chopGlyph('野草'), '野');
  assert.equal(chopGlyph('《我的名字叫红（珍藏版）》'), '我');
  assert.equal(chopGlyph('1984'), '书');
  assert.equal(chopGlyph('Thinking, Fast and Slow'), '书');
  assert.equal(chopGlyph(''), '书');
  assert.equal(chopGlyph(null), '书');
});
