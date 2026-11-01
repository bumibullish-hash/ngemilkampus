function buatKlien(baseUrl) {
  let cookie = '';

  async function kirim(method, path, body, opsi = {}) {
    const headers = {};
    if (cookie) headers.cookie = cookie;
    let isi;
    if (body instanceof FormData) {
      isi = body;
    } else if (body !== undefined) {
      headers['content-type'] = 'application/json';
      isi = JSON.stringify(body);
    }
    const respons = await fetch(baseUrl + path, { method, headers, body: isi, redirect: 'manual' });
    respons.headers.getSetCookie().forEach((item) => {
      const pertama = item.split(';')[0];
      if (pertama.startsWith('token=')) cookie = pertama === 'token=' ? '' : pertama;
    });
    const tipe = respons.headers.get('content-type') || '';
    let data;
    if (tipe.includes('json')) data = await respons.json();
    else if (opsi.biner) data = Buffer.from(await respons.arrayBuffer());
    else data = await respons.text();
    return { status: respons.status, data, headers: respons.headers };
  }

  return {
    get: (path, opsi) => kirim('GET', path, undefined, opsi),
    post: (path, body) => kirim('POST', path, body === undefined ? {} : body),
    put: (path, body) => kirim('PUT', path, body),
    patch: (path, body) => kirim('PATCH', path, body === undefined ? {} : body),
    delete: (path) => kirim('DELETE', path),
    kirimForm: (method, path, form) => kirim(method, path, form),
    adaCookie: () => cookie !== ''
  };
}

function formProduk(data, adaFoto) {
  const form = new FormData();
  Object.keys(data).forEach((kunci) => form.append(kunci, String(data[kunci])));
  if (adaFoto) {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    form.append('image', new Blob([png], { type: 'image/png' }), 'foto.png');
  }
  return form;
}

function waktuAmbil(menit) {
  const tanggal = new Date(Date.now() + menit * 60 * 1000 + 7 * 60 * 60 * 1000);
  return tanggal.toISOString().slice(0, 16);
}

module.exports = { buatKlien, formProduk, waktuAmbil };
