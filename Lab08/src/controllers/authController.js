export function createAuthController({ authService }) {
  return {
    register(req, res, next) {
      try { res.status(201).json(authService.register(req.body)); } catch (error) { next(error); }
    },
    login(req, res, next) {
      try { res.json(authService.login(req.body)); } catch (error) { next(error); }
    },
    logout(_req, res) {
      res.json({ message: 'Session closed successfully.' });
    },
    me(req, res) {
      res.json(authService.currentUser(req.user));
    },
    forgotPassword(req, res, next) {
      try { res.json(authService.forgotPassword(req.body.email)); } catch (error) { next(error); }
    }
  };
}
