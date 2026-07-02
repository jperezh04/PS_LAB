import { conflict, forbidden, notFound, validationError } from '../utils/httpError.js';
import { requiredEmail, requiredString, optionalString, assertValidation } from '../validators/commonValidators.js';

export function createProfileService({ userRepository, wishlistRepository, gameRepository, purchaseRepository, adminRepository }) {
  return {
    getMe(userId) {
      const user = userRepository.findPublicById(userId);
      if (!user) throw notFound('User not found.');
      return user;
    },
    updateMe(userId, body) {
      const errors = [];
      const displayName = requiredString(body, 'displayName', 2, 80, errors);
      const email = requiredEmail(body, 'email', errors);
      const bio = optionalString(body, 'bio', 300, errors);
      assertValidation(errors);
      const existing = userRepository.findByEmail(email);
      if (existing && existing.id !== userId) throw conflict('Email already exists.');
      return userRepository.updateMe(userId, { displayName, email, bio });
    },
    updateAvatar(userId, avatarUrl) {
      if (!avatarUrl) throw validationError([{ field: 'avatar', message: 'Avatar file is required.' }]);
      return userRepository.updateAvatar(userId, avatarUrl);
    },
    upgradeMembership(userId) {
      return userRepository.updateMembership(userId, 'pro');
    },
    wishlist(userId) {
      return wishlistRepository.list(userId).map(item => gameRepository.findById(item.gameId, userId)).filter(Boolean);
    },
    purchases(user) {
      return user.role === 'admin' ? purchaseRepository.listAll() : purchaseRepository.listByUser(user.id);
    },
    reviews(userId) {
      return gameRepository.dbReviews ? gameRepository.dbReviews(userId) : [];
    },
    library(userId) {
      return purchaseRepository.library(userId).map(item => ({ ...item, game: gameRepository.findById(item.gameId, userId) })).filter(item => item.game);
    },
    download(userId, gameId) {
      const item = purchaseRepository.hasLibraryItem(userId, Number(gameId));
      if (!item) throw forbidden('You do not own this game.');
      return { url: item.downloadUrl };
    },
    requestDelete(userId) {
      userRepository.markPendingDeletion(userId);
      return { message: 'Deletion request registered.' };
    },
    createSupportTicket(user, body) {
      const errors = [];
      const name = requiredString(body, 'name', 2, 80, errors);
      const email = requiredEmail(body, 'email', errors);
      const topic = requiredString(body, 'topic', 3, 80, errors);
      const message = requiredString(body, 'message', 10, 1000, errors);
      assertValidation(errors);
      return adminRepository.createSupportTicket({ userId: user?.id || null, name, email, topic, message });
    }
  };
}
