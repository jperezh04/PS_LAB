import { Router } from 'express';

export function adminRoutes({ adminController, authMiddleware }) {
  const router = Router();
  router.get('/admin/stats', authMiddleware.required, authMiddleware.adminOnly, adminController.stats);
  router.get('/admin/activity', authMiddleware.required, authMiddleware.adminOnly, adminController.activity);
  router.get('/admin/reports/sales', authMiddleware.required, authMiddleware.adminOnly, adminController.report);
  router.get('/admin/users', authMiddleware.required, authMiddleware.adminOnly, adminController.users);
  router.put('/admin/users/:id', authMiddleware.required, authMiddleware.adminOnly, adminController.updateUser);
  router.get('/admin/categories', authMiddleware.required, authMiddleware.adminOnly, adminController.categories);
  router.post('/admin/categories', authMiddleware.required, authMiddleware.adminOnly, adminController.createCategory);
  router.put('/admin/categories/:id', authMiddleware.required, authMiddleware.adminOnly, adminController.updateCategory);
  router.delete('/admin/categories/:id', authMiddleware.required, authMiddleware.adminOnly, adminController.archiveCategory);
  router.get('/admin/support-tickets', authMiddleware.required, authMiddleware.adminOnly, adminController.supportTickets);
  return router;
}
