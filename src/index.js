Promise = require('bluebird'); // eslint-disable-line no-global-assign
const cors = require('cors');
const express = require('express');
const { NOBOT, PORT } = require('./config/vars');
const app = express();
const botroute = require('./api/routes/botroute');
const mercury = require('./api/routes/mercury');

app.use(cors());
app.get('/', (req, res) => res.json({ code: 200 }));
app.use('/mercury', mercury);

if (!NOBOT) {
  const bot = require('./config/bot');
  app.use('/bot', botroute(bot));
}
app.listen(PORT, () => console.info(`server started on port ${PORT}`));

module.exports = app;
