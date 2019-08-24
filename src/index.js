Promise = require('bluebird'); // eslint-disable-line no-global-assign
const cors = require('cors');
const express = require('express');

const app = express();
const botroute = require('./api/routes/botroute');
const mercury = require('./api/routes/mercury');
const bot = require('./config/bot');

const port = process.env.PORT || 5000;

app.use(cors());
app.get('/', (req, res) => res.json({ code: 200 }));
app.use('/mercury', mercury);
app.use('/bot', botroute(bot));
app.listen(port, () => console.info(`server started on port ${port}`));

module.exports = app;
