import { notFound, validationError } from '../utils/httpError.js';
export function createAdminService({ userRepository, gameRepository, purchaseRepository, adminRepository }) {
  return {
    stats() {
      return {
        totalUsers: userRepository.count(),
        totalSales: Number(purchaseRepository.totalSales().toFixed(2)),
        activeGames: gameRepository.countActive(),
        lowStockGames: gameRepository.countLowStock()
      };
    },
    activity() {
      return adminRepository.listActivity();
    },
    salesReport() {
      return purchaseRepository.listAll();
    },
    listUsers(query) {
      return userRepository.list(query);
    },
    updateUser(id, body) {
      const current = userRepository.findPublicById(Number(id));
      if (!current) throw notFound('User not found.');
      return userRepository.updateAdmin(Number(id), {
        displayName: body.displayName || current.displayName,
        role: body.role || current.role,
        status: body.status || current.status
      });
    },
    categories() {
      return gameRepository.categories();
    },
    createCategory(body) {
      if (!body.name || body.name.trim().length < 2) throw validationError([{ field: 'name', message: 'Category name is required.' }]);
      const category = gameRepository.createCategory({ name: body.name.trim(), description: body.description || '', status: body.status || 'active' });
      adminRepository.log(null, 'Created category', 'category', category.id, { name: category.name });
      return category;
    },
    updateCategory(id, body) {
      const category = gameRepository.updateCategory(Number(id), { name: body.name, description: body.description, status: body.status });
      adminRepository.log(null, 'Updated category', 'category', category?.id, body);
      return category;
    },
    archiveCategory(id) {
      const category = gameRepository.archiveCategory(Number(id));
      adminRepository.log(null, 'Archived category', 'category', category?.id, {});
      return category;
    },
    supportTickets() {
      return adminRepository.listSupportTickets();
    }
  };
}
