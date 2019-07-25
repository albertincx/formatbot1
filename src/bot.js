Promise = require('bluebird'); // eslint-disable-line no-global-assign
const express = require('express');
const { port, env } = require('./config/vars');
const app = express();
const botroute = require('./api/routes/botroute');
const cors = require('cors');
const bot = require('./config/bot');

app.use(cors());
app.use('/bot', botroute(bot));
app.listen(port, () => console.info(`server started on port ${port} (${env})`));
module.exports = app;
