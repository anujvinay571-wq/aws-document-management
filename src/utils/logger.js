const sanitizeError = (err) => {
  if (!err) return null;
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code
    };
  }
  return err;
};

const formatLog = (level, message, metadata = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...metadata
  };

  if (logEntry.error) {
    logEntry.error = sanitizeError(logEntry.error);
  }

  return JSON.stringify(logEntry);
};

exports.info = (message, metadata) => {
  console.log(formatLog('INFO', message, metadata));
};

exports.error = (message, metadata) => {
  console.error(formatLog('ERROR', message, metadata));
};
