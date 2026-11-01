const express = require('express');
const rateLimit = require('express-rate-limit');
const { terimaWebhook } = require('../controllers/webhookController');

const router = express.Router();

const batasWebhook = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  skip: () => process.env.NODE_ENV === 'test'
});

router.post('/bayaraja', batasWebhook, terimaWebhook);

module.exports = router;
