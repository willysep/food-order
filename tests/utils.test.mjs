import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, isValidPin, formatRupiah, todayISO, formatDate } from '../js/utils.js';

test('normalizePhone formats standard Indonesian numbers correctly', () => {
  assert.equal(normalizePhone('08123456789'), '628123456789');
  assert.equal(normalizePhone('0812-3456-7890'), '6281234567890');
  assert.equal(normalizePhone('+628123456789'), '628123456789');
  assert.equal(normalizePhone('628123456789'), '628123456789');
  assert.equal(normalizePhone(' 0812 3456 7899 '), '6281234567899');
});

test('normalizePhone rejects invalid numbers', () => {
  assert.equal(normalizePhone('021123456'), null); // landline
  assert.equal(normalizePhone('08123'), null); // too short
  assert.equal(normalizePhone('abcdefghijk'), null);
  assert.equal(normalizePhone(''), null);
  assert.equal(normalizePhone(null), null);
});

test('isValidPin checks 6 numeric digits', () => {
  assert.equal(isValidPin('123456'), true);
  assert.equal(isValidPin('000000'), true);
  assert.equal(isValidPin('12345'), false);
  assert.equal(isValidPin('1234567'), false);
  assert.equal(isValidPin('12345a'), false);
  assert.equal(isValidPin(123456), false);
});

test('formatRupiah formats currency correctly', () => {
  assert.equal(formatRupiah(25000), 'Rp 25.000');
  assert.equal(formatRupiah(0), 'Rp 0');
  assert.equal(formatRupiah(1500000), 'Rp 1.500.000');
  assert.equal(formatRupiah(NaN), 'Rp 0');
});

test('todayISO returns YYYY-MM-DD pattern', () => {
  const today = todayISO();
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
});

test('formatDate produces readable string', () => {
  const res = formatDate('2026-10-30', false);
  assert.match(res, /30/);
});
