const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv-safe');

const messages = require('../messages/format');

const envPath = path.join(__dirname, '../../.env');

const unableToStart = [];

const confFile = path.join(__dirname, '../../.conf');

if (!fs.existsSync(confFile)) fs.mkdirSync(confFile);

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
const MQ_IS_OFF = process.env.NO_MQ === '1';
const RABBIT_MQ_QUEUE = !MQ_IS_OFF && process.env.MESSAGE_QUEUE;

if (RABBIT_MQ_QUEUE && (!process.env.TASKS_DEV || !process.env.TASKS2_DEV)) {
  unableToStart.push(messages.errorTasks());
}

if (unableToStart.length) {
  console.log(unableToStart.join('\n'));
  process.exit(0);
}
const BOT_IS_OFF = process.env.NO_BOT === '1';
const DB_IS_OFF = process.env.DB_DISABLED === '1';

if (BOT_IS_OFF) {
  console.log('bot is off');
}
if (MQ_IS_OFF) {
  console.log('rabbit mq is off');
}
if (DB_IS_OFF) {
  console.log('DB_IS_OFF');
}
const exportVars = {
  MONGO_URI: process.env.MONGO_URI,
  BLACK_LIST_FILE: blacklistFile,
  PUPPET_QUE: process.env.TASKSPUPPET_DEV || 'puppet',
  RABBIT_MQ_QUE: RABBIT_MQ_QUEUE,
  R_MQ_MAIN_CHANNEL: process.env.TASKS_DEV,
  R_MQ_SECOND_CHANNEL: process.env.TASKS2_DEV,
  BOT_USERNAME: process.env.BOT_USERNAME || '_no_username',
  WORKER: process.env.WORKER,
  NO_BOT: BOT_IS_OFF,
  IS_PUPPET_DISABLED: process.env.NO_PUPPET === '1',
  T_B_TKN: !BOT_IS_OFF && process.env.TBTKN,
  NO_MQ: MQ_IS_OFF,
  NO_DB: DB_IS_OFF,
  NO_PARSE: process.env.NO_PARSE === '1',
  IS_DEV: process.env.DEV,
  MONGO_URI_SECOND: process.env.MONGO_URI_SECOND,
  MONGO_URI_BROAD: process.env.MONGO_URI_BROAD,
  MONGO_URI_OLD: process.env.MONGO_URI_OLD,
  MONGO_COLL_LINKS: process.env.MONGO_COLL_LINKS,
  MONGO_COLL_I_LINKS: process.env.MONGO_COLL_ILINKS,
  REST_API: process.env.REST_API,
  HEADLESS: process.env.HDLSS,
  NODE_CRON: process.env.NODE_CRON,
  CRON_TASKS: process.env.CRON_TASKS,
  TG_ADMIN_ID: process.env.TGADMIN,
  TG_GROUP: process.env.TGGROUP,
  TG_BUGS_GROUP: process.env.TGGROUPBUGS,
  IV_MAKING_TIMEOUT: process.env.IV_MAKING_TIMEOUT,
  IV_CHAN_ID: Number(process.env.IV_CHAN_ID),
  IV_CHAN_MID: Number(process.env.IV_CHAN_MID),
  IV_CHAN_MID_2: Number(process.env.IV_CHAN_MID_2),
  USER_IDS: process.env.USERIDS,
  HELP_MESSAGE: process.env.HELP_MESSAGE,
  TG_PH_TOKEN2: process.env.TGPHTOKEN2,
};

// logger(exportVars);

module.exports = exportVars;
