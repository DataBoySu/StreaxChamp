export const Logger = {
  info: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      // keep info logs quiet in production
      console.log(...(args as unknown[]));
    }
  },
  error: (...args: unknown[]) => {
    // In production we still might want to surface errors to console or a remote sink.
    // For now, only log during development to reduce noise.
    if (process.env.NODE_ENV !== 'production') {
      console.error(...(args as unknown[]));
    }
  },
};
