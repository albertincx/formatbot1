require('trace-unhandled/register');

const botRoute = require('./api/routes/botroute');
const botInstance = require('./config/bot');
const {MONGO_URI} = require('./config/vars');
// const botInstance = require('./config/botTest');
const conn = require('./config/mongoose').createConnection(MONGO_URI);

if (botInstance) {
  botRoute(botInstance, conn);
}
