const {Telegraf} = require('telegraf');

const botToken = process.env.TBTKN;
const bot = new Telegraf(botToken);
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = bot;
