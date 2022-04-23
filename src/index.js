const express = require('express');
require('trace-unhandled/register');

const {PORT, blacklistFile} = require('./config/vars');
const botRoute = require('./api/routes/botroute');
const botInstance = require('./config/bot');
const api = require('./api/routes/api');
const conn = require('./config/mongoose').connect();
const app = express();

app.use(api);
if (process.env.TBTKN && botInstance) {
  const {bot} = botRoute(botInstance, conn);
  bot.setBlacklist(blacklistFile);
}

app.listen(PORT, () => console.info(`server started on port ${PORT}`));
module.exports = app;
