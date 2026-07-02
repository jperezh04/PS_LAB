import { uploadedUrl } from '../middlewares/uploadMiddleware.js';

export function createGameController({ gameService }) {
  return {
    home(req, res, next) {
      try { res.json(gameService.home(req.user?.id)); } catch (error) { next(error); }
    },
    list(req, res, next) {
      try { res.json(gameService.listCatalog(req.query, req.user?.id)); } catch (error) { next(error); }
    },
    suggestions(req, res, next) {
      try { res.json({ data: gameService.suggestions(req.query.search) }); } catch (error) { next(error); }
    },
    detail(req, res, next) {
      try { res.json({ data: gameService.getById(req.params.id, req.user?.id) }); } catch (error) { next(error); }
    },
    related(req, res, next) {
      try { res.json({ data: gameService.related(req.params.id, req.user?.id) }); } catch (error) { next(error); }
    },
    adminList(req, res, next) {
      try { res.json({ data: gameService.listAdmin(req.query) }); } catch (error) { next(error); }
    },
    create(req, res, next) {
      try { res.status(201).json({ message: 'Game created successfully.', data: gameService.create(req.body, uploadedUrl(req), req.user.id) }); } catch (error) { next(error); }
    },
    update(req, res, next) {
      try { res.json({ message: 'Game updated successfully.', data: gameService.update(req.params.id, req.body, uploadedUrl(req), req.user.id) }); } catch (error) { next(error); }
    },
    archive(req, res, next) {
      try { res.json({ message: 'Game archived successfully.', data: gameService.archive(req.params.id, req.user.id) }); } catch (error) { next(error); }
    }
  };
}
