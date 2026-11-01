const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    key: { type: String, index: true, sparse: true },
    contentType: { type: String, required: true },
    data: { type: Buffer, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Media', mediaSchema);
