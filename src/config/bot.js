const {Telegraf} = require('telegraf');
const {T_B_TKN} = require('./vars');

const bot = T_B_TKN && new Telegraf(T_B_TKN);

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = bot;
