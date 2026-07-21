/**
 * A content script shares its console with the host page. Anything we print
 * lands in the middle of leboncoin's own logs, so it is namespaced, and it is
 * silent in production unless something is actually wrong.
 */
export interface Logger {
  /** Per-pass detail. Development builds only. */
  debug(message: string, ...details: unknown[]): void;
  /** Something the user could act on, or that suggests the site changed. */
  warn(message: string, ...details: unknown[]): void;
  /** The extension failed to do its job. */
  error(message: string, ...details: unknown[]): void;
}

export interface LoggerOptions {
  /** Emit `debug`. Defaults to on in development builds, off in released ones. */
  readonly verbose?: boolean;
}

const SILENT = () => {};

export function createLogger(namespace: string, options: LoggerOptions = {}): Logger {
  const prefix = `[${namespace}]`;
  const verbose = options.verbose ?? import.meta.env.DEV;

  return {
    debug: verbose ? (message, ...details) => console.debug(prefix, message, ...details) : SILENT,
    warn: (message, ...details) => console.warn(prefix, message, ...details),
    error: (message, ...details) => console.error(prefix, message, ...details),
  };
}

/** A logger that records nothing: the default for tests and for disabled paths. */
export const silentLogger: Logger = { debug: SILENT, warn: SILENT, error: SILENT };
