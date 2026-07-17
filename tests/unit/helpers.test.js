import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatPrice, timeAgo, validateForm } from '../../src/lib/utils';

describe('formatPrice', () => {
  it('formats price with Russian locale', () => {
    expect(formatPrice(45000)).toMatch(/45[\s\u00a0]000 ₽\/мес/);
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('0 ₽/мес');
  });

  it('formats large number', () => {
    expect(formatPrice(150000)).toMatch(/150[\s\u00a0]000 ₽\/мес/);
  });

  it('handles string input', () => {
    expect(formatPrice('45000')).toMatch(/45[\s\u00a0]000 ₽\/мес/);
  });
});

describe('timeAgo', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "только что" for < 1 min', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-18T12:00:00'));
    expect(timeAgo(Date.now() - 30000)).toBe('только что');
  });

  it('returns minutes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-18T12:00:00'));
    expect(timeAgo(Date.now() - 5 * 60000)).toBe('5 мин назад');
  });

  it('returns hours', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-18T12:00:00'));
    expect(timeAgo(Date.now() - 3 * 3600000)).toBe('3 ч назад');
  });

  it('returns days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-18T12:00:00'));
    expect(timeAgo(Date.now() - 2 * 86400000)).toBe('2 дн назад');
  });

  it('returns formatted date for > 7 days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-18T12:00:00'));
    const ts = Date.now() - 10 * 86400000;
    expect(timeAgo(ts)).toMatch(/\d{2}\.\d{2}\.\d{4}/);
  });
});

describe('validateForm', () => {
  it('returns error for empty city', () => {
    const errors = validateForm({ city: '', price: '45000', area: '' });
    expect(errors.city).toBe('Укажите город');
  });

  it('returns error for zero price', () => {
    const errors = validateForm({ city: 'Москва', price: '0', area: '' });
    expect(errors.price).toBe('Укажите цену');
  });

  it('returns error for missing price', () => {
    const errors = validateForm({ city: 'Москва', price: '', area: '' });
    expect(errors.price).toBe('Укажите цену');
  });

  it('returns error for negative area', () => {
    const errors = validateForm({ city: 'Москва', price: '45000', area: '-5' });
    expect(errors.area).toBe('Площадь должна быть больше 0');
  });

  it('returns empty object for valid input', () => {
    const errors = validateForm({ city: 'Москва', price: '45000', area: '50' });
    expect(errors).toEqual({});
  });

  it('allows empty area (optional)', () => {
    const errors = validateForm({ city: 'Москва', price: '45000', area: '' });
    expect(errors).toEqual({});
  });
});
