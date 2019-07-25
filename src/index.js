Promise = require('bluebird'); // eslint-disable-line no-global-assign
const express = require('express');
const app = express();
const botroute = require('./api/routes/botroute');
const cors = require('cors');
const bot = require('./config/bot');
const port = process.env.PORT || 5000;
app.use(cors());
app.get('/', (req, res) => res.json({ code: 200 }));
app.use('/bot', botroute(bot));
app.listen(port, () => console.info(`server started on port ${port}`));
module.exports = app;
