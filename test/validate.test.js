import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePlanningInput,
  sanitizeString,
  isValidDateFormat,
  isFutureOrToday
} from '../src/validate.js';

describe('Validation Module - sanitizeString', () => {
  it('strips ASCII control characters and retains valid text', () => {
    const raw = 'Royal\x00 Wedding\x07 with\x1B bells\nand sweets!';
    const cleaned = sanitizeString(raw);
    assert.equal(cleaned, 'Royal Wedding with bells\nand sweets!');
  });

  it('handles empty or non-string input safely', () => {
    assert.equal(sanitizeString(null), '');
    assert.equal(sanitizeString(undefined), '');
    assert.equal(sanitizeString(12345), '');
  });
});

describe('Validation Module - isValidDateFormat', () => {
  it('accepts valid YYYY-MM-DD dates', () => {
    assert.equal(isValidDateFormat('2026-12-25'), true);
    assert.equal(isValidDateFormat('2027-01-01'), true);
  });

  it('rejects invalid date formats', () => {
    assert.equal(isValidDateFormat('25-12-2026'), false);
    assert.equal(isValidDateFormat('2026/12/25'), false);
    assert.equal(isValidDateFormat('invalid-date'), false);
    assert.equal(isValidDateFormat(''), false);
    assert.equal(isValidDateFormat(null), false);
    // Non-existent calendar date
    assert.equal(isValidDateFormat('2026-02-30'), false);
  });
});

describe('Validation Module - isFutureOrToday', () => {
  const refDate = new Date(2026, 9, 23); // Oct 23, 2026

  it('accepts today or future dates', () => {
    assert.equal(isFutureOrToday('2026-10-23', refDate), true);
    assert.equal(isFutureOrToday('2026-10-24', refDate), true);
    assert.equal(isFutureOrToday('2027-01-01', refDate), true);
  });

  it('rejects past dates', () => {
    assert.equal(isFutureOrToday('2026-10-22', refDate), false);
    assert.equal(isFutureOrToday('2025-05-15', refDate), false);
  });
});

describe('Validation Module - validatePlanningInput', () => {
  const refDate = new Date(2026, 9, 23);

  const validPayload = {
    eventType: 'wedding',
    guestCount: 200,
    totalBudget: 1500000,
    eventDate: '2026-12-15',
    city: 'Jaipur',
    venueType: 'outdoor',
    diet: 'mixed',
    preferences: 'Grand Rajasthani royal setup with fireworks'
  };

  it('accepts a fully valid payload', () => {
    const res = validatePlanningInput(validPayload, refDate);
    assert.equal(res.valid, true);
    assert.equal(res.errors.length, 0);
    assert.equal(res.sanitized.totalBudget, 1500000);
    assert.equal(res.sanitized.city, 'Jaipur');
  });

  it('rejects past dates', () => {
    const badPayload = { ...validPayload, eventDate: '2025-01-01' };
    const res = validatePlanningInput(badPayload, refDate);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('past')));
  });

  it('rejects negative or absurdly low budgets', () => {
    const badPayload = { ...validPayload, totalBudget: -5000 };
    const res = validatePlanningInput(badPayload, refDate);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('totalBudget')));
  });

  it('rejects non-integer or excessive guest counts', () => {
    const floatGuests = { ...validPayload, guestCount: 150.5 };
    assert.equal(validatePlanningInput(floatGuests, refDate).valid, false);

    const hugeGuests = { ...validPayload, guestCount: 25000 };
    const res = validatePlanningInput(hugeGuests, refDate);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('guestCount')));

    const tinyGuests = { ...validPayload, guestCount: 2 };
    assert.equal(validatePlanningInput(tinyGuests, refDate).valid, false);
  });

  it('rejects invalid enum values', () => {
    const badEventType = { ...validPayload, eventType: 'carnival' };
    assert.equal(validatePlanningInput(badEventType, refDate).valid, false);

    const badVenue = { ...validPayload, venueType: 'underwater' };
    assert.equal(validatePlanningInput(badVenue, refDate).valid, false);

    const badDiet = { ...validPayload, diet: 'carnivore' };
    assert.equal(validatePlanningInput(badDiet, refDate).valid, false);
  });

  it('rejects missing or empty city', () => {
    const emptyCity = { ...validPayload, city: '' };
    assert.equal(validatePlanningInput(emptyCity, refDate).valid, false);

    const oneCharCity = { ...validPayload, city: 'A' };
    assert.equal(validatePlanningInput(oneCharCity, refDate).valid, false);
  });

  it('sanitizes XSS strings and strips control characters', () => {
    const xssPayload = {
      ...validPayload,
      preferences: '<script>alert("pwned")</script>\x00\x08Live Dhol',
      city: 'Delhi\x07'
    };
    const res = validatePlanningInput(xssPayload, refDate);
    assert.equal(res.valid, true);
    // Control chars stripped
    assert.equal(res.sanitized.city, 'Delhi');
    assert.ok(!res.sanitized.preferences.includes('\x00'));
    assert.ok(!res.sanitized.preferences.includes('\x08'));
  });

  it('rejects non-object or null payloads', () => {
    assert.equal(validatePlanningInput(null, refDate).valid, false);
    assert.equal(validatePlanningInput(undefined, refDate).valid, false);
    assert.equal(validatePlanningInput('string', refDate).valid, false);
    assert.equal(validatePlanningInput([1, 2, 3], refDate).valid, false);
  });
});
