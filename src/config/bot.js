// test

const Telegraf = require('telegraf');

const opts = {};

const bot = new Telegraf(process.env.TBTKN, opts);
module.exports = bot;
