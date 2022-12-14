// const express = require('express');
require('trace-unhandled/register');

const {blacklistFile} = require('./config/vars');
const botRoute = require('./api/routes/botroute');
const botInstance = require('./config/bot');
const conn = require('./config/mongoose').connect();

if (process.env.TBTKN && botInstance) {
  const {bot} = botRoute(botInstance, conn);
  bot.setBlacklist(blacklistFile);
}
console.info('started');
