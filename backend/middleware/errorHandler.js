function notFoundApi(req, res) {
  res.status(404).json({ message: 'Endpoint tidak ditemukan' });
}

function errorHandler(err, req, res, next) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'Ukuran foto maksimal 2 MB' });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Data yang diminta tidak valid' });
  }
  if (err.name === 'ValidationError') {
    const pesan = Object.values(err.errors).map((item) => item.message)[0];
    return res.status(400).json({ message: pesan });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: 'Data sudah ada dan tidak boleh duplikat' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Format data yang dikirim tidak valid' });
  }
  const status = err.status || 500;
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({
    message: status >= 500 && !err.expose ? err.message || 'Terjadi kesalahan pada server' : err.message
  });
}

module.exports = { notFoundApi, errorHandler };
