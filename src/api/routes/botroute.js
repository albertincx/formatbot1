const express = require('express');
const BotHelper = require('../utils/bot');
const router = express.Router();
const AL_ID = process.env.TGADMIN;
module.exports = (bot) => {
  const botHelper = new BotHelper(bot);
  const ha = require('./habr');
  ha(bot, botHelper);
  bot.on('/srv', msg => botHelper.sendAdmin(`link: ${JSON.stringify(msg)}`));
  bot.start();
  botHelper.botMes(AL_ID, 'started');
  return router;
};
