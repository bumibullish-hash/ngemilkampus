require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Setting = require('../models/Setting');
const Media = require('../models/Media');

const tanpaUser = process.argv.includes('--tanpa-user');

const warnaKategori = {
  Camilan: ['#fdba74', '#f97316'],
  Minuman: ['#93c5fd', '#3b82f6'],
  'Paket Hemat': ['#86efac', '#16a34a']
};

const daftarProduk = [
  ['Camilan', 'Keripik Pisang Coklat', 8000, 4500, 40, 'Keripik pisang renyah berlapis coklat, kemasan 100 gram.'],
  ['Camilan', 'Basreng Pedas', 10000, 6000, 35, 'Bakso goreng pedas gurih, teman belajar yang pas.'],
  ['Camilan', 'Risol Mayo', 5000, 2800, 50, 'Risol isi sayur, telur, dan mayones. Dibuat setiap pagi.'],
  ['Camilan', 'Cireng Isi Ayam', 7000, 3800, 45, 'Cireng garing dengan isian ayam pedas manis, 5 butir.'],
  ['Camilan', 'Tahu Crispy', 6000, 3000, 40, 'Tahu goreng tepung renyah dengan bumbu tabur balado.'],
  ['Camilan', 'Pisang Goreng Keju', 8000, 4200, 30, 'Pisang goreng hangat dengan taburan keju dan susu.'],
  ['Camilan', 'Siomay Mini', 12000, 7000, 25, 'Siomay ikan mini isi 6 dengan saus kacang.'],
  ['Camilan', 'Martabak Mini Coklat Keju', 10000, 5500, 30, 'Martabak manis ukuran mini, isi coklat dan keju.'],
  ['Camilan', 'Donat Kentang', 5000, 2500, 40, 'Donat empuk dari kentang dengan gula halus.'],
  ['Camilan', 'Brownies Kukus (stok tipis)', 9000, 5000, 3, 'Dipakai untuk menguji peringatan stok hampir habis.'],
  ['Camilan', 'Es Cendol (stok habis)', 7000, 3500, 0, 'Dipakai untuk menguji tampilan produk dengan stok habis.'],
  ['Minuman', 'Es Teh Manis', 4000, 1500, 60, 'Teh seduh dingin dengan gula pas, gelas 300 ml.'],
  ['Minuman', 'Kopi Susu Gula Aren', 12000, 6500, 30, 'Kopi susu dingin dengan gula aren, gelas 300 ml.'],
  ['Minuman', 'Es Jeruk Peras', 7000, 3500, 35, 'Jeruk peras segar dengan es batu, gelas 300 ml.'],
  ['Minuman', 'Thai Tea', 10000, 5000, 35, 'Teh Thailand creamy dengan susu, gelas 300 ml.'],
  ['Minuman', 'Matcha Latte', 14000, 8000, 25, 'Matcha dengan susu segar, disajikan dingin.'],
  ['Minuman', 'Es Coklat', 9000, 4500, 30, 'Coklat dingin dengan susu, gelas 300 ml.'],
  ['Minuman', 'Lemon Tea', 6000, 2500, 40, 'Teh dengan perasan lemon, segar untuk siang hari.'],
  ['Paket Hemat', 'Paket Hemat Ngemil', 15000, 8500, 25, 'Satu risol mayo, satu keripik pisang coklat, dan satu es teh manis.'],
  ['Paket Hemat', 'Paket Belajar', 20000, 11500, 25, 'Satu kopi susu gula aren dan dua risol mayo.'],
  ['Paket Hemat', 'Paket Berdua', 28000, 15500, 20, 'Dua minuman pilihan dan dua camilan pilihan untuk berdua.']
];

function escapeXml(teks) {
  return String(teks).replace(/[&<>"']/g, (huruf) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[huruf]));
}

function pecahBaris(teks, batas) {
  const kata = teks.split(' ');
  const baris = [''];
  kata.forEach((item) => {
    const terakhir = baris[baris.length - 1];
    if ((terakhir + ' ' + item).trim().length <= batas || terakhir === '') {
      baris[baris.length - 1] = (terakhir + ' ' + item).trim();
    } else {
      baris.push(item);
    }
  });
  return baris.slice(0, 3);
}

function buatGambar(nama, kategori) {
  const warna = warnaKategori[kategori];
  const namaTampil = nama.replace(/\s*\(.*\)\s*$/, '');
  const baris = pecahBaris(namaTampil, 16);
  const awalY = 225 - ((baris.length - 1) * 26) + 12;
  const teks = baris
    .map((isi, indeks) => '<text x="300" y="' + (awalY + indeks * 52) + '" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="42" font-weight="700" fill="#1f2937">' + escapeXml(isi) + '</text>')
    .join('');
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + warna[0] + '"/><stop offset="1" stop-color="' + warna[1] + '"/></linearGradient></defs>' +
    '<rect width="600" height="450" fill="url(#g)"/>' +
    '<circle cx="300" cy="225" r="170" fill="#ffffff" fill-opacity="0.22"/>' +
    '<circle cx="300" cy="225" r="120" fill="#ffffff" fill-opacity="0.32"/>' +
    teks +
    '<text x="300" y="410" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="22" fill="#1f2937" fill-opacity="0.7">' + escapeXml(kategori) + '</text>' +
    '</svg>'
  );
}

function kunciMedia(nama) {
  return 'dummy-' + nama.toLowerCase().replace(/\(.*\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function jalankan() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI belum diisi di file .env');
  }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('MongoDB terhubung ke database: ' + mongoose.connection.name);

  await Setting.get();

  const kategoriMap = {};
  for (const nama of Object.keys(warnaKategori)) {
    const kategori = await Category.findOneAndUpdate({ name: nama }, { $setOnInsert: { name: nama } }, { upsert: true, returnDocument: 'after' });
    kategoriMap[nama] = kategori._id;
  }

  let baru = 0;
  let diperbarui = 0;
  for (const [kategori, nama, harga, modal, stok, deskripsi] of daftarProduk) {
    const media = await Media.findOneAndUpdate(
      { key: kunciMedia(nama) },
      { $set: { contentType: 'image/svg+xml', data: Buffer.from(buatGambar(nama, kategori)) } },
      { upsert: true, returnDocument: 'after' }
    );
    const data = {
      category: kategoriMap[kategori],
      description: deskripsi,
      price: harga,
      costPrice: modal,
      stock: stok,
      image: '/media/' + media._id,
      isActive: true
    };
    const ada = await Product.findOne({ name: nama });
    if (ada) {
      await Product.updateOne({ _id: ada._id }, { $set: data });
      diperbarui += 1;
    } else {
      await Product.create({ name: nama, ...data });
      baru += 1;
    }
  }
  console.log('Produk dummy: ' + baru + ' ditambahkan, ' + diperbarui + ' dikembalikan ke harga dan stok awal');

  if (!tanpaUser) {
    const email = 'pembeli@ngemilkampus.local';
    const ada = await User.findOne({ email });
    if (ada) {
      console.log('Akun pembeli uji sudah ada: ' + email);
    } else {
      await User.create({
        name: 'Pembeli Uji',
        email,
        phone: '081234567890',
        password: await bcrypt.hash('pembeli123', 10),
        role: 'user'
      });
      console.log('Akun pembeli uji dibuat: ' + email + ' / pembeli123');
    }
  }

  const total = await Product.countDocuments();
  console.log('Total produk di database: ' + total);
  console.log('Selesai. Buka http://localhost:' + (process.env.PORT || 3000) + '/produk');
}

jalankan()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error('Gagal: ' + error.message);
    await mongoose.disconnect();
    process.exit(1);
  });
