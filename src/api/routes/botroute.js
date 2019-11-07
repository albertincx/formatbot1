const fs = require('fs');
const express = require('express');
<<<<<<< HEAD

=======
>>>>>>> 93256cf33bd782082c910abb27f225e7ca8dc5af
const BotHelper = require('../utils/bot');
const format = require('./format');

const router = express.Router();
<<<<<<< HEAD
const AL_ID = process.env.TGADMIN;
const filepath = 'count.txt';
if (!fs.existsSync(filepath)) {
  fs.writeFileSync(filepath, 0);
}
let startCnt = parseInt(fs.readFileSync('count.txt'));
module.exports = (bot) => {
  const botHelper = new BotHelper(bot);
  format(bot, botHelper);
  bot.on('/srv', msg => botHelper.sendAdmin(`link: ${JSON.stringify(msg)}`));
  bot.start();
  if ((startCnt % 10) === 0 || process.env.DEV) {
    botHelper.botMes(AL_ID, `started ${startCnt} times ` + `👍🏻`);
  }
  startCnt += 1;
  if (startCnt >= 500) {
    startCnt = 0;
  }
  fs.writeFileSync(filepath, startCnt);
  bot.on('/toggletelegraph', msg => botHelper.toggleConfig('telegraph', msg));
=======
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
>>>>>>> 93256cf33bd782082c910abb27f225e7ca8dc5af
  return router;
};
