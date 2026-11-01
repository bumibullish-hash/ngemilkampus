const PDFDocument = require('pdfkit');
const {
  formatRupiah,
  formatTanggal,
  labelStatusBayar,
  labelStatusPesanan,
  labelMetode
} = require('../utils/format');

const WARNA = '#F97316';

function kopSurat(doc, setting, judul, subjudul) {
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#1F2937').text(setting.businessName);
  const kontak = [setting.address, setting.phone, setting.email].filter(Boolean).join(' | ');
  if (kontak) {
    doc.font('Helvetica').fontSize(9).fillColor('#6B7280').text(kontak);
  }
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#1F2937').text(judul);
  if (subjudul) {
    doc.font('Helvetica').fontSize(10).fillColor('#6B7280').text(subjudul);
  }
  doc.fillColor('#1F2937').moveDown(0.8);
}

function gambarTabel(doc, kolom, baris, opsi = {}) {
  const kiri = doc.page.margins.left;
  const padding = 4;
  const ukuranFont = opsi.fontSize || 8.5;

  function tinggiBaris(sel, tebal) {
    doc.font(tebal ? 'Helvetica-Bold' : 'Helvetica').fontSize(ukuranFont);
    let tinggi = 0;
    sel.forEach((isi, indeks) => {
      const h = doc.heightOfString(String(isi), { width: kolom[indeks].width - padding * 2 });
      if (h > tinggi) tinggi = h;
    });
    return tinggi + padding * 2;
  }

  function cetakBaris(sel, header, selang) {
    const tinggi = tinggiBaris(sel, header);
    if (doc.y + tinggi > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      cetakBaris(kolom.map((k) => k.header), true, false);
    }
    const y = doc.y;
    let x = kiri;
    const lebarTotal = kolom.reduce((jumlah, k) => jumlah + k.width, 0);
    if (header) {
      doc.rect(kiri, y, lebarTotal, tinggi).fill(WARNA);
    } else if (selang) {
      doc.rect(kiri, y, lebarTotal, tinggi).fill('#FFF7ED');
    }
    doc.font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(ukuranFont).fillColor(header ? '#FFFFFF' : '#1F2937');
    sel.forEach((isi, indeks) => {
      doc.text(String(isi), x + padding, y + padding, {
        width: kolom[indeks].width - padding * 2,
        align: kolom[indeks].align || 'left'
      });
      x += kolom[indeks].width;
    });
    doc.moveTo(kiri, y + tinggi).lineTo(kiri + lebarTotal, y + tinggi).strokeColor('#E5E7EB').lineWidth(0.5).stroke();
    doc.y = y + tinggi;
    doc.x = kiri;
    doc.fillColor('#1F2937');
  }

  cetakBaris(kolom.map((k) => k.header), true, false);
  if (baris.length === 0) {
    doc.moveDown(0.5).font('Helvetica-Oblique').fontSize(9).fillColor('#6B7280').text(opsi.kosong || 'Tidak ada data.', kiri);
    doc.fillColor('#1F2937');
    return;
  }
  baris.forEach((sel, indeks) => cetakBaris(sel, false, indeks % 2 === 1));
}

function kotakRingkasan(doc, daftar) {
  const kiri = doc.page.margins.left;
  daftar.forEach((item) => {
    const y = doc.y;
    doc.font('Helvetica').fontSize(10).fillColor('#6B7280').text(item[0], kiri, y, { width: 200 });
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1F2937').text(item[1], kiri + 200, y, { width: 250 });
    doc.y = y + 15;
    doc.x = kiri;
  });
  doc.moveDown(0.8);
}

function labelKunci(kunci) {
  if (kunci.length === 7) {
    const [tahun, bulan] = kunci.split('-');
    const nama = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return nama[Number(bulan) - 1] + ' ' + tahun;
  }
  const [tahun, bulan, hari] = kunci.split('-');
  return hari + '/' + bulan + '/' + tahun;
}

function footer(doc) {
  doc.moveDown(1.5);
  doc.font('Helvetica').fontSize(8).fillColor('#6B7280').text('Dicetak pada ' + formatTanggal(new Date()) + ' WIB oleh sistem NgemilKampus', doc.page.margins.left);
}

