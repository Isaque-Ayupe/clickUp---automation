import { LOG_LEVEL } from '../config.js';

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LEVELS[LOG_LEVEL] ?? LEVELS.info;

function timestamp() {
  return new Date().toISOString();
}

function formatArgs(args) {
  return args
    .map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : a))
    .join(' ');
}

const logger = {
  debug(...args) {
    if (currentLevel <= LEVELS.debug) {
      console.log(`[${timestamp()}] 🔍 DEBUG  ${formatArgs(args)}`);
    }
  },

  info(...args) {
    if (currentLevel <= LEVELS.info) {
      console.log(`[${timestamp()}] ℹ️  INFO   ${formatArgs(args)}`);
    }
  },

  warn(...args) {
    if (currentLevel <= LEVELS.warn) {
      console.warn(`[${timestamp()}] ⚠️  WARN   ${formatArgs(args)}`);
    }
  },

  error(...args) {
    if (currentLevel <= LEVELS.error) {
      console.error(`[${timestamp()}] ❌ ERROR  ${formatArgs(args)}`);
    }
  },

  success(...args) {
    console.log(`[${timestamp()}] ✅ OK     ${formatArgs(args)}`);
  },
};

export default logger;
