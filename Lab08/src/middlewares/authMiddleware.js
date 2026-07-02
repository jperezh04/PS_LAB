import { forbidden, unauthorized } from '../utils/httpError.js';

export function createAuthMiddleware({ authService, userRepository }) {
  function resolveUser(req) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return null;
    const payload = authService.verifyToken(header.slice(7));
    const user = userRepository.findById(Number(payload.sub));
    if (!user) throw unauthorized('Invalid token user.');
    if (user.status !== 'active') throw forbidden('Account disabled.');
    return user;
  }

  return {
    optional(req, _res, next) {
      try {
        req.user = resolveUser(req) || null;
        next();
      } catch (_error) {
        req.user = null;
        next();
      }
    },
    required(req, _res, next) {
      try {
        const user = resolveUser(req);
        if (!user) throw unauthorized('Authentication required.');
        req.user = user;
        next();
      } catch (error) {
        next(error);
      }
    },
    adminOnly(req, _res, next) {
      try {
        if (req.user?.role !== 'admin') throw forbidden('Admin permission required.');
        next();
      } catch (error) {
        next(error);
      }
    }
  };
}
