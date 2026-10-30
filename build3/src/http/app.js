import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DomainError } from '../domain/errors.js';
import { Router } from './router.js';

const DEFAULT_PUBLIC_DIR = fileURLToPath(new URL('../../public/', import.meta.url));
const CONTENT_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8']
]);

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff'
  });
  response.end(JSON.stringify(value));
}

function errorResponse(error) {
  if (error instanceof HttpError) {
    return {
      status: error.status,
      body: { error: { code: error.code, message: error.message } }
    };
  }

  if (error instanceof URIError) {
    return {
      status: 400,
      body: { error: { code: 'BAD_REQUEST', message: 'Request path is not valid' } }
    };
  }

  if (error instanceof DomainError) {
    const status = error.code === 'NOT_FOUND' ? 404 : 400;
    return {
      status,
      body: { error: { code: error.code, message: error.message } }
    };
  }

  return {
    status: 500,
    body: { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } }
  };
}

async function parseJsonBody(request) {
  const contentType = request.headers['content-type']?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') return;

  let text = '';
  for await (const chunk of request) {
    text += chunk;
  }
  try {
    request.body = JSON.parse(text);
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'Request body must contain valid JSON');
  }
}

function isWithinDirectory(directory, target) {
  const pathFromRoot = relative(directory, target);
  return pathFromRoot === ''
    || (pathFromRoot !== '..' && !pathFromRoot.startsWith(`..${sep}`) && !isAbsolute(pathFromRoot));
}

async function serveStatic(response, publicDir, pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    throw new HttpError(400, 'BAD_REQUEST', 'Request path is not valid');
  }
  if (decodedPath.includes('\0')) {
    throw new HttpError(400, 'BAD_REQUEST', 'Request path is not valid');
  }

  const root = await realpath(publicDir);
  const filePath = decodedPath === '/' ? '/index.html' : decodedPath;
  const target = resolve(root, `.${filePath}`);
  if (!isWithinDirectory(root, target)) {
    throw new HttpError(404, 'NOT_FOUND', 'File not found');
  }

  let resolvedTarget;
  try {
    resolvedTarget = await realpath(target);
    if (!isWithinDirectory(root, resolvedTarget) || !(await stat(resolvedTarget)).isFile()) {
      throw new HttpError(404, 'NOT_FOUND', 'File not found');
    }
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      throw new HttpError(404, 'NOT_FOUND', 'File not found');
    }
    throw error;
  }

  const contents = await readFile(resolvedTarget);
  response.writeHead(200, {
    'content-type': CONTENT_TYPES.get(extname(resolvedTarget).toLowerCase()) ?? 'application/octet-stream',
    'x-content-type-options': 'nosniff'
  });
  response.end(contents);
}

export function createApp({ router = new Router(), publicDir = DEFAULT_PUBLIC_DIR } = {}) {
  if (!router.match('GET', '/health')) {
    router.get('/health', (_request, response) => {
      sendJson(response, 200, { status: 'ok' });
    });
  }

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      await parseJsonBody(request);

      const route = router.match(request.method, url.pathname);
      if (route) {
        await route.handler(request, response, route.params);
        return;
      }

      if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
        throw new HttpError(404, 'NOT_FOUND', 'Route not found');
      }

      if (request.method === 'GET') {
        await serveStatic(response, publicDir, url.pathname);
        return;
      }

      throw new HttpError(404, 'NOT_FOUND', 'Route not found');
    } catch (error) {
      if (response.headersSent) {
        response.destroy();
        return;
      }
      const result = errorResponse(error);
      sendJson(response, result.status, result.body);
    }
  });
}
