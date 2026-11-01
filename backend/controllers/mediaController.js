const mongoose = require('mongoose');
const Media = require('../models/Media');

async function tampilkanMedia(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).end();
  }
  const media = await Media.findById(req.params.id);
  if (!media) {
    return res.status(404).end();
  }
  res.setHeader('Content-Type', media.contentType);
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(media.data);
}

module.exports = { tampilkanMedia };
