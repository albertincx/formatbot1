const Telegraf = require('telegraf');

const opts = {};
const SocksAgent = require('socks5-https-client/lib/Agent');
const socksAgent = new SocksAgent({
  socksHost: process.env.SOCKS_HOST,
  socksPort: process.env.SOCKS_PORT,
});
opts.telegram = { agent: socksAgent };

let bot = false;
let botToken = process.env.TBTKN;
if (botToken) {
  bot = new Telegraf(botToken, opts);
}

module.exports = bot;
