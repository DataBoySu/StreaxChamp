export const Logger = {
  info: (...args: unknown[]) => {
    console.log(...(args as unknown[]));
  },
  warn: (...args: unknown[]) => {
    console.warn(...(args as unknown[]));
  },
  error: (...args: unknown[]) => {
    console.error(...(args as unknown[]));
  },
};
