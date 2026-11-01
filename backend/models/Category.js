const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 50 },
    description: { type: String, trim: true, default: '', maxlength: 200 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
