import { uploadedUrl } from '../middlewares/uploadMiddleware.js';

export function createProfileController({ profileService, wishlistService }) {
  return {
    me(req, res, next) {
      try { res.json({ data: profileService.getMe(req.user.id) }); } catch (error) { next(error); }
    },
    updateMe(req, res, next) {
      try { res.json({ message: 'Profile updated.', data: profileService.updateMe(req.user.id, req.body) }); } catch (error) { next(error); }
    },
    avatar(req, res, next) {
      try { res.json({ message: 'Avatar updated.', data: profileService.updateAvatar(req.user.id, uploadedUrl(req)) }); } catch (error) { next(error); }
    },
    purchases(req, res, next) {
      try { res.json({ data: profileService.purchases(req.user) }); } catch (error) { next(error); }
    },
    wishlist(req, res, next) {
      try { res.json({ data: profileService.wishlist(req.user.id) }); } catch (error) { next(error); }
    },
    reviews(req, res, next) {
      try { res.json({ data: profileService.reviews(req.user.id) }); } catch (error) { next(error); }
    },
    transactions(req, res, next) {
      try { res.json({ data: profileService.purchases(req.user) }); } catch (error) { next(error); }
    },
    library(req, res, next) {
      try { res.json({ data: profileService.library(req.user.id) }); } catch (error) { next(error); }
    },
    download(req, res, next) {
      try { res.json({ message: 'Download link generated.', data: profileService.download(req.user.id, req.params.gameId) }); } catch (error) { next(error); }
    },
    requestDelete(req, res, next) {
      try { res.json(profileService.requestDelete(req.user.id)); } catch (error) { next(error); }
    },
    upgrade(req, res, next) {
      try { res.json({ message: 'Membership upgraded to Pro.', data: profileService.upgradeMembership(req.user.id) }); } catch (error) { next(error); }
    },
    support(req, res, next) {
      try { res.status(201).json({ message: 'Support ticket created.', data: profileService.createSupportTicket(req.user, req.body) }); } catch (error) { next(error); }
    },
    wishlistList(req, res, next) {
      try { res.json({ data: wishlistService.list(req.user.id) }); } catch (error) { next(error); }
    },
    wishlistAdd(req, res, next) {
      try { res.status(201).json({ message: 'Game added to wishlist.', data: wishlistService.add(req.user.id, req.body) }); } catch (error) { next(error); }
    },
    wishlistRemove(req, res, next) {
      try { res.json(wishlistService.remove(req.user.id, req.params.gameId)); } catch (error) { next(error); }
    }
  };
}
