import { config } from './config.js';
import { createDatabase } from './db/connection.js';
import { createApp } from './http/app.js';
import { createSqliteRepository } from './repositories/sqlite.js';

const database = createDatabase();
const server = createApp({ repository: createSqliteRepository(database) });

server.on('error', (error) => {
  console.error('Unable to start the HTTP server:', error.message);
  database.close();
  process.exitCode = 1;
});

server.on('close', () => database.close());

server.listen(config.port, () => {
  const address = server.address();
  console.log(`Event ticketing server listening on port ${address.port}`);
});
