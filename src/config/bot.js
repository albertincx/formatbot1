const Telegraf = require('telegraf');

const botToken = process.env.TBTKN;
const bot = new Telegraf(botToken, {channelMode: true});

module.exports = bot;
