const express = require('express');
const mercury = require('../../controllers/mercury.controller');

const router = express.Router();

router.route('/').get(mercury.get);
module.exports = router;
