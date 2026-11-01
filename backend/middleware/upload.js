const multer = require('multer');

const uploadFoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(null, true);
    }
    const error = new Error('Foto harus berformat JPG, PNG, atau WEBP');
    error.status = 400;
    cb(error);
  }
});

module.exports = uploadFoto;