function buatInvoicePdf(order, payment, setting) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const kiri = doc.page.margins.left;
  const lebar = doc.page.width - kiri * 2;

  kopSurat(doc, setting, 'INVOICE', null);

  const yAtas = doc.y;
  doc.font('Helvetica').fontSize(10).fillColor('#6B7280').text('Nomor invoice', kiri, yAtas);
  doc.font('Helvetica-Bold').fillColor('#1F2937').text(order.invoiceNumber, kiri, yAtas + 13);
  doc.font('Helvetica').fillColor('#6B7280').text('Tanggal transaksi', kiri + 190, yAtas);
  doc.font('Helvetica-Bold').fillColor('#1F2937').text(formatTanggal(order.createdAt) + ' WIB', kiri + 190, yAtas + 13);
  doc.font('Helvetica').fillColor('#6B7280').text('Status pembayaran', kiri + 390, yAtas);
  doc.font('Helvetica-Bold').fillColor(order.paymentStatus === 'paid' ? '#16A34A' : '#CA8A04').text(labelStatusBayar[order.paymentStatus], kiri + 390, yAtas + 13);
  doc.y = yAtas + 40;
  doc.x = kiri;

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#1F2937').text('Pelanggan');
  doc.font('Helvetica').fontSize(10).fillColor('#1F2937').text(order.customerName);
  doc.text(order.customerEmail);
  if (order.customerPhone) doc.text(order.customerPhone);
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text('Pengambilan pesanan');
  doc.font('Helvetica').text(order.pickupPoint + ', ' + formatTanggal(order.pickupTime) + ' WIB');
  doc.moveDown(1);

  const kolom = [
    { header: 'No', width: 30, align: 'center' },
    { header: 'Produk', width: lebar - 30 - 60 - 100 - 110, align: 'left' },
    { header: 'Jumlah', width: 60, align: 'center' },
    { header: 'Harga satuan', width: 100, align: 'right' },
    { header: 'Subtotal', width: 110, align: 'right' }
  ];
  const baris = order.items.map((item, indeks) => [
    indeks + 1,
    item.name,
    item.quantity,
    formatRupiah(item.price),
    formatRupiah(item.subtotal)
  ]);
  gambarTabel(doc, kolom, baris, { fontSize: 9.5 });

  doc.moveDown(1);
  const yTotal = doc.y;
  doc.font('Helvetica').fontSize(10).fillColor('#6B7280').text('Subtotal', kiri + lebar - 260, yTotal, { width: 120 });
  doc.fillColor('#1F2937').text(formatRupiah(order.subtotal), kiri + lebar - 140, yTotal, { width: 140, align: 'right' });
  doc.font('Helvetica-Bold').fontSize(12).text('Total pembayaran', kiri + lebar - 260, yTotal + 20, { width: 120 });
  doc.fillColor(WARNA).text(formatRupiah(order.total), kiri + lebar - 140, yTotal + 20, { width: 140, align: 'right' });
  doc.y = yTotal + 55;
  doc.x = kiri;

  doc.fillColor('#1F2937').font('Helvetica-Bold').fontSize(10).text('Metode pembayaran');
  doc.font('Helvetica').text(labelMetode[order.paymentMethod] + ' via Bayaraja');
  if (order.paymentStatus === 'paid' && order.paidAt) {
    doc.text('Dibayar pada ' + formatTanggal(order.paidAt) + ' WIB');
  }
  doc.text('Status pesanan: ' + labelStatusPesanan[order.orderStatus]);
  if (order.note) {
    doc.moveDown(0.5).font('Helvetica-Bold').text('Catatan');
    doc.font('Helvetica').text(order.note);
  }
  if (payment && payment.slug && order.paymentStatus !== 'paid') {
    doc.moveDown(0.5).font('Helvetica').fillColor('#6B7280').text('Invoice ini belum lunas. Selesaikan pembayaran melalui halaman pembayaran di aplikasi.');
  }
  footer(doc);
  return doc;
}

