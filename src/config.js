import 'dotenv/config';

// ─── GitHub ───
export const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
export const GITHUB_REPO = process.env.GITHUB_REPO; // "owner/repo"

// ─── ClickUp ───
export const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
export const CLICKUP_LIST_ID = process.env.CLICKUP_LIST_ID;

// ─── Gemini (IA) ───
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// ─── Scheduler ───
export const SCHEDULER_INTERVAL_MINUTES = parseInt(
  process.env.SCHEDULER_INTERVAL_MINUTES || '60',
  10
);

// ─── Logging ───
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// ─── Time do projeto ───
export const TEAM = {
  backend:  ['isaque', 'higor'],
  frontend: ['breno', 'joao', 'isaque'],
  qa:       ['mendonca'],
  docs:     ['mendonca'],
};

// ─── Validação ───
const required = {
  GITHUB_TOKEN,
  GITHUB_REPO,
  CLICKUP_API_TOKEN,
  CLICKUP_LIST_ID,
  GEMINI_API_KEY,
};

export function validateConfig() {
  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    throw new Error(
      `⚠️  Variáveis de ambiente obrigatórias não configuradas: ${missing.join(', ')}\n` +
      `   Copie .env.example para .env e preencha os valores.`
    );
  }
}
