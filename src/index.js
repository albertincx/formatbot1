Promise = require('bluebird'); // eslint-disable-line no-global-assign
const cors = require('cors');
const express = require('express');
<<<<<<< HEAD
const vars = require('./config/vars');
=======
const { NOBOT, PORT } = require('./config/vars');
>>>>>>> 93256cf33bd782082c910abb27f225e7ca8dc5af
const app = express();
const botroute = require('./api/routes/botroute');
const mercury = require('./api/routes/mercury');

<<<<<<< HEAD
const port = process.env.PORT || 5000;

=======
>>>>>>> 93256cf33bd782082c910abb27f225e7ca8dc5af
app.use(cors());
app.get('/', (req, res) => res.json({ code: 200 }));
app.use('/mercury', mercury);

<<<<<<< HEAD
if (!process.env.NOBOT) {
  // console.log('BOT START');
  const bot = require('./config/bot');
  app.use('/bot', botroute(bot));
}

app.listen(port, () => console.info(`server started on port ${port}`));
=======
if (!NOBOT) {
  const bot = require('./config/bot');
  app.use('/bot', botroute(bot));
}
app.listen(PORT, () => console.info(`server started on port ${PORT}`));
>>>>>>> 93256cf33bd782082c910abb27f225e7ca8dc5af

module.exports = app;
