require('trace-unhandled/register');

const botRoute = require('./api/routes/botroute');

const botInstance = require('./config/bot');
// const botInstance = require('./config/botTest');

const init = require('./cron');
const {logger} = require('./api/utils/logger');

const conn = require('./config/mongoose').connect();

if (botInstance) {
  const bh = botRoute(botInstance, conn);
  if(bh) {
    init(bh);
  }
  // Enable graceful stop
  process.once('SIGINT', () => {
    logger('bot stopped SIGINT');
    botInstance.stop('SIGINT');
  });
  process.once('SIGTERM', () => {
    logger('bot stopped SIGTERM');
    botInstance.stop('SIGTERM');
  });
}
