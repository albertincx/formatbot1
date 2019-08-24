const express = require('express');
const mercury = require('./mercury/index');

const router = express.Router();
router.use('/get', mercury);

module.exports = router;
