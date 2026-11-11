const botRoute = require('./api/routes/botroute');

const botInstance = require('./config/bot');
// const botInstance = require('./config/botTest');

const init = require('./cron');
const {logger} = require('./api/utils/logger');
const puppet = require('./api/utils/puppet');

const conn = require('./config/mongoose');

if (botInstance) {
  const bh = botRoute(botInstance, conn.connect());
  if (bh) {
    init(bh);
  }
  const gracefulStop = async (signal) => {
    logger(`bot stopped ${signal}`);
    botInstance.stop(signal);
    await puppet.closeBrowser().catch(() => {});
  };
  // Enable graceful stop
  process.once('SIGINT', () => gracefulStop('SIGINT'));
  process.once('SIGTERM', () => gracefulStop('SIGTERM'));
}
