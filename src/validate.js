/**
 * Input Validation and Sanitization Module
 * Implements strict server-side validation against injection, type confusion, and malicious input.
 */

import {
  EVENT_TYPES,
  VENUE_TYPES,
  DIET_TYPES,
  INPUT_LIMITS
} from './constants.js';

/**
 * Strips ASCII and Unicode control characters while retaining printable text, newlines, and spaces.
 * @param {string} input - Raw string input.
 * @returns {string} Sanitized string.
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') {
    return '';
  }
  // Remove control characters (C0 & C1 controls and DEL), allow standard tabs/newlines and normal characters
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .trim();
}

/**
 * Checks if a date string is in strict ISO YYYY-MM-DD format and is a valid calendar date.
 * @param {string} dateStr - Date string.
 * @returns {boolean} True if strictly valid.
 */
export function isValidDateFormat(dateStr) {
  if (typeof dateStr !== 'string') return false;
  const isoDateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  if (!isoDateRegex.test(dateStr)) return false;

  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  return (
    dateObj.getFullYear() === year &&
    dateObj.getMonth() === month - 1 &&
    dateObj.getDate() === day
  );
}

/**
 * Validates whether an event date is today or in the future.
 * @param {string} dateStr - Valid ISO date string (YYYY-MM-DD).
 * @param {Date} [referenceDate] - Optional reference date for testing, defaults to current moment.
 * @returns {boolean} True if date is not in the past.
 */
export function isFutureOrToday(dateStr, referenceDate = new Date()) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);

  const startOfReference = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );

  return targetDate.getTime() >= startOfReference.getTime();
}

/**
 * Validates the complete planning form payload.
 *
 * @param {unknown} payload - Unparsed or untrusted user input.
 * @param {Date} [referenceDate] - Optional reference date for deterministic testing.
 * @returns {{ valid: boolean, errors: string[], sanitized: Object|null }}
 */
export function validatePlanningInput(payload, referenceDate = new Date()) {
  const errors = [];

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      valid: false,
      errors: ['Invalid payload: Request body must be a JSON object.'],
      sanitized: null
    };
  }

  const {
    eventType,
    guestCount,
    totalBudget,
    eventDate,
    city,
    venueType,
    diet,
    preferences
  } = payload;

  // 1. Event Type Validation
  const validEventTypes = Object.values(EVENT_TYPES);
  if (!validEventTypes.includes(eventType)) {
    errors.push(
      `Invalid eventType: Must be one of [${validEventTypes.join(', ')}].`
    );
  }

  // 2. Guest Count Validation
  const guestsNum = Number(guestCount);
  if (
    !Number.isInteger(guestsNum) ||
    guestsNum < INPUT_LIMITS.MIN_GUEST_COUNT ||
    guestsNum > INPUT_LIMITS.MAX_GUEST_COUNT
  ) {
    errors.push(
      `Invalid guestCount: Must be an integer between ${INPUT_LIMITS.MIN_GUEST_COUNT} and ${INPUT_LIMITS.MAX_GUEST_COUNT}.`
    );
  }

  // 3. Total Budget Validation
  const budgetNum = Number(totalBudget);
  if (
    typeof totalBudget === 'boolean' ||
    Number.isNaN(budgetNum) ||
    !Number.isFinite(budgetNum) ||
    budgetNum < INPUT_LIMITS.MIN_BUDGET_INR ||
    budgetNum > INPUT_LIMITS.MAX_BUDGET_INR
  ) {
    errors.push(
      `Invalid totalBudget: Must be a number between ₹${INPUT_LIMITS.MIN_BUDGET_INR.toLocaleString('en-IN')} and ₹${INPUT_LIMITS.MAX_BUDGET_INR.toLocaleString('en-IN')}.`
    );
  }

  // 4. Event Date Validation
  if (!isValidDateFormat(eventDate)) {
    errors.push('Invalid eventDate: Must be a valid date in YYYY-MM-DD format.');
  } else if (!isFutureOrToday(eventDate, referenceDate)) {
    errors.push('Invalid eventDate: Event date cannot be in the past.');
  }

  // 5. City Validation
  const sanitizedCity = sanitizeString(city);
  if (sanitizedCity.length < 2 || sanitizedCity.length > INPUT_LIMITS.MAX_CITY_LENGTH) {
    errors.push(
      `Invalid city: Must be between 2 and ${INPUT_LIMITS.MAX_CITY_LENGTH} characters.`
    );
  }

  // 6. Venue Type Validation
  const validVenues = Object.values(VENUE_TYPES);
  if (!validVenues.includes(venueType)) {
    errors.push(
      `Invalid venueType: Must be one of [${validVenues.join(', ')}].`
    );
  }

  // 7. Diet Validation
  const validDiets = Object.values(DIET_TYPES);
  if (!validDiets.includes(diet)) {
    errors.push(
      `Invalid diet: Must be one of [${validDiets.join(', ')}].`
    );
  }

  // 8. Preferences Validation
  const sanitizedPreferences = sanitizeString(preferences || '');
  if (sanitizedPreferences.length > INPUT_LIMITS.MAX_PREFERENCES_LENGTH) {
    errors.push(
      `Invalid preferences: Cannot exceed ${INPUT_LIMITS.MAX_PREFERENCES_LENGTH} characters.`
    );
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      sanitized: null
    };
  }

  return {
    valid: true,
    errors: [],
    sanitized: {
      eventType,
      guestCount: guestsNum,
      totalBudget: Math.round(budgetNum),
      eventDate,
      city: sanitizedCity,
      venueType,
      diet,
      preferences: sanitizedPreferences
    }
  };
}
