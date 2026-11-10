/**
 * Writes production API URL from Vercel/CI env before `ng build`.
 * Set API_BASE_URL on Vercel, e.g. https://your-api.onrender.com/api/v1
 */
const fs = require('fs');
const path = require('path');

const raw = (process.env.API_BASE_URL || '').trim().replace(/\/$/, '');
const apiBaseUrl = raw || '/api/v1';

if (!raw) {
  console.warn(
    '[inject-api-url] API_BASE_URL not set — using relative "/api/v1". Set API_BASE_URL on Vercel to your live FastAPI URL.'
  );
}

const file = path.join(__dirname, '..', 'src', 'environments', 'environment.production.ts');
const contents = `export const environment = {
  production: true,
  apiBaseUrl: ${JSON.stringify(apiBaseUrl)},
};
`;

fs.writeFileSync(file, contents, 'utf8');
console.log(`[inject-api-url] Wrote ${file}`);
console.log(`[inject-api-url] apiBaseUrl = ${apiBaseUrl}`);
