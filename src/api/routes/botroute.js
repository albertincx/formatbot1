const fs = require('fs');
const express = require('express');
const BotHelper = require('../utils/bot');
const format = require('./format');

const router = express.Router();
const filepath = 'count.txt';
if (!fs.existsSync(filepath)) fs.writeFileSync(filepath, 0);

let startCnt = parseInt(fs.readFileSync('count.txt'), 10);

module.exports = (bot) => {
  const botHelper = new BotHelper(bot.telegram);
  bot.command('config', ({ message }) => {
    if (botHelper.isAdmin(message.chat.id)) {
      botHelper.toggleConfig(message);
    }
  });
  bot.command('showconfig', ({ message, reply }) => {
    if (botHelper.isAdmin(message.chat.id)) {
      reply(JSON.stringify(botHelper.config));
    }
  });
  bot.command('srv', ({ message }) => {
    if (botHelper.isAdmin(message.chat.id)) {
      botHelper.sendAdmin(`srv: ${JSON.stringify(message)}`);
    }
  });

  format(bot, botHelper);
  bot.launch();

  if ((startCnt % 10) === 0 || process.env.DEV) {
    botHelper.sendAdmin(`started ${startCnt} times`);
  }
  startCnt += 1;
  if (startCnt >= 500) startCnt = 0;

  fs.writeFileSync(filepath, startCnt);
  return router;
};
