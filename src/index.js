const express = require('express');

const {NOBOT, PORT, blacklistFile} = require('./config/vars');
const mongoose = require('./config/mongoose');
const botroute = require('./api/routes/botroute');
const api = require('./api/routes/api');
const botInstance = require('./config/bot');

const conn = mongoose.connect();
const app = express();

app.use(api);
if (!NOBOT && process.env.TBTKN && botInstance) {
  const {router, bot} = botroute(botInstance, conn);
  bot.setBlacklist(blacklistFile);
  app.use('/bot', router);
}

app.listen(PORT, () => console.info(`server started on port ${PORT}`));
module.exports = app;
