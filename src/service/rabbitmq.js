const amqp = require('amqplib');
const logger = require('../api/utils/logger');
const messages = require('../messages/format');

const {puppetQue, rabbitMQ, rqTasks, rqTasks2} = require('../config/vars');

const TASKS_CHANNEL = rqTasks;

let rchannel = null;

const starts = {
  start: process.hrtime(),
  start2: process.hrtime(),
  start3: process.hrtime(),
};
let availableOne = true;

const getStartName = q => {
  let startName = 'start';
  switch (q) {
    case rqTasks2:
      startName = 'start2';
      break;
    case puppetQue:
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
  if (!rabbitMQ) {
    console.log(messages.warningMQ());
    return;
  }

  try {
    if (!connection) {
      connection = await amqp.connect(rabbitMQ);
    }
    if (!rchannel) {
      rchannel = await connection.createChannel();
    }
  } catch (e) {
    console.log('err rabbit');
    logger(e);
  }
};

const createChan = async (queueName = TASKS_CHANNEL) => {
  let channel;

  if (!rabbitMQ) {
    console.log(messages.warningMQ());
    return undefined;
  }
  try {
    if (!connection) {
      connection = await amqp.connect(rabbitMQ);
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
      console.log('rabbitMq channelName is not defined');
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
  if (!rabbitMQ) {
    console.log(messages.warningMQ());
    return;
  }
  setTimeout(() => {
    runMqChannel(job, rqTasks);
    if (rqTasks2) {
      runMqChannel(job, rqTasks2);
    }

    if (puppetQue) {
      runMqChannel(job, puppetQue);
    }
  }, 5000);
};

const keys = [process.env.TGPHTOKEN_0];

for (let i = 1; i < 10; i += 1) {
  if (process.env[`TGPHTOKEN_${i}`]) {
    keys.push(process.env[`TGPHTOKEN_${i}`]);
  }
}

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

const getParams = (queueName = TASKS_CHANNEL) => {
  const isPuppet = queueName === puppetQue;
  let accessToken = getKey();
  if (queueName === rqTasks2) {
    accessToken = process.env.TGPHTOKEN2;
  }
  return {
    isPuppet,
    access_token: accessToken,
  };
};

const addToQueue = (task, qName = TASKS_CHANNEL) => {
  if (rchannel) {
    try {
      let queueName = qName;
      const el = elapsedTime(queueName);
      const elTime = elapsedSec(queueName);
      logger('');
      logger(`availableOne ${availableOne}`);
      logger(`elTime ${elTime}`);
      if (queueName === TASKS_CHANNEL && !availableOne && elTime > 15) {
        queueName = rqTasks2;
      }
      logger(el);
      rchannel.sendToQueue(queueName, Buffer.from(JSON.stringify(task)), {
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
module.exports.addToQueue = addToQueue;
module.exports.getParams = getParams;
module.exports.time = time;
module.exports.runMqChannels = runMqChannels;
module.exports.timeStart = timeStart;
