Promise = require('bluebird'); // eslint-disable-line no-global-assign
const express = require('express');

const { NOBOT, PORT } = require('./config/vars');
const botroute = require('./api/routes/botroute');

const app = express();
app.get('/', (req, res) => res.json({ code: 200 }));
app.use('/mercury/get', (req, res) => res.send('use telegram bot http://t.me/CorsaBot'));

if (!NOBOT) {
  const bot = require('./config/bot');
  app.use('/bot', botroute(bot));
}
app.listen(PORT, () => console.info(`server started on port ${PORT}`));

module.exports = app;
