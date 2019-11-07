const fs = require('fs');
const express = require('express');
const BotHelper = require('../utils/bot');
const format = require('./format');

const router = express.Router();
const filepath = 'count.txt';
if (!fs.existsSync(filepath)) fs.writeFileSync(filepath, 0);

let startCnt = parseInt(fs.readFileSync('count.txt'), 10);

module.exports = (bot) => {
  const botHelper = new BotHelper(bot);

  format(bot, botHelper);
  bot.on('/srv', msg => botHelper.sendAdmin(`link: ${JSON.stringify(msg)}`));
  bot.start();

  if ((startCnt % 10) === 0 || process.env.DEV) {
    botHelper.sendAdmin(`started ${startCnt} times`);
  }
  startCnt += 1;
  if (startCnt >= 500) startCnt = 0;

  fs.writeFileSync(filepath, startCnt);
  return router;
};
