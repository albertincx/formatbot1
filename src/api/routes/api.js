const fs = require('fs');
const express = require('express');

const get = async (req, res, next) => {
  const { file } = req.query;
  if (!file) {
    return res.json({ msg: 'no file' });
  }
  try {
    const l = `.conf/${file}`;
    if (fs.existsSync(l)) {
      res.send(`${fs.readFileSync(l)}`);
    }
  } catch (e) {
    next(e);
  }
};

const router = express.Router();
router.use('/file', get);

module.exports = router;
