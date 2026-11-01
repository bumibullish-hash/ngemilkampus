const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const { notFoundApi, errorHandler } = require('./middleware/errorHandler');

const app = express();

if (process.env.VERCEL) {
  app.set('trust proxy', 1);
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        upgradeInsecureRequests: null
      }
    }
  })
);

app.use(
  express.json({
    verify: (req, res, buffer) => {
      req.rawBody = buffer;
    }
  })
);
app.use(cookieParser());

const frontend = path.join(__dirname, '..', 'frontend');
app.use('/css', express.static(path.join(frontend, 'css')));
app.use('/js', express.static(path.join(frontend, 'js')));
app.use('/images', express.static(path.join(frontend, 'images')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get('/media/:id', require('./controllers/mediaController').tampilkanMedia);
app.use('/vendor/chart', express.static(path.join(__dirname, '..', 'node_modules', 'chart.js', 'dist')));

app.get('/api/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.json({
    app: 'NgemilKampus',
    server: 'ok',
    database: dbConnected ? 'terhubung' : 'tidak terhubung'
  });
});

app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 3000,
    skip: () => process.env.NODE_ENV === 'test'
  })
);

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/webhooks', require('./routes/webhookRoutes'));
app.get('/api/cron/expire', require('./controllers/cronController').periksaKedaluwarsa);
app.use('/api', require('./routes/publicRoutes'));

app.use('/api', notFoundApi);
app.use(require('./routes/pageRoutes'));
app.use(errorHandler);

module.exports = app;
