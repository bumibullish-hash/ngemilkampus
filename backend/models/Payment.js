const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    method: { type: String, enum: ['qris', 'link'], required: true },
    amount: { type: Number, required: true },
    linkId: { type: String, default: '' },
    slug: { type: String, required: true, unique: true },
    paymentUrl: { type: String, required: true },
    qrisString: { type: String, default: '' },
    qrImage: { type: String, default: '' },
    merchantName: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'paid', 'rejected', 'expired'], default: 'pending' },
    expiresAt: { type: Date, required: true },
    lastCheckedAt: { type: Date },
    confirmedAt: { type: Date },
    payerName: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
