const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    category: {
      type: String,
      enum: ['Bahan baku', 'Kemasan', 'Transport', 'Peralatan', 'Lainnya'],
      default: 'Lainnya'
    },
    amount: { type: Number, required: true, min: 1 },
    date: { type: Date, required: true },
    note: { type: String, trim: true, default: '', maxlength: 200 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);
