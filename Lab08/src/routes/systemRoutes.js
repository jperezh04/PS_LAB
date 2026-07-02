import { Router } from 'express';

export function systemRoutes({ systemController, authMiddleware }) {
  const router = Router();
  router.get('/health', systemController.health);
  router.get('/system/status', systemController.status);
  router.get('/notifications', authMiddleware.required, systemController.notifications);
  return router;
}
