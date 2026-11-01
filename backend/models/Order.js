const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    costPrice: { type: Number, required: true, default: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, default: '' },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['qris', 'link'], required: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'rejected', 'expired'],
      default: 'pending',
      index: true
    },
    orderStatus: {
      type: String,
      enum: ['menunggu_pembayaran', 'diproses', 'siap_diambil', 'selesai', 'dibatalkan'],
      default: 'menunggu_pembayaran'
    },
    pickupPoint: { type: String, required: true },
    pickupTime: { type: Date, required: true },
    note: { type: String, default: '', maxlength: 200 },
    expiresAt: { type: Date, required: true },
    paidAt: { type: Date },
    stockReturned: { type: Boolean, default: false },
    adminNote: { type: String, default: '' }
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
