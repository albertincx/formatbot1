const amqp = require('amqplib');
const {logger} = require('../api/utils/logger');
const messages = require('../messages/format');

const {
  PUPPET_QUE,
  RABBIT_MQ_QUE,
  R_MQ_MAIN_CHANNEL,
  R_MQ_SECOND_CHANNEL,
  WORKER,
  TG_PH_TOKEN2,
} = require('../config/vars');
const {parseEnvArray} = require('../api/utils');

const TASKS_CHANNEL = R_MQ_MAIN_CHANNEL;

let rChannel = null;

const starts = {
  start: process.hrtime(),
  start2: process.hrtime(),
  start3: process.hrtime(),
};
let availableOne = true;

const getStartName = q => {
  let startName = 'start';
  switch (q) {
    case R_MQ_SECOND_CHANNEL:
      startName = 'start2';
      break;
    case PUPPET_QUE:
      startName = 'start3';
      break;
    default:
      break;
  }
  return startName;
};
const elapsedSec = q => {
  const startName = getStartName(q);
  logger(startName);
  return process.hrtime(starts[startName])[0];
};

const elapsedTime = (q = TASKS_CHANNEL) => {
  const startName = getStartName(q);
  let elapsed = process.hrtime(starts[startName])[1] / 1000000;
  elapsed = `${process.hrtime(starts[startName])[0]}s, ${elapsed.toFixed(0)}`;
  return `${elapsed}ms ${q}`;
};

const resetTime = (q = TASKS_CHANNEL) => {
  const startName = getStartName(q);
  logger(`reset ${startName}`);
  starts[startName] = process.hrtime();
};

let connection = null;

const startFirst = async () => {
  if (!RABBIT_MQ_QUE) {
    console.log(messages.warningMQ());
    return;
  }

  try {
    if (!connection) {
      connection = await amqp.connect(RABBIT_MQ_QUE);
    }
    if (!rChannel) {
      rChannel = await connection.createChannel();
    }
  } catch (e) {
    console.log('err rabbit');
    logger(e);
  }
};

const createChan = async (queueName = TASKS_CHANNEL) => {
  let channel;

  if (!RABBIT_MQ_QUE) {
    console.log(messages.warningMQ());
    return undefined;
  }
  try {
    if (!connection) {
      connection = await amqp.connect(RABBIT_MQ_QUE);
    }
    channel = await connection.createChannel();
    await channel.prefetch(1);
    await channel.assertQueue(queueName, {durable: true});
  } catch (e) {
    console.log('err rabbit');
    logger(e);
  }

  return channel;
};

const runMqChannel = async (job, qName) => {
  try {
    const queueName = qName;
    if (!queueName) {
      console.log('rabbit MQ channelName is not defined');
      return;
    }
    const channel = await createChan(queueName);
    if (!channel) return;
    // eslint-disable-next-line no-param-reassign
    job.isClosed = false;
    channel.consume(queueName, message => {
      if (message) {
        const {content} = message;
        const task = JSON.parse(`${content}`);
        if (queueName !== TASKS_CHANNEL) {
          task.q = queueName;
        }
        job(task)
          .then(() => {
            channel.ack(message);
          })
          .catch(e => {
            console.log('error job task');
            console.log(e);
            channel.ack(message);
          });
      }
    });
  } catch (e) {
    console.log('err rabbit job');
    logger(e);
  }
};

const runMqChannels = job => {
  if (!RABBIT_MQ_QUE) {
    console.log(messages.warningMQ());
    return;
  }
  setTimeout(() => {
    runMqChannel(job, R_MQ_MAIN_CHANNEL);
    if (R_MQ_SECOND_CHANNEL) {
      runMqChannel(job, R_MQ_SECOND_CHANNEL);
    }

    if (PUPPET_QUE) {
      runMqChannel(job, PUPPET_QUE);
    }
  }, 5000);
};

const keys = parseEnvArray('TGPHTOKEN');

function shuffle(arr) {
  let currentIndex = arr.length;
  let temporaryValue;
  let randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = arr[currentIndex];
    // eslint-disable-next-line no-param-reassign
    arr[currentIndex] = arr[randomIndex];
    // eslint-disable-next-line no-param-reassign
    arr[randomIndex] = temporaryValue;
  }

  return arr;
}

function getKey() {
  const h = new Date().getHours();
  const keys1 = shuffle(keys);
  return keys1.find((k, i) => h <= (24 / keys.length) * (i + 1)) || keys[0];
}

const getMqParams = (queueName = TASKS_CHANNEL) => {
  const isPuppet = queueName === PUPPET_QUE;
  let accessToken = getKey();
  if (queueName === R_MQ_SECOND_CHANNEL) {
    accessToken = TG_PH_TOKEN2;
  }
  return {
    isPuppet,
    access_token: accessToken,
  };
};

const addToChannel = (taskParams, qName = TASKS_CHANNEL) => {
  if (rChannel) {
    try {
      let queueName = qName;
      const el = elapsedTime(queueName);
      const elTime = elapsedSec(queueName);
      logger('');
      logger(`availableOne ${availableOne}`);
      logger(`elTime ${elTime}`);
      if (queueName === TASKS_CHANNEL && !availableOne && elTime > 15) {
        queueName = R_MQ_SECOND_CHANNEL;
      }
      logger(el);
      const task = {...taskParams, ...(WORKER ? {w: 1} : {})};

      rChannel.sendToQueue(queueName, Buffer.from(JSON.stringify(task)), {
        contentType: 'application/json',
        persistent: true,
      });
    } catch (e) {
      console.log(e);
    }
  }
};
const time = (queueName = TASKS_CHANNEL, start = false) => {
  if (queueName === TASKS_CHANNEL) {
    availableOne = !start;
  }
  const t = elapsedTime(queueName);
  if (start) {
    resetTime(queueName);
  }
  return t;
};
const timeStart = q => time(q, true);

module.exports.startFirst = startFirst;
module.exports.addToChannel = addToChannel;
module.exports.getMqParams = getMqParams;
module.exports.time = time;
module.exports.runMqChannels = runMqChannels;
module.exports.timeStart = timeStart;
