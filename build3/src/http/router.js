function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compilePath(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.includes('?') || path.includes('#')) {
    throw new TypeError('Route path must be an absolute path without a query or fragment');
  }

  const segments = path === '/' ? [] : path.slice(1).split('/');
  const names = [];
  const pattern = segments.map((segment) => {
    if (segment.startsWith(':')) {
      const name = segment.slice(1);
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name) || names.includes(name)) {
        throw new TypeError(`Invalid route parameter: ${segment}`);
      }
      names.push(name);
      return '([^/]+)';
    }
    return escapeRegExp(segment);
  });

  return {
    names,
    expression: new RegExp(`^/${pattern.join('/')}$`)
  };
}

export class Router {
  #routes = [];

  add(method, path, handler) {
    if (typeof method !== 'string' || method.trim() === '') {
      throw new TypeError('Route method must be a non-empty string');
    }
    if (typeof handler !== 'function') {
      throw new TypeError('Route handler must be a function');
    }

    const normalizedMethod = method.toUpperCase();
    const { names, expression } = compilePath(path);
    if (this.#routes.some((route) => route.method === normalizedMethod && route.path === path)) {
      throw new TypeError(`Route already registered: ${normalizedMethod} ${path}`);
    }

    this.#routes.push({ method: normalizedMethod, path, names, expression, handler });
    return this;
  }

  get(path, handler) {
    return this.add('GET', path, handler);
  }

  match(method, pathname) {
    const normalizedMethod = typeof method === 'string' ? method.toUpperCase() : '';
    for (const route of this.#routes) {
      if (route.method !== normalizedMethod) continue;

      const match = route.expression.exec(pathname);
      if (!match) continue;

      const params = {};
      route.names.forEach((name, index) => {
        params[name] = decodeURIComponent(match[index + 1]);
      });
      return { handler: route.handler, params };
    }
    return null;
  }
}
