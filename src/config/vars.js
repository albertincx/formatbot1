const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv-safe');

const envPath = path.join(__dirname, '../../.env');

const confFile = path.join(__dirname, '../../.conf');
const cacheFile = path.join(__dirname, '../../.cache');
if (!fs.existsSync(confFile)) fs.mkdirSync(confFile);
if (!fs.existsSync(cacheFile)) fs.mkdirSync(cacheFile);

const blacklistFile = path.join(__dirname, '../../.conf/blacklist.txt');
if (!fs.existsSync(blacklistFile)) {
  fs.writeFileSync(`${confFile}/blacklist.txt`, '');
}

if (fs.existsSync(envPath)) {
  dotenv.config({
    allowEmptyValues: true,
    path: envPath,
    sample: path.join(__dirname, '../../.env.example'),
  });
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
  BOT_USERNAME: process.env.BOT_USERNAME || '_no_username',
};
