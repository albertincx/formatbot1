const Telegraf = require('telegraf');

const opts = {};

const bot = new Telegraf(process.env.TBTKNHABR, opts);
module.exports = bot;
