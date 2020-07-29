const fs = require('fs');
const express = require('express');
const BotHelper = require('../utils/bot');
const format = require('./format');
const db = require('../utils/db');

const router = express.Router();
const filepath = 'count.txt';
if (!fs.existsSync(filepath)) fs.writeFileSync(filepath, 0);

let startCnt = parseInt(fs.readFileSync('count.txt'), 10);

module.exports = (bot, conn) => {
  const botHelper = new BotHelper(bot.telegram);
  if (conn) conn.on('error', (err) => {
    botHelper.disDb();
  });
  bot.command('config', ({ message }) => {
    if (botHelper.isAdmin(message.chat.id)) {
      botHelper.toggleConfig(message);
    }
  });

  bot.command('cconfig', ({ message }) => {
    if (botHelper.isAdmin(message.chat.id)) {
      botHelper.togglecConfig(message);
    }
  });

  bot.command('showconfig', ({ message, reply }) => {
    if (botHelper.isAdmin(message.chat.id)) {
      let c = JSON.stringify(botHelper.config);
      c = `${c} db ${botHelper.db}`;
      reply(c).catch(e => botHelper.sendError(e));
    }
  });

  bot.command('stat', ({ message, reply }) => {
    if (botHelper.isAdmin(message.chat.id)) {
      db.stat().then(r => reply(r).catch(e => botHelper.sendError(e)));
    }
  });

  bot.command('cleardb', ({ message, reply }) => {
    if (botHelper.isAdmin(message.chat.id)) {
      return db.clear(message).then(r => reply(r).catch(e => botHelper.sendError(e)));
    }
  });

  bot.command('srv', ({ message }) => {
    if (botHelper.isAdmin(message.from.id)) {
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
  return { router, bot: botHelper };
};
