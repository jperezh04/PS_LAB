import { pathToFileURL } from 'node:url';
import { createApp } from './src/app.js';
import { env } from './src/config/env.js';

const app = await createApp();

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  app.listen(env.port, () => {
    console.log(`Aether Gaming running at http://localhost:${env.port}`);
    console.log(`SQLite DB: ${env.databaseFile}`);
  });
}

export default app;
export { app };
