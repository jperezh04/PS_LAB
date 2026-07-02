import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  projectRoot,
  databaseFile: process.env.DB_FILE || path.join(projectRoot, 'database', 'aether.sqlite'),
  uploadDir: process.env.UPLOAD_DIR || path.join(projectRoot, 'public', 'uploads', 'covers')
};
