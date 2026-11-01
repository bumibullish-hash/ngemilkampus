const Counter = require('../models/Counter');
const { dayKey } = require('./dateRange');

async function nextInvoiceNumber() {
  const tanggal = dayKey(new Date()).replace(/-/g, '');
  const counter = await Counter.findOneAndUpdate(
    { _id: 'invoice-' + tanggal },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  return 'INV-' + tanggal + '-' + String(counter.seq).padStart(4, '0');
}

module.exports = nextInvoiceNumber;
