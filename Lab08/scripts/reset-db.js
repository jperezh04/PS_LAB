import fs from 'node:fs';
import { env } from '../src/config/env.js';
import { createDatabase } from '../src/database/sqlite.js';

if (fs.existsSync(env.databaseFile)) fs.unlinkSync(env.databaseFile);
await createDatabase({ filePath: env.databaseFile, reset: true, seed: true });
console.log(`Database reset: ${env.databaseFile}`);
