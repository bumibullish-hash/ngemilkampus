const http = require('http');
const crypto = require('crypto');

const gambarKecil =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function buatMock(apiKey, portAwal) {
  const links = {};
  let gagal = false;

  const server = http.createServer((req, res) => {
    const kirim = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    let isi = '';
    req.on('data', (potongan) => {
      isi += potongan;
    });
    req.on('end', () => {
      const url = new URL(req.url, 'http://localhost');
      const body = isi ? JSON.parse(isi) : {};

      if (url.pathname.startsWith('/__kontrol/')) {
        const [, , slug, aksi] = url.pathname.split('/');
        if (aksi === 'gagal') {
          gagal = slug === 'ya';
          return kirim(200, { gagal });
        }
        const link = links[slug];
        if (!link) return kirim(404, { error: 'link tidak ada' });
        if (aksi === 'bukti') link.transaksi = { id: crypto.randomUUID(), status: 'pending', amount: link.amount, payer_name: 'Pembeli Uji', created_at: new Date().toISOString() };
        if (aksi === 'konfirmasi') link.transaksi.status = 'confirmed';
        if (aksi === 'tolak') link.transaksi.status = 'rejected';
        return kirim(200, { ok: true });
      }

      if (gagal) return kirim(500, { error: 'Bayaraja sedang gangguan' });
      if (req.headers.authorization !== 'Bearer ' + apiKey) return kirim(401, { error: 'API key tidak valid' });

      if (req.method === 'POST' && url.pathname === '/api/qris/create-amount') {
        if (!Number.isInteger(body.amount) || body.amount <= 0) return kirim(400, { error: 'amount tidak valid' });
        return kirim(200, {
          success: true,
          data: { qris_dynamic: '00020101021226' + body.amount, qr_image_url: gambarKecil, amount: body.amount, merchant_name: 'Toko Uji' }
        });
      }

      if (req.method === 'POST' && url.pathname === '/api/links') {
        if (!body.qris_account_id || !body.title || !Number.isInteger(body.amount)) return kirim(400, { error: 'data tidak lengkap' });
        const slug = crypto.randomBytes(8).toString('hex');
        links[slug] = { id: crypto.randomUUID(), slug, title: body.title, amount: body.amount, transaksi: null };
        return kirim(201, {
          data: { id: links[slug].id, slug, title: body.title, amount: body.amount, is_active: true, payment_url: 'http://localhost:' + portAwal() + '/pay/' + slug }
        });
      }

      const cocokStatus = url.pathname.match(/^\/api\/pay\/([^/]+)\/status$/);
      if (req.method === 'GET' && cocokStatus) {
        const link = links[cocokStatus[1]];
        if (!link) return kirim(404, { error: 'Link tidak ditemukan' });
        const t = link.transaksi;
        return kirim(200, {
          slug: link.slug,
          title: link.title,
          amount: link.amount,
          paid: Boolean(t && t.status === 'confirmed'),
          summary: {
            confirmed: t && t.status === 'confirmed' ? 1 : 0,
            pending: t && t.status === 'pending' ? 1 : 0,
            total: t ? 1 : 0
          },
          latest_transaction: t
        });
      }

      if (req.method === 'GET' && url.pathname === '/api/transactions') {
        const data = Object.values(links)
          .filter((link) => link.transaksi)
          .map((link) => ({ ...link.transaksi, link_id: link.id }));
        return kirim(200, { data, page: 1 });
      }

      kirim(404, { error: 'tidak ditemukan' });
    });
  });

  return server;
}

module.exports = buatMock;
