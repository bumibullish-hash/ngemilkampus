const app = require('../backend/app');
const connectDB = require('../backend/config/db');

module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (error) {
    console.error('Koneksi database gagal: ' + error.message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ message: 'Database tidak dapat dihubungi. Periksa MONGODB_URI dan Network Access di MongoDB Atlas.' }));
  }
  return app(req, res);
};
