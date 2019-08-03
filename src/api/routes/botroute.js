const express = require('express');

const BotHelper = require('../utils/bot');
const ha = require('./habr');

const router = express.Router();
const AL_ID = process.env.TGADMIN;

module.exports = (bot) => {
  const botHelper = new BotHelper(bot);
  ha(bot, botHelper);
  bot.on('/srv', msg => msg.reply.text(JSON.stringify(msg)));
  bot.start();
  botHelper.botMes(AL_ID, 'started');
  return router;
};
