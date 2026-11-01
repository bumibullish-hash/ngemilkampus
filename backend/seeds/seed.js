require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Setting = require('../models/Setting');

const pakaiContoh = process.argv.includes('--contoh');

const produkContoh = [
  { name: 'Keripik Pisang Coklat', category: 'Camilan', price: 8000, costPrice: 4500, stock: 40, description: 'Keripik pisang renyah dengan lapisan coklat, kemasan 100 gram.' },
  { name: 'Basreng Pedas', category: 'Camilan', price: 10000, costPrice: 6000, stock: 35, description: 'Bakso goreng pedas gurih, cocok untuk teman kuliah.' },
  { name: 'Risol Mayo', category: 'Camilan', price: 5000, costPrice: 2800, stock: 50, description: 'Risol isi sayur, telur, dan mayones. Dibuat setiap pagi.' },
  { name: 'Es Teh Manis', category: 'Minuman', price: 4000, costPrice: 1500, stock: 60, description: 'Teh seduh dingin dengan gula pas, gelas 300 ml.' },
  { name: 'Kopi Susu Gula Aren', category: 'Minuman', price: 12000, costPrice: 6500, stock: 30, description: 'Kopi susu dingin dengan gula aren, gelas 300 ml.' },
  { name: 'Paket Hemat Ngemil', category: 'Paket Hemat', price: 15000, costPrice: 8500, stock: 25, description: 'Satu risol mayo, satu keripik pisang coklat, dan satu es teh manis.' }
];

async function jalankan() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI belum diisi di file .env');
  }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('MongoDB terhubung: ' + mongoose.connection.name);

  const emailAdmin = (process.env.ADMIN_EMAIL || '').toLowerCase();
  const passwordAdmin = process.env.ADMIN_PASSWORD;
  if (!emailAdmin || !passwordAdmin || passwordAdmin.length < 6) {
    throw new Error('ADMIN_EMAIL dan ADMIN_PASSWORD (minimal 6 karakter) wajib diisi di file .env');
  }

  const adminAda = await User.findOne({ email: emailAdmin });
  if (adminAda) {
    console.log('Akun admin sudah ada: ' + emailAdmin);
  } else {
    await User.create({
      name: process.env.ADMIN_NAME || 'Admin NgemilKampus',
      email: emailAdmin,
      password: await bcrypt.hash(passwordAdmin, 10),
      role: 'admin'
    });
    console.log('Akun admin dibuat: ' + emailAdmin);
  }

  await Setting.get();
  console.log('Pengaturan usaha siap');

  const namaKategori = ['Camilan', 'Minuman', 'Paket Hemat'];
  for (const nama of namaKategori) {
    await Category.updateOne({ name: nama }, { $setOnInsert: { name: nama } }, { upsert: true });
  }
  console.log('Kategori siap: ' + namaKategori.join(', '));

  if (pakaiContoh) {
    let dibuat = 0;
    for (const item of produkContoh) {
      const ada = await Product.findOne({ name: item.name });
      if (ada) continue;
      const kategori = await Category.findOne({ name: item.category });
      await Product.create({ ...item, category: kategori._id });
      dibuat += 1;
    }
    console.log('Produk contoh ditambahkan: ' + dibuat);
  }
}

jalankan()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error('Seed gagal: ' + error.message);
    await mongoose.disconnect();
    process.exit(1);
  });
