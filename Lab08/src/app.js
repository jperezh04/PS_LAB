import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import path from 'node:path';
import { env } from './config/env.js';
import { createDatabase } from './database/sqlite.js';
import { createUserRepository } from './repositories/userRepository.js';
import { createGameRepository } from './repositories/gameRepository.js';
import { createCartRepository } from './repositories/cartRepository.js';
import { createWishlistRepository } from './repositories/wishlistRepository.js';
import { createPurchaseRepository } from './repositories/purchaseRepository.js';
import { createAdminRepository } from './repositories/adminRepository.js';
import { createAuthService } from './services/authService.js';
import { createGameService } from './services/gameService.js';
import { createCartService } from './services/cartService.js';
import { createProfileService } from './services/profileService.js';
import { createWishlistService } from './services/wishlistService.js';
import { createAdminService } from './services/adminService.js';
import { createSystemService } from './services/systemService.js';
import { createAuthMiddleware } from './middlewares/authMiddleware.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { createAuthController } from './controllers/authController.js';
import { createGameController } from './controllers/gameController.js';
import { createCartController } from './controllers/cartController.js';
import { createProfileController } from './controllers/profileController.js';
import { createAdminController } from './controllers/adminController.js';
import { createSystemController } from './controllers/systemController.js';
import { authRoutes } from './routes/authRoutes.js';
import { gameRoutes } from './routes/gameRoutes.js';
import { cartRoutes } from './routes/cartRoutes.js';
import { profileRoutes } from './routes/profileRoutes.js';
import { adminRoutes } from './routes/adminRoutes.js';
import { systemRoutes } from './routes/systemRoutes.js';

export async function createApp(options = {}) {
  const app = express();
  const database = options.database || await createDatabase(options.databaseOptions);

  const userRepository = createUserRepository(database);
  const gameRepository = createGameRepository(database);
  const cartRepository = createCartRepository(database);
  const wishlistRepository = createWishlistRepository(database);
  const purchaseRepository = createPurchaseRepository(database);
  const adminRepository = createAdminRepository(database);

  const authService = createAuthService({ userRepository });
  const gameService = createGameService({ gameRepository, adminRepository });
  const cartService = createCartService({ cartRepository, gameRepository, purchaseRepository, database });
  const wishlistService = createWishlistService({ wishlistRepository, gameRepository });
  const profileService = createProfileService({ userRepository, wishlistRepository, gameRepository, purchaseRepository, adminRepository });
  const adminService = createAdminService({ userRepository, gameRepository, purchaseRepository, adminRepository });
  const systemService = createSystemService({ database });

  const authMiddleware = createAuthMiddleware({ authService, userRepository });

  const authController = createAuthController({ authService });
  const gameController = createGameController({ gameService });
  const cartController = createCartController({ cartService });
  const profileController = createProfileController({ profileService, wishlistService });
  const adminController = createAdminController({ adminService });
  const systemController = createSystemController({ systemService });

  const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: options.rateLimit ?? 500 });
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: options.authRateLimit ?? 50 });

  app.locals.database = database;
  app.locals.repositories = { userRepository, gameRepository, cartRepository, wishlistRepository, purchaseRepository, adminRepository };
  app.locals.services = { authService, gameService, cartService, wishlistService, profileService, adminService, systemService };

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  if (env.nodeEnv !== 'test') app.use(morgan('dev'));
  app.use(express.static(path.join(env.projectRoot, 'public')));
  app.use('/uploads', express.static(path.join(env.projectRoot, 'public', 'uploads')));

  app.use('/api', apiLimiter);
  app.use('/api/auth', authLimiter, authRoutes({ authController, authMiddleware }));
  app.use('/api', systemRoutes({ systemController, authMiddleware }));
  app.use('/api', gameRoutes({ gameController, authMiddleware }));
  app.use('/api', cartRoutes({ cartController, authMiddleware }));
  app.use('/api', profileRoutes({ profileController, authMiddleware }));
  app.use('/api', adminRoutes({ adminController, authMiddleware }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
