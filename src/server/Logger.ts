/**
 * Enhanced Logger with color-coded categories and timestamps
 */

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

type LogCategory = 'API' | 'DATABASE' | 'AI' | 'CACHE' | 'AUTH' | 'SYSTEM';

const categoryColors: Record<LogCategory, string> = {
  API: colors.blue,
  DATABASE: colors.magenta,
  AI: colors.cyan,
  CACHE: colors.green,
  AUTH: colors.yellow,
  SYSTEM: colors.white,
};

function timestamp(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

function formatLog(category: LogCategory, message: string, data?: unknown): string {
  const color = categoryColors[category];
  const ts = `${colors.dim}${timestamp()}${colors.reset}`;
  const cat = `${color}[${category}]${colors.reset}`;
  const dataStr = data ? ` ${colors.dim}${JSON.stringify(data)}${colors.reset}` : '';
  return `${ts} ${cat} ${message}${dataStr}`;
}

export const Logger = {
  info: (message: string, data?: unknown, category: LogCategory = 'SYSTEM') => {
    console.log(formatLog(category, message, data));
  },

  warn: (message: string, data?: unknown, category: LogCategory = 'SYSTEM') => {
    const color = colors.yellow;
    console.warn(`${color}${formatLog(category, `⚠ ${message}`, data)}${colors.reset}`);
  },

  error: (message: string, error?: unknown, category: LogCategory = 'SYSTEM') => {
    const color = colors.red;
    const errorData = error instanceof Error
      ? { message: error.message, stack: error.stack?.split('\n').slice(0, 3).join('\n') }
      : error;
    console.error(`${color}${formatLog(category, `✗ ${message}`, errorData)}${colors.reset}`);
  },

  api: (message: string, data?: unknown) => {
    Logger.info(message, data, 'API');
  },

  db: (message: string, data?: unknown) => {
    Logger.info(message, data, 'DATABASE');
  },

  ai: (message: string, data?: unknown) => {
    Logger.info(message, data, 'AI');
  },

  cache: (message: string, data?: unknown) => {
    Logger.info(message, data, 'CACHE');
  },
};
