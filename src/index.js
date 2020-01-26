Promise = require('bluebird'); // eslint-disable-line no-global-assign
const express = require('express');

const { NOBOT, PORT } = require('./config/vars');
const mongoose = require('./config/mongoose');
const botroute = require('./api/routes/botroute');
const api = require('./api/routes/api');

const conn = mongoose.connect();
const app = express();
app.get('/', (req, res) => res.json({ code: 200 }));
app.use(api);
app.use('/mercury/get',
    (req, res) => {
      res.send('use telegram bot http://t.me/CorsaBot');
    });

if (!NOBOT) {
  const bot = require('./config/bot');
  app.use('/bot', botroute(bot, conn));
}

app.listen(PORT, () => console.info(`server started on port ${PORT}`));

module.exports = app;
