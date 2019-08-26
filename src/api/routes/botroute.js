const express = require('express');

const BotHelper = require('../utils/bot');
const ha = require('./habr');

const router = express.Router();
const AL_ID = process.env.TGADMIN;
let startCnt = 0;
module.exports = (bot) => {
  const botHelper = new BotHelper(bot);
  ha(bot, botHelper);
  bot.on('/srv', msg => botHelper.sendAdmin(`link: ${JSON.stringify(msg)}`));
  bot.start();
  if ((startCnt % 10) === 0 || process.env.DEV) {
    botHelper.botMes(AL_ID, `started ${startCnt} times ` + `👍🏻`);
  }
  startCnt += 1;
  if (startCnt >= 500) {
    startCnt = 0;
  }
  return router;
};
