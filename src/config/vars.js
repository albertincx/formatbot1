const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv-safe');

const messages = require('../messages/format');

const envPath = path.join(__dirname, '../../.env');

const unableToStart = [];
const {env} = process;

const confFile = path.join(__dirname, '../../.conf');
if (!fs.existsSync(confFile)) fs.mkdirSync(confFile);

const docsDir = path.join(__dirname, '../../.docs');
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir);

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
const MQ_IS_OFF = env.NO_MQ === '1';
const RABBIT_MQ_QUEUE = !MQ_IS_OFF && env.MESSAGE_QUEUE;

if (RABBIT_MQ_QUEUE && (!env.TASKS_DEV || !env.TASKS2_DEV)) {
  unableToStart.push(messages.errorTasks());
}

if (unableToStart.length) {
  console.log(unableToStart.join('\n'));
  process.exit(0);
}
const BOT_IS_OFF = env.NO_BOT === '1';
const DB_IS_OFF = env.DB_DISABLED === '1';

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
  MONGO_URI: env.MONGO_URI,
  BLACK_LIST_FILE: blacklistFile,
  PUPPET_QUE: env.TASKSPUPPET_DEV || 'puppet',
  RABBIT_MQ_QUE: RABBIT_MQ_QUEUE,
  R_MQ_MAIN_CHANNEL: env.TASKS_DEV,
  R_MQ_SECOND_CHANNEL: env.TASKS2_DEV,
  BOT_USERNAME: env.BOT_USERNAME || '_no_username',
  WORKER: env.WORKER,
  NO_BOT: BOT_IS_OFF,
  IS_PUPPET_DISABLED: env.NO_PUPPET === '1',
  T_B_TKN: !BOT_IS_OFF && env.TBTKN,
  NO_MQ: MQ_IS_OFF,
  NO_DB: DB_IS_OFF,
  NO_PARSE: env.NO_PARSE === '1',
  IS_DEV: env.DEV,
  MONGO_URI_SECOND: env.MONGO_URI_SECOND,
  MONGO_URI_BROAD: env.MONGO_URI_BROAD,
  MONGO_URI_OLD: env.MONGO_URI_OLD,
  MONGO_URI_OLD_2: env.MONGO_URI_OLD_2,
  MONGO_COLL_LINKS: env.MONGO_COLL_LINKS,
  MONGO_COLL_I_LINKS: env.MONGO_COLL_ILINKS,
  REST_API: env.REST_API,
  HEADLESS: env.HDLSS,
  NODE_CRON: env.NODE_CRON,
  CRON_TASKS: env.CRON_TASKS,
  TG_ADMIN_ID: env.TGADMIN,
  TG_GROUP: env.TGGROUP,
  TG_BUGS_GROUP: env.TGGROUPBUGS,
  IV_MAKING_TIMEOUT: env.IV_MAKING_TIMEOUT,
  IV_CHAN_ID: Number(env.IV_CHAN_ID),
  IV_CHAN_MID: Number(env.IV_CHAN_MID),
  IV_CHAN_MID_2: Number(env.IV_CHAN_MID_2),
  HELP_MESSAGE: env.HELP_MESSAGE,
  DEV_USERNAME: env.DEV_USERNAME,
  docsDir,
};

// console.log(exportVars);

module.exports = exportVars;
