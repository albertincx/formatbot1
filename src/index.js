require('trace-unhandled/register');

const botRoute = require('./api/routes/botroute');

const botInstance = require('./config/bot');
// const botInstance = require('./config/botTest');

const init = require('./cron');

const conn = require('./config/mongoose').connect();

if (botInstance) {
  const bh = botRoute(botInstance, conn);
  if(bh) {
    init(bh);
  }
}
