import { Router } from 'express';

export function cartRoutes({ cartController, authMiddleware }) {
  const router = Router();
  router.get('/cart', authMiddleware.required, cartController.view);
  router.post('/cart/items', authMiddleware.required, cartController.add);
  router.put('/cart/items/:itemId', authMiddleware.required, cartController.update);
  router.delete('/cart/items/:itemId', authMiddleware.required, cartController.remove);
  router.delete('/cart', authMiddleware.required, cartController.clear);
  router.post('/cart/apply-promo', authMiddleware.required, cartController.promo);
  router.post('/checkout', authMiddleware.required, cartController.checkout);
  return router;
}
