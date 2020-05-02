const Telegraf = require('telegraf');

const opts = {};

let bot = false;
let botToken = process.env.TBTKN;
if (botToken) {
  bot = new Telegraf(botToken, opts);
}

module.exports = bot;
