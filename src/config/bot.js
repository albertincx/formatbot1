const Telegraf = require('telegraf');

const opts = {channelMode: true};

let bot = false;
const botToken = process.env.TBTKN;
if (botToken) {
  bot = new Telegraf(botToken, opts);
}

module.exports = bot;
