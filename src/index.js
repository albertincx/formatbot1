Promise = require('bluebird'); // eslint-disable-line no-global-assign
const express = require('express');

const { NOBOT, PORT, blacklistFile } = require('./config/vars');
const mongoose = require('./config/mongoose');
const botroute = require('./api/routes/botroute');
const api = require('./api/routes/api');
const init = require('./cron');
const conn = mongoose.connect();
const app = express();
app.get('/', (req, res) => res.json({ code: 200 }));
app.use(api);
app.use('/mercury/get',
  (req, res) => {
    res.send('use telegram bot http://t.me/CorsaBot');
  });
let botHelper = null;
if (!NOBOT && process.env.TBTKN) {
  const botHelperConf = require('./config/bot');
  const { router, bot } = botroute(botHelperConf, conn);
  bot.setBlacklist(blacklistFile);
  botHelper = bot;
  app.use('/bot', router);
}

app.listen(PORT, () => console.info(`server started on port ${PORT}`));
if (botHelper) init(botHelper);
module.exports = app;
