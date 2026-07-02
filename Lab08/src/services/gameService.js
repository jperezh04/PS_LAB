import { conflict, notFound, validationError } from '../utils/httpError.js';
import { toInteger, toNumber } from '../utils/formatters.js';
import { validateGamePayload } from '../validators/commonValidators.js';

export function createGameService({ gameRepository, adminRepository }) {
  return {
    home(userId = null) {
      const result = gameRepository.listCatalog({ page: 1, limit: 4, userId });
      return {
        hero: result.data[0] || null,
        featured: result.data,
        stats: {
          activeGames: gameRepository.countActive(),
          playersOnline: 12480,
          deals: result.data.filter(item => item.discountPrice).length
        }
      };
    },
    listCatalog(query, userId = null) {
      const page = Math.max(toInteger(query.page, 1), 1);
      const limit = Math.min(Math.max(toInteger(query.limit, 12), 1), 100);
      const maxPrice = query.maxPrice === undefined || query.maxPrice === '' ? '' : toNumber(query.maxPrice);
      if (query.maxPrice !== undefined && query.maxPrice !== '' && maxPrice === null) {
        throw validationError([{ field: 'maxPrice', message: 'maxPrice must be numeric.' }]);
      }
      const result = gameRepository.listCatalog({
        search: String(query.search || '').trim().slice(0, 100),
        genre: query.genre || '',
        platform: query.platform || '',
        maxPrice,
        sort: query.sort || 'relevance',
        page,
        limit,
        userId
      });
      return { ...result, filters: { genres: gameRepository.genres(), platforms: gameRepository.platforms() } };
    },
    listAdmin(query) {
      const result = gameRepository.listCatalog({ search: String(query.search || '').trim(), page: 1, limit: 100, includeDrafts: true });
      return result.data;
    },
    getById(id, userId = null) {
      const game = gameRepository.findById(Number(id), userId);
      if (!game) throw notFound('Game not found.');
      return game;
    },
    related(id, userId = null) {
      const data = gameRepository.related(Number(id), userId);
      if (data === null) throw notFound('Game not found.');
      return data;
    },
    suggestions(search = '') {
      return gameRepository.suggestions(String(search).trim().slice(0, 100));
    },
    create(body, coverImageUrl, adminId) {
      const data = validateGamePayload({ ...body, coverImageUrl }, { partial: false });
      if (!coverImageUrl) throw validationError([{ field: 'coverImage', message: 'Cover image is required.' }]);
      if (gameRepository.existsByTitle(data.title)) throw conflict('A game with this title already exists.');
      const game = gameRepository.create({ ...data, coverImageUrl });
      adminRepository.log(adminId, 'Created game', 'game', game.id, { title: game.title });
      return game;
    },
    update(id, body, coverImageUrl, adminId) {
      const current = gameRepository.findById(Number(id));
      if (!current) throw notFound('Game not found.');
      const data = validateGamePayload(body, { partial: true });
      if (data.title && gameRepository.existsByTitle(data.title, Number(id))) throw conflict('A game with this title already exists.');
      if (coverImageUrl) data.coverImageUrl = coverImageUrl;
      const game = gameRepository.update(Number(id), data);
      adminRepository.log(adminId, 'Updated game', 'game', game.id, { title: game.title });
      return game;
    },
    archive(id, adminId) {
      const current = gameRepository.findById(Number(id));
      if (!current) throw notFound('Game not found.');
      const game = gameRepository.archive(Number(id));
      adminRepository.log(adminId, 'Archived game', 'game', game.id, { title: game.title });
      return game;
    }
  };
}
