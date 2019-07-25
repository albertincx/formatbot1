Promise = require('bluebird'); // eslint-disable-line no-global-assign
const express = require('express');
const cors = require('cors');

const botroute = require('./src/api/routes/botroute');
const bot = require('./src/config/bot');

const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use('/bot', botroute(bot));
app.listen(port, () => console.info(`server started on port ${port}`));
module.exports = app;
