import { Router } from 'express';
import { uploadAvatar } from '../middlewares/uploadMiddleware.js';

export function profileRoutes({ profileController, authMiddleware }) {
  const router = Router();
  router.get('/users/me', authMiddleware.required, profileController.me);
  router.put('/users/me', authMiddleware.required, profileController.updateMe);
  router.put('/users/me/avatar', authMiddleware.required, uploadAvatar, profileController.avatar);
  router.get('/users/me/purchases', authMiddleware.required, profileController.purchases);
  router.get('/users/me/wishlist', authMiddleware.required, profileController.wishlist);
  router.get('/users/me/reviews', authMiddleware.required, profileController.reviews);
  router.get('/users/me/transactions', authMiddleware.required, profileController.transactions);
  router.post('/users/me/delete-request', authMiddleware.required, profileController.requestDelete);
  router.post('/users/me/upgrade', authMiddleware.required, profileController.upgrade);
  router.post('/support/tickets', authMiddleware.optional, profileController.support);

  router.get('/wishlist', authMiddleware.required, profileController.wishlistList);
  router.post('/wishlist', authMiddleware.required, profileController.wishlistAdd);
  router.delete('/wishlist/:gameId', authMiddleware.required, profileController.wishlistRemove);

  router.get('/library', authMiddleware.required, profileController.library);
  router.get('/library/:gameId/download', authMiddleware.required, profileController.download);

  router.get('/purchases', authMiddleware.required, profileController.purchases);
  router.get('/purchases/:id/receipt', authMiddleware.required, (req, res) => {
    res.json({ message: 'Receipt generated.', data: { receiptId: `AETHER-${req.params.id}`, url: `/receipts/${req.params.id}.pdf` } });
  });
  return router;
}
