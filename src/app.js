const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const crypto = require('crypto');

const multer = require('multer');

const authRoutes = require('./routes/auth.routes');
const documentRoutes = require('./routes/document.routes');
const { putMetricData } = require('./services/metrics.service');
const logger = require('./utils/logger');

const app = express();

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '1mb' }));

// Metrics and logging middleware
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  const start = Date.now();
  res.on('finish', () => {
    const latency = Date.now() - start;
    const metrics = [
      { MetricName: 'RequestCount', Value: 1, Unit: 'Count' },
      { MetricName: 'RequestLatency', Value: latency, Unit: 'Milliseconds' }
    ];
    
    if (res.statusCode >= 500) {
      metrics.push({ MetricName: '5xxErrorCount', Value: 1, Unit: 'Count' });
    }
    
    putMetricData(metrics);

    logger.info('HTTP Request', {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: res.statusCode,
      duration: latency,
      userId: req.user ? req.user.id : undefined
    });
  });
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/ready', (req, res) => {
  res.json({ status: 'ready' });
});

// Global error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'File exceeds the 10 MB limit' });
    }
    return res.status(400).json({ message: 'Invalid file upload' });
  }

  if (err.message === 'Invalid file type or extension') {
    return res.status(400).json({ message: 'Invalid file type or extension' });
  }

  logger.error('Unhandled application error', { error: err, requestId: req.requestId });
  res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;
