const {Telegraf} = require('telegraf');
const {T_B_TKN} = require('./vars');

const bot = T_B_TKN && new Telegraf(T_B_TKN);

module.exports = bot;
