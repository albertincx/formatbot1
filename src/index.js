require('trace-unhandled/register');

const botRoute = require('./api/routes/botroute');
const botInstance = require('./config/bot');
// const botInstance = require('./config/botTest');
const conn = require('./config/mongoose').connect();

if (botInstance) {
  botRoute(botInstance, conn);
}

console.info('Format bot is started');