function buatLaporanPenjualanPdf(data, setting) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });
  kopSurat(doc, setting, 'Laporan Penjualan', 'Periode: ' + data.periode.label);
  const r = data.ringkasan;
  kotakRingkasan(doc, [
    ['Total omzet (hanya transaksi Paid)', formatRupiah(r.omzet)],
    ['Total transaksi', String(r.total)],
    ['Transaksi berhasil (Paid)', String(r.paid)],
    ['Transaksi pending', String(r.pending)],
    ['Transaksi rejected / expired', r.rejected + ' / ' + r.expired],
    ['Jumlah item terjual', String(r.itemTerjual)]
  ]);
  const kolom = [
    { header: 'No', width: 28, align: 'center' },
    { header: 'No. Transaksi', width: 110 },
    { header: 'Tanggal', width: 95 },
    { header: 'Pelanggan', width: 100 },
    { header: 'Produk', width: 200 },
    { header: 'Total', width: 85, align: 'right' },
    { header: 'Metode', width: 62 },
    { header: 'Status', width: 62 }
  ];
  const baris = data.baris.map((item, indeks) => [
    indeks + 1,
    item.invoiceNumber,
    formatTanggal(item.createdAt),
    item.customerName,
    item.produk,
    formatRupiah(item.total),
    labelMetode[item.paymentMethod],
    labelStatusBayar[item.paymentStatus]
  ]);
  gambarTabel(doc, kolom, baris, { kosong: 'Tidak ada transaksi pada periode ini.' });
  footer(doc);
  return doc;
}

function buatLaporanKeuanganPdf(data, setting) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  kopSurat(doc, setting, 'Laporan Keuangan', 'Periode: ' + data.periode.label);
  const r = data.ringkasan;
  kotakRingkasan(doc, [
    ['Total pendapatan (hanya transaksi Paid)', formatRupiah(r.pendapatan)],
    ['Total transaksi berhasil', String(r.transaksiBerhasil)],
    ['Harga pokok penjualan (modal)', formatRupiah(r.hpp)],
    ['Laba kotor', formatRupiah(r.labaKotor)],
    ['Total pengeluaran operasional', formatRupiah(r.pengeluaran)],
    ['Laba bersih', formatRupiah(r.labaBersih)]
  ]);

  doc.font('Helvetica-Bold').fontSize(11).text('Rekapitulasi per ' + (data.periode.unit === 'month' ? 'bulan' : 'hari'));
  doc.moveDown(0.4);
  const lebar = doc.page.width - doc.page.margins.left * 2;
  const kolomRekap = [
    { header: 'Periode', width: lebar - 4 * 80 - 60, align: 'left' },
    { header: 'Transaksi', width: 60, align: 'center' },
    { header: 'Pendapatan', width: 80, align: 'right' },
    { header: 'Modal', width: 80, align: 'right' },
    { header: 'Pengeluaran', width: 80, align: 'right' },
    { header: 'Laba bersih', width: 80, align: 'right' }
  ];
  const barisRekap = data.rekap
    .filter((item) => item.transaksi > 0 || item.pengeluaran > 0)
    .map((item) => [
      labelKunci(item.key),
      item.transaksi,
      formatRupiah(item.pendapatan),
      formatRupiah(item.hpp),
      formatRupiah(item.pengeluaran),
      formatRupiah(item.labaBersih)
    ]);
  gambarTabel(doc, kolomRekap, barisRekap, { kosong: 'Belum ada pendapatan atau pengeluaran pada periode ini.' });

  doc.moveDown(1.2);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1F2937').text('Daftar pengeluaran operasional', doc.page.margins.left);
  doc.moveDown(0.4);
  const kolomBiaya = [
    { header: 'Tanggal', width: 90 },
    { header: 'Keterangan', width: lebar - 90 - 100 - 100 },
    { header: 'Kategori', width: 100 },
    { header: 'Jumlah', width: 100, align: 'right' }
  ];
  const barisBiaya = data.pengeluaran.map((item) => [
    formatTanggal(item.date).split(',')[0],
    item.title,
    item.category,
    formatRupiah(item.amount)
  ]);
  gambarTabel(doc, kolomBiaya, barisBiaya, { kosong: 'Tidak ada pengeluaran pada periode ini.' });
  footer(doc);
  return doc;
}

module.exports = { buatInvoicePdf, buatLaporanPenjualanPdf, buatLaporanKeuanganPdf };
