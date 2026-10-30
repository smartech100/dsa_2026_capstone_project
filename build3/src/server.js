import { config } from './config.js';
import { createApp } from './http/app.js';

const server = createApp();

server.on('error', (error) => {
  console.error('Unable to start the HTTP server:', error.message);
  process.exitCode = 1;
});

server.listen(config.port, () => {
  const address = server.address();
  console.log(`Event ticketing server listening on port ${address.port}`);
});
