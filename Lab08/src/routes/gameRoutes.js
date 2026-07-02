import { Router } from 'express';
import { uploadCover } from '../middlewares/uploadMiddleware.js';

export function gameRoutes({ gameController, authMiddleware }) {
  const router = Router();
  router.get('/home', authMiddleware.optional, gameController.home);
  router.get('/games', authMiddleware.optional, gameController.list);
  router.get('/games/search/suggestions', gameController.suggestions);
  router.get('/games/:id', authMiddleware.optional, gameController.detail);
  router.get('/games/:id/related', authMiddleware.optional, gameController.related);

  router.get('/admin/games', authMiddleware.required, authMiddleware.adminOnly, gameController.adminList);
  router.post('/admin/games', authMiddleware.required, authMiddleware.adminOnly, uploadCover, gameController.create);
  router.put('/admin/games/:id', authMiddleware.required, authMiddleware.adminOnly, uploadCover, gameController.update);
  router.delete('/admin/games/:id', authMiddleware.required, authMiddleware.adminOnly, gameController.archive);
  return router;
}
