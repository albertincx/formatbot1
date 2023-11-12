const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv-safe');

const messages = require('../messages/format');

const envPath = path.join(__dirname, '../../.env');

const unableToStart = [];

const confFile = path.join(__dirname, '../../.conf');
const cacheFile = path.join(__dirname, '../../.cache');

if (!fs.existsSync(confFile)) fs.mkdirSync(confFile);
if (!fs.existsSync(cacheFile)) fs.mkdirSync(cacheFile);

const blacklistFile = path.join(__dirname, '../../.conf/blacklist.txt');

if (!fs.existsSync(blacklistFile)) {
  fs.writeFileSync(`${confFile}/blacklist.txt`, '');
}

dotenv.config({
  allowEmptyValues: true,
  path: envPath,
  sample: path.join(__dirname, '../../.env.example'),
});

if (!fs.existsSync(envPath)) {
  unableToStart.push(messages.errorEnv());
}

if (
  process.env.MESSAGE_QUEUE &&
  (!process.env.TASKS_DEV || !process.env.TASKS2_DEV)
) {
  unableToStart.push(messages.errorTasks());
}

if (unableToStart.length) {
  console.log(unableToStart.join('\n'));
  process.exit(0);
}

module.exports = {
  root: path.join(__dirname, '/../../'),
  uploadDir: cacheFile,
  mongo: {
    uri: process.env.MONGO_URI,
    disabled: process.env.DB_DISABLED === '1',
  },
  blacklistFile,
  puppetQue: process.env.TASKSPUPPET_DEV || 'puppet',
  rabbitMQ: process.env.MESSAGE_QUEUE,
  rqTasks: process.env.TASKS_DEV,
  rqTasks2: process.env.TASKS2_DEV,
  BOT_USERNAME: process.env.BOT_USERNAME || '_no_username',
};
