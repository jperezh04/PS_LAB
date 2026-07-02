import { validationError } from '../utils/httpError.js';
import { normalizeText, toNumber, toInteger, parseIdList } from '../utils/formatters.js';

export function assertValidation(errors) {
  if (errors.length) throw validationError(errors);
}

export function requiredString(body, field, min = 1, max = 255, errors = []) {
  const value = normalizeText(body[field]);
  if (!value) {
    errors.push({ field, message: `${field} is required.` });
    return '';
  }
  if (value.length < min || value.length > max) {
    errors.push({ field, message: `${field} must be between ${min} and ${max} characters.` });
  }
  return value;
}

export function optionalString(body, field, max = 255, errors = []) {
  const value = normalizeText(body[field]);
  if (value && value.length > max) errors.push({ field, message: `${field} must not exceed ${max} characters.` });
  return value;
}

export function requiredEmail(body, field = 'email', errors = []) {
  const value = normalizeText(body[field]).toLowerCase();
  if (!value) {
    errors.push({ field, message: `${field} is required.` });
    return '';
  }
  if (value.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    errors.push({ field, message: 'Please enter a valid email address.' });
  }
  return value;
}

export function requiredPassword(body, field = 'password', errors = []) {
  const value = String(body[field] ?? '');
  if (!value) errors.push({ field, message: `${field} is required.` });
  if (value && (value.length < 8 || value.length > 100)) {
    errors.push({ field, message: 'Password must be between 8 and 100 characters.' });
  }
  return value;
}

export function requiredMoney(body, field, errors = [], { min = 0, max = 99999.99 } = {}) {
  const value = toNumber(body[field]);
  if (value === null) {
    errors.push({ field, message: `${field} must be a number.` });
    return null;
  }
  if (value < min || value > max) errors.push({ field, message: `${field} must be between ${min} and ${max}.` });
  if (!/^\d+(\.\d{1,2})?$/.test(String(body[field]))) errors.push({ field, message: `${field} must have at most 2 decimal places.` });
  return value;
}

export function requiredStock(body, field = 'stock', errors = []) {
  const value = toInteger(body[field]);
  if (value === null) {
    errors.push({ field, message: `${field} must be an integer.` });
    return null;
  }
  if (value < 0) errors.push({ field, message: `${field} cannot be negative.` });
  return value;
}

export function requiredEnum(body, field, allowed, errors = []) {
  const value = normalizeText(body[field]);
  if (!value) errors.push({ field, message: `${field} is required.` });
  else if (!allowed.includes(value)) errors.push({ field, message: `${field} must be one of: ${allowed.join(', ')}.` });
  return value;
}

export function validateGamePayload(body, { partial = false } = {}) {
  const errors = [];
  const data = {};
  const requireOrSkip = (field, fn) => {
    if (!partial || body[field] !== undefined) data[field] = fn();
  };

  requireOrSkip('title', () => requiredString(body, 'title', 2, 150, errors));
  requireOrSkip('shortDescription', () => requiredString(body, 'shortDescription', 10, 300, errors));
  requireOrSkip('description', () => requiredString(body, 'description', 10, 5000, errors));
  requireOrSkip('price', () => requiredMoney(body, 'price', errors));

  if (body.discountPrice !== undefined && body.discountPrice !== '') {
    data.discountPrice = requiredMoney(body, 'discountPrice', errors);
    const price = data.price ?? toNumber(body.price);
    if (data.discountPrice !== null && price !== null && data.discountPrice >= price) {
      errors.push({ field: 'discountPrice', message: 'discountPrice must be lower than price.' });
    }
  }

  requireOrSkip('stock', () => requiredStock(body, 'stock', errors));
  requireOrSkip('developer', () => requiredString(body, 'developer', 2, 120, errors));
  requireOrSkip('publisher', () => requiredString(body, 'publisher', 2, 120, errors));
  requireOrSkip('releaseDate', () => {
    const value = requiredString(body, 'releaseDate', 10, 10, errors);
    if (value && Number.isNaN(new Date(value).getTime())) errors.push({ field: 'releaseDate', message: 'releaseDate must be valid.' });
    return value;
  });

  if (!partial || body.esrbRating !== undefined) data.esrbRating = requiredEnum(body, 'esrbRating', ['EC', 'E', 'E10+', 'T', 'M', 'AO', 'RP'], errors);
  if (!partial || body.status !== undefined) data.status = requiredEnum(body, 'status', ['active', 'beta', 'draft', 'inactive', 'archived', 'preorder'], errors);

  if (!partial || body.genreIds !== undefined) {
    data.genreIds = parseIdList(body.genreIds, []);
    if (!data.genreIds.length) errors.push({ field: 'genreIds', message: 'At least one genre is required.' });
  }
  if (!partial || body.platformIds !== undefined) {
    data.platformIds = parseIdList(body.platformIds, []);
    if (!data.platformIds.length) errors.push({ field: 'platformIds', message: 'At least one platform is required.' });
  }

  if (body.rating !== undefined && body.rating !== '') {
    const rating = toNumber(body.rating);
    if (rating === null || rating < 0 || rating > 5) errors.push({ field: 'rating', message: 'rating must be between 0 and 5.' });
    else data.rating = rating;
  }

  if (body.commercialBadge !== undefined) data.commercialBadge = normalizeText(body.commercialBadge) || null;
  if (body.categoryId !== undefined) data.categoryId = toInteger(body.categoryId, 1);

  assertValidation(errors);
  return data;
}
