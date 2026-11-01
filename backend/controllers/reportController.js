const Setting = require('../models/Setting');
const { laporanPenjualan, laporanKeuangan } = require('../services/reportService');
const { buatLaporanPenjualanPdf, buatLaporanKeuanganPdf } = require('../services/pdfService');

const periodeValid = ['hari-ini', '7-hari', 'bulan-ini', 'bulan-lalu', 'tahun-ini', 'kustom'];

function bacaFilter(query) {
  const period = periodeValid.includes(query.period) ? query.period : 'bulan-ini';
  const status = ['pending', 'paid', 'rejected', 'expired'].includes(query.status) ? query.status : '';
  return { period, from: query.from, to: query.to, status };
}

function kirimPdf(res, doc, namaFile) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="' + namaFile + '"');
  doc.pipe(res);
  doc.end();
}

async function penjualan(req, res) {
  res.json(await laporanPenjualan(bacaFilter(req.query)));
}

async function penjualanPdf(req, res) {
  const data = await laporanPenjualan(bacaFilter(req.query));
  const setting = await Setting.get();
  kirimPdf(res, buatLaporanPenjualanPdf(data, setting), 'laporan-penjualan.pdf');
}

async function keuangan(req, res) {
  res.json(await laporanKeuangan(bacaFilter(req.query)));
}

async function keuanganPdf(req, res) {
  const data = await laporanKeuangan(bacaFilter(req.query));
  const setting = await Setting.get();
  kirimPdf(res, buatLaporanKeuanganPdf(data, setting), 'laporan-keuangan.pdf');
}

module.exports = { penjualan, penjualanPdf, keuangan, keuanganPdf };
