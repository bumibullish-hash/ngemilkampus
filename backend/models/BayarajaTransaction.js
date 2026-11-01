const mongoose = require('mongoose');

const bayarajaTransactionSchema = new mongoose.Schema(
  {
    externalId: { type: String, required: true, unique: true },
    linkId: { type: String, default: '' },
    status: { type: String, default: '' },
    amount: { type: Number, default: 0 },
    payerName: { type: String, default: '' },
    remoteCreatedAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model('BayarajaTransaction', bayarajaTransactionSchema);
