'use strict';

const REQUIRED_ENV = ['DATABASE_URL', 'APP_AUTH_USER', 'APP_AUTH_PASSWORD'];

function validateEnvironment(env = process.env) {
  const missing = REQUIRED_ENV.filter((name) =>
    typeof env[name] !== 'string' || env[name].trim() === '',
  );
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  return {
    databaseUrl: env.DATABASE_URL,
    authUser: env.APP_AUTH_USER,
    authPassword: env.APP_AUTH_PASSWORD,
  };
}

module.exports = { REQUIRED_ENV, validateEnvironment };
