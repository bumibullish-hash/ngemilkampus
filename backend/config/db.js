const mongoose = require('mongoose');

let koneksi = null;

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI belum diisi di file .env');
  }
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (!koneksi) {
    koneksi = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 10000, maxPoolSize: 5 })
      .then(() => {
        if (!process.env.VERCEL) console.log('MongoDB terhubung: ' + mongoose.connection.name);
        return mongoose.connection;
      })
      .catch((error) => {
        koneksi = null;
        throw error;
      });
  }
  return koneksi;
}

module.exports = connectDB;
