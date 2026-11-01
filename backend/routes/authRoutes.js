const express = require('express');
const rateLimit = require('express-rate-limit');
const auth = require('../controllers/authController');
const validate = require('../middleware/validate');
const { optionalAuth, protect } = require('../middleware/auth');

const router = express.Router();

const batasLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.' }
});

router.post('/register', batasLogin, auth.validasiRegistrasi, validate, auth.register);
router.post('/login', batasLogin, auth.validasiLogin, validate, auth.login);
router.post('/logout', auth.logout);
router.get('/me', optionalAuth, auth.me);
router.put('/profile', protect, auth.validasiProfil, validate, auth.ubahProfil);
router.put('/password', protect, auth.validasiPassword, validate, auth.ubahPassword);

module.exports = router;
