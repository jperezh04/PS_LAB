import { conflict, notFound, validationError } from '../utils/httpError.js';
import { toInteger } from '../utils/formatters.js';

export function createWishlistService({ wishlistRepository, gameRepository }) {
  return {
    list(userId) {
      return wishlistRepository.list(userId).map(item => gameRepository.findById(item.gameId, userId)).filter(Boolean);
    },
    add(userId, body) {
      const gameId = toInteger(body.gameId);
      if (!gameId) throw validationError([{ field: 'gameId', message: 'gameId is required.' }]);
      const game = gameRepository.findById(gameId, userId);
      if (!game) throw notFound('Game not found.');
      if (wishlistRepository.exists(userId, gameId)) throw conflict('Game already exists in wishlist.');
      wishlistRepository.add(userId, gameId);
      return gameRepository.findById(gameId, userId);
    },
    remove(userId, gameId) {
      const changes = wishlistRepository.remove(userId, Number(gameId));
      if (!changes) throw notFound('Wishlist item not found.');
      return { message: 'Game removed from wishlist.' };
    }
  };
}
