import { Router } from 'express';

export function authRoutes({ authController, authMiddleware }) {
  const router = Router();
  router.post('/register', authController.register);
  router.post('/login', authController.login);
  router.post('/logout', authMiddleware.required, authController.logout);
  router.get('/me', authMiddleware.required, authController.me);
  router.post('/forgot-password', authController.forgotPassword);
  return router;
}
