const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const User = require('../models/User');

const opsiCookie = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 24 * 60 * 60 * 1000
};

function kirimToken(res, user) {
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
  res.cookie('token', token, opsiCookie);
}

function dataUser(user) {
  return { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role };
}

const validasiRegistrasi = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Nama harus 2 sampai 80 karakter'),
  body('email').trim().isEmail().withMessage('Format email tidak valid'),
  body('password').isLength({ min: 6, max: 72 }).withMessage('Password minimal 6 karakter'),
  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[0-9+\-\s]{8,16}$/)
    .withMessage('Nomor HP tidak valid')
];

const validasiLogin = [
  body('email').trim().isEmail().withMessage('Format email tidak valid'),
  body('password').notEmpty().withMessage('Password wajib diisi')
];

const validasiProfil = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Nama harus 2 sampai 80 karakter'),
  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[0-9+\-\s]{8,16}$/)
    .withMessage('Nomor HP tidak valid')
];

const validasiPassword = [
  body('oldPassword').notEmpty().withMessage('Password lama wajib diisi'),
  body('newPassword').isLength({ min: 6, max: 72 }).withMessage('Password baru minimal 6 karakter')
];

async function register(req, res) {
  const { name, email, password, phone } = req.body;
  const sudahAda = await User.findOne({ email: email.toLowerCase() });
  if (sudahAda) {
    return res.status(409).json({ message: 'Email sudah terdaftar', errors: { email: 'Email sudah terdaftar' } });
  }
  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, phone: phone || '', password: hash, role: 'user' });
  kirimToken(res, user);
  res.status(201).json({ user: dataUser(user) });
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  const cocok = user ? await bcrypt.compare(password, user.password) : false;
  if (!cocok) {
    return res.status(401).json({ message: 'Email atau password salah' });
  }
  kirimToken(res, user);
  res.json({ user: dataUser(user) });
}

function logout(req, res) {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: opsiCookie.secure });
  res.json({ message: 'Berhasil keluar' });
}

function me(req, res) {
  res.json({ user: req.user ? dataUser(req.user) : null });
}

async function ubahProfil(req, res) {
  req.user.name = req.body.name;
  req.user.phone = req.body.phone || '';
  await req.user.save();
  res.json({ user: dataUser(req.user) });
}

async function ubahPassword(req, res) {
  const user = await User.findById(req.user._id).select('+password');
  const cocok = await bcrypt.compare(req.body.oldPassword, user.password);
  if (!cocok) {
    return res.status(400).json({ message: 'Password lama tidak sesuai', errors: { oldPassword: 'Password lama tidak sesuai' } });
  }
  user.password = await bcrypt.hash(req.body.newPassword, 10);
  await user.save();
  res.json({ message: 'Password berhasil diubah' });
}

module.exports = {
  validasiRegistrasi,
  validasiLogin,
  validasiProfil,
  validasiPassword,
  register,
  login,
  logout,
  me,
  ubahProfil,
  ubahPassword
};
