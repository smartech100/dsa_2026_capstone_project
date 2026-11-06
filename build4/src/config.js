const port = process.env.PORT === undefined ? 3000 : Number(process.env.PORT);

if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new RangeError('PORT must be an integer from 0 to 65535');
}

export const config = Object.freeze({ port });
