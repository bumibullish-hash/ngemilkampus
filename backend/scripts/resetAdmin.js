require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');

async function jalankan() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI belum diisi di file .env');
  }
  if (!email || password.length < 6) {
    throw new Error('ADMIN_EMAIL dan ADMIN_PASSWORD (minimal 6 karakter) wajib diisi di file .env');
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('MongoDB terhubung ke database: ' + mongoose.connection.name);

  const hash = await bcrypt.hash(password, 10);
  const user = await User.findOne({ email });
  if (user) {
    user.password = hash;
    user.role = 'admin';
    await user.save();
    console.log('Password akun admin diperbarui: ' + email);
  } else {
    await User.create({
      name: process.env.ADMIN_NAME || 'Admin NgemilKampus',
      email,
      password: hash,
      role: 'admin'
    });
    console.log('Akun admin dibuat: ' + email);
  }

  const cek = await User.findOne({ email }).select('+password');
  const cocok = await bcrypt.compare(password, cek.password);
  console.log('Pengecekan password dari .env terhadap database: ' + (cocok ? 'COCOK' : 'TIDAK COCOK'));
  console.log('Jumlah karakter password terbaca: ' + password.length);
  console.log('Login dengan email ' + email + ' dan password tersebut.');
}

jalankan()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error('Gagal: ' + error.message);
    await mongoose.disconnect();
    process.exit(1);
  });
