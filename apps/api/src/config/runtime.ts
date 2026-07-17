const DEFAULT_API_PORT = 3000;
const DEFAULT_WEB_ORIGIN = 'http://localhost:5173';

type RuntimeEnvironment = {
  PORT?: string;
  WEB_ORIGIN?: string;
};

function parsePort(value: string | undefined) {
  const port = Number(value?.trim() || DEFAULT_API_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  return port;
}

function parseWebOrigin(value: string | undefined) {
  let url: URL;
  try {
    url = new URL(value?.trim() || DEFAULT_WEB_ORIGIN);
  } catch {
    throw new Error('WEB_ORIGIN must be an absolute http(s) origin.');
  }

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error('WEB_ORIGIN must contain only an http(s) scheme and host.');
  }

  return url.origin;
}

export function resolveApiRuntimeConfig(env: RuntimeEnvironment = process.env) {
  return {
    port: parsePort(env.PORT),
    webOrigin: parseWebOrigin(env.WEB_ORIGIN),
  };
}
