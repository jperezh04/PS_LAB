export function createSystemController({ systemService }) {
  return {
    health(_req, res) {
      res.json({ status: 'ok', app: 'Aether Gaming Flow DB' });
    },
    status(_req, res, next) {
      try { res.json(systemService.status()); } catch (error) { next(error); }
    },
    notifications(req, res, next) {
      try { res.json({ data: systemService.notifications(req.user.id) }); } catch (error) { next(error); }
    }
  };
}
