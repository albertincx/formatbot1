const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv-safe');
// test
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
  PORT: process.env.PORT || 4000,
  uploadDir: cacheFile,
  mongo: {
    uri: process.env.MONGO_URI,
  },
  blacklistFile,
};
