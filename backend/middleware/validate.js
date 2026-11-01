const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const hasil = validationResult(req);
  if (hasil.isEmpty()) {
    return next();
  }
  const errors = {};
  hasil.array().forEach((item) => {
    if (!errors[item.path]) {
      errors[item.path] = item.msg;
    }
  });
  res.status(400).json({ message: Object.values(errors)[0], errors });
}

module.exports = validate;
