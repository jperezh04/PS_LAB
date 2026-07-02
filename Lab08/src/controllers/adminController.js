export function createAdminController({ adminService }) {
  return {
    stats(_req, res, next) {
      try { res.json({ data: adminService.stats() }); } catch (error) { next(error); }
    },
    activity(_req, res, next) {
      try { res.json({ data: adminService.activity() }); } catch (error) { next(error); }
    },
    report(_req, res, next) {
      try { res.json({ data: adminService.salesReport() }); } catch (error) { next(error); }
    },
    users(req, res, next) {
      try { res.json({ data: adminService.listUsers(req.query) }); } catch (error) { next(error); }
    },
    updateUser(req, res, next) {
      try { res.json({ message: 'User updated.', data: adminService.updateUser(req.params.id, req.body) }); } catch (error) { next(error); }
    },
    categories(_req, res, next) {
      try { res.json({ data: adminService.categories() }); } catch (error) { next(error); }
    },
    createCategory(req, res, next) {
      try { res.status(201).json({ message: 'Category created.', data: adminService.createCategory(req.body) }); } catch (error) { next(error); }
    },
    updateCategory(req, res, next) {
      try { res.json({ message: 'Category updated.', data: adminService.updateCategory(req.params.id, req.body) }); } catch (error) { next(error); }
    },
    archiveCategory(req, res, next) {
      try { res.json({ message: 'Category archived.', data: adminService.archiveCategory(req.params.id) }); } catch (error) { next(error); }
    },
    supportTickets(_req, res, next) {
      try { res.json({ data: adminService.supportTickets() }); } catch (error) { next(error); }
    }
  };
}
