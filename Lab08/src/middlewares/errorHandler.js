import { HttpError } from '../utils/httpError.js';

export function notFoundHandler(req, res) {
  if (req.path.startsWith('/api')) return res.status(404).json({ message: 'API route not found.' });
  return res.sendFile('index.html', { root: 'public' });
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof HttpError) {
    const payload = { message: error.message };
    if (error.errors) payload.errors = error.errors;
    return res.status(error.status).json(payload);
  }

  console.error(error);
  return res.status(500).json({ message: 'Internal server error.' });
}
