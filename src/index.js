const express = require('express');

const {NOBOT, PORT, blacklistFile} = require('./config/vars');
const mongoose = require('./config/mongoose');
const botRoute = require('./api/routes/botroute');
const botInstance = require('./config/bot');

const conn = mongoose.connect();
const app = express();

if (!NOBOT && process.env.TBTKN && botInstance) {
  const {router, bot} = botRoute(botInstance, conn);
  bot.setBlacklist(blacklistFile);
  app.use('/bot', router);
}

app.listen(PORT, () => console.info(`server started on port ${PORT}`));
module.exports = app;
