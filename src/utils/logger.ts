type LogMeta = Record<string, unknown>;

function write(level: 'info' | 'warn' | 'error', message: string, meta: LogMeta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'ecommerce-api',
    message,
    ...meta,
  };
  const output = JSON.stringify(entry);
  if (level === 'error') console.error(output);
  else if (level === 'warn') console.warn(output);
  else console.log(output);
}

export const logger = {
  info: (message: string, meta?: LogMeta) => write('info', message, meta),
  warn: (message: string, meta?: LogMeta) => write('warn', message, meta),
  error: (message: string, meta?: LogMeta) => write('error', message, meta),
};
