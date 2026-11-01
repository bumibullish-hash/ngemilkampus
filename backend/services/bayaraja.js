function buatError(pesan, status) {
  const error = new Error(pesan);
  error.status = status || 502;
  error.expose = true;
  return error;
}

function ambilPesan(data, status) {
  if (data && typeof data.error === 'string') return data.error;
  if (data && data.error) return JSON.stringify(data.error);
  if (data && typeof data.message === 'string') return data.message;
  return 'Bayaraja membalas dengan status ' + status;
}

async function kirim(method, path, body) {
  const baseUrl = (process.env.BAYARAJA_BASE_URL || '').replace(/\/+$/, '');
  const apiKey = process.env.BAYARAJA_API_KEY;
  if (!baseUrl || !apiKey) {
    throw buatError('Konfigurasi Bayaraja belum lengkap. Periksa BAYARAJA_BASE_URL dan BAYARAJA_API_KEY di file .env', 503);
  }

  let response;
  try {
    response = await fetch(baseUrl + path, {
      method,
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000)
    });
  } catch (error) {
    throw buatError('Tidak dapat terhubung ke Bayaraja. Periksa koneksi internet dan BAYARAJA_BASE_URL di file .env');
  }

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (data === null) {
    throw buatError('Alamat Bayaraja tidak mengembalikan data JSON. Periksa BAYARAJA_BASE_URL di file .env');
  }
  if (response.status === 401) {
    throw buatError('API Key Bayaraja tidak valid atau sudah dinonaktifkan');
  }
  if (!response.ok) {
    throw buatError(ambilPesan(data, response.status));
  }
  return data;
}

async function createDynamicQris(amount) {
  const body = { amount };
  if (process.env.BAYARAJA_QRIS_ACCOUNT_ID) {
    body.qris_account_id = process.env.BAYARAJA_QRIS_ACCOUNT_ID;
  }
  const hasil = await kirim('POST', '/api/qris/create-amount', body);
  return hasil.data || {};
}

async function createPaymentLink({ title, amount, description, expiresAt }) {
  if (!process.env.BAYARAJA_QRIS_ACCOUNT_ID) {
    throw buatError('BAYARAJA_QRIS_ACCOUNT_ID belum diisi di file .env', 503);
  }
  const hasil = await kirim('POST', '/api/links', {
    qris_account_id: process.env.BAYARAJA_QRIS_ACCOUNT_ID,
    title,
    amount,
    description,
    is_single_use: true,
    expires_at: expiresAt.toISOString()
  });
  return hasil.data || {};
}

async function getLinkStatus(slug) {
  return kirim('GET', '/api/pay/' + encodeURIComponent(slug) + '/status');
}

async function getTransactions(params) {
  const query = new URLSearchParams();
  Object.keys(params || {}).forEach((nama) => {
    if (params[nama] !== undefined && params[nama] !== '') {
      query.set(nama, params[nama]);
    }
  });
  return kirim('GET', '/api/transactions?' + query.toString());
}

async function listQrisAccounts() {
  return kirim('GET', '/api/qris');
}

module.exports = {
  createDynamicQris,
  createPaymentLink,
  getLinkStatus,
  getTransactions,
  listQrisAccounts
};
