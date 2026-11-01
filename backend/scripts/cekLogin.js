require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';
const port = process.env.PORT || 3000;

function baris(judul, nilai) {
  console.log(judul.padEnd(44) + nilai);
}

async function jalankan() {
  console.log('=== Diagnosa login NgemilKampus ===\n');
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI belum diisi di file .env');

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  baris('Database yang dipakai script ini:', mongoose.connection.name);
  baris('ADMIN_EMAIL dari .env:', email || '(kosong)');
  baris('Jumlah karakter ADMIN_PASSWORD dari .env:', String(password.length));

  const koleksi = await db.listCollections().toArray();
  console.log('\nIsi database ini:');
  for (const item of koleksi) {
    baris('  ' + item.name, (await db.collection(item.name).countDocuments()) + ' dokumen');
  }

  const users = db.collection('users');
  const semua = await users.find({}, { projection: { email: 1, role: 1, name: 1, password: 1 } }).toArray();
  console.log('\nAkun di collection users (' + semua.length + '):');
  semua.forEach((user) => {
    const hash = typeof user.password === 'string' ? user.password : '';
    const bentukHash = hash.startsWith('$2') && hash.length === 60 ? 'hash bcrypt valid' : hash ? 'BUKAN hash bcrypt' : 'TIDAK ADA field password';
    console.log('  - ' + JSON.stringify(user.email) + ' | role=' + user.role + ' | ' + bentukHash);
  });

  const indeks = await users.indexes().catch(() => []);
  console.log('\nIndex collection users: ' + indeks.map((item) => item.name).join(', '));

  const admin = await users.findOne({ email });
  console.log('');
  if (!admin) {
    baris('Akun dengan ADMIN_EMAIL:', 'TIDAK ADA -> jalankan npm run reset-admin');
  } else {
    baris('Akun dengan ADMIN_EMAIL:', 'ada, role=' + admin.role);
    const cocok = typeof admin.password === 'string' ? await bcrypt.compare(password, admin.password) : false;
    baris('Password .env cocok dengan database:', cocok ? 'COCOK' : 'TIDAK COCOK -> jalankan npm run reset-admin');
  }

  console.log('\nUji ke server di http://localhost:' + port + ' (server harus sedang berjalan):');
  try {
    const respons = await fetch('http://localhost:' + port + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(8000)
    });
    const data = await respons.json().catch(() => ({}));
    baris('Status balasan login:', respons.status + ' ' + (data.message || (data.user ? 'berhasil, role=' + data.user.role : '')));
    const cek = await fetch('http://localhost:' + port + '/api/health').then((r) => r.json()).catch(() => null);
    if (cek) baris('Server melaporkan database:', cek.database);
  } catch (error) {
    baris('Hasil:', 'server tidak dapat dihubungi (' + error.message + ')');
  }
}

jalankan()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error('Gagal: ' + error.message);
    await mongoose.disconnect();
    process.exit(1);
  });
