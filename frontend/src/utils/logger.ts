/**
 * Logging utility that respects environment settings
 * In production builds, these calls should be stripped out
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = {
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug('[Portal-Footer:DEBUG]', ...args);
    }
  },
  
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info('[Portal-Footer:INFO]', ...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn('[Portal-Footer:WARN]', ...args);
    }
  },
  
  error: (...args: any[]) => {
    if (isDevelopment) {
      console.error('[Portal-Footer:ERROR]', ...args);
    }
  },
  
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[Portal-Footer:LOG]', ...args);
    }
  }
};

// For backward compatibility, export individual functions
export const { debug, info, warn, error, log } = logger; 