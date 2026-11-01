const { formatTanggalSaja } = require('./format');

const OFFSET = 7 * 60 * 60 * 1000;
const SEHARI = 24 * 60 * 60 * 1000;

function awalHari(tanggal) {
  const wib = new Date(tanggal.getTime() + OFFSET);
  wib.setUTCHours(0, 0, 0, 0);
  return new Date(wib.getTime() - OFFSET);
}

function dayKey(tanggal) {
  return new Date(new Date(tanggal).getTime() + OFFSET).toISOString().slice(0, 10);
}

function monthKey(tanggal) {
  return dayKey(tanggal).slice(0, 7);
}

function tanggalValid(teks) {
  return /^\d{4}-\d{2}-\d{2}$/.test(teks || '') && !Number.isNaN(Date.parse(teks + 'T00:00:00+07:00'));
}

function getRange(period, from, to) {
  const sekarang = new Date();
  const wib = new Date(sekarang.getTime() + OFFSET);
  const tahun = wib.getUTCFullYear();
  const bulan = wib.getUTCMonth();
  const hariIni = awalHari(sekarang);
  let start;
  let end;

  if (period === 'hari-ini') {
    start = hariIni;
    end = new Date(hariIni.getTime() + SEHARI);
  } else if (period === '7-hari') {
    start = new Date(hariIni.getTime() - 6 * SEHARI);
    end = new Date(hariIni.getTime() + SEHARI);
  } else if (period === 'bulan-lalu') {
    start = new Date(Date.UTC(tahun, bulan - 1, 1) - OFFSET);
    end = new Date(Date.UTC(tahun, bulan, 1) - OFFSET);
  } else if (period === 'tahun-ini') {
    start = new Date(Date.UTC(tahun, 0, 1) - OFFSET);
    end = new Date(Date.UTC(tahun + 1, 0, 1) - OFFSET);
  } else if (period === 'kustom') {
    if (!tanggalValid(from) || !tanggalValid(to)) {
      const error = new Error('Tanggal awal dan tanggal akhir wajib diisi dengan benar');
      error.status = 400;
      throw error;
    }
    start = new Date(from + 'T00:00:00+07:00');
    end = new Date(new Date(to + 'T00:00:00+07:00').getTime() + SEHARI);
    if (end <= start) {
      const error = new Error('Tanggal akhir tidak boleh lebih awal dari tanggal awal');
      error.status = 400;
      throw error;
    }
    if (end - start > 800 * SEHARI) {
      const error = new Error('Rentang tanggal terlalu panjang, maksimal sekitar 2 tahun');
      error.status = 400;
      throw error;
    }
  } else {
    start = new Date(Date.UTC(tahun, bulan, 1) - OFFSET);
    end = new Date(Date.UTC(tahun, bulan + 1, 1) - OFFSET);
  }

  const label =
    formatTanggalSaja(start) + ' - ' + formatTanggalSaja(new Date(end.getTime() - 1));
  const unit = end - start > 92 * SEHARI ? 'month' : 'day';
  return { start, end, label, unit };
}

function buildKeys(start, end, unit) {
  const keys = [];
  if (unit === 'month') {
    const wib = new Date(start.getTime() + OFFSET);
    let tahun = wib.getUTCFullYear();
    let bulan = wib.getUTCMonth();
    while (new Date(Date.UTC(tahun, bulan, 1) - OFFSET) < end) {
      keys.push(tahun + '-' + String(bulan + 1).padStart(2, '0'));
      bulan += 1;
      if (bulan > 11) {
        bulan = 0;
        tahun += 1;
      }
    }
    return keys;
  }
  for (let waktu = start.getTime(); waktu < end.getTime(); waktu += SEHARI) {
    keys.push(dayKey(new Date(waktu)));
  }
  return keys;
}

module.exports = { getRange, buildKeys, dayKey, monthKey, awalHari, SEHARI, OFFSET };
