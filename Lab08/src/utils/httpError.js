export class HttpError extends Error {
  constructor(status, message, errors = null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.errors = errors;
  }
}

export function badRequest(message, errors = null) {
  return new HttpError(400, message, errors);
}

export function validationError(errors) {
  return new HttpError(400, 'Validation error', errors);
}

export function unauthorized(message = 'Authentication required.') {
  return new HttpError(401, message);
}

export function forbidden(message = 'You do not have permission to perform this action.') {
  return new HttpError(403, message);
}

export function notFound(message = 'Resource not found.') {
  return new HttpError(404, message);
}

export function conflict(message = 'Conflict.') {
  return new HttpError(409, message);
}
