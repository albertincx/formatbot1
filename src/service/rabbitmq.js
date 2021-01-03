const amqp = require('amqplib');
const logger = require('../api/utils/logger');

const { FILESLAVE } = process.env;
const TASKS_CHANNEL = process.env.TASKS_DEV || 'tasks';

const TASKS2_CHANNEL = process.env.TASKS2_DEV || 'tasks2';
const TASKS3_CHANNEL = process.env.TASKSPUPPET_DEV || 'puppet';
const FILES_CHANNEL = process.env.FILESCHAN_DEV || 'files';
let rchannel = null;
const starts = {
  start: process.hrtime(),
  start2: process.hrtime(),
  start3: process.hrtime(),
};
let availableOne = true;

const getStartName = (q) => {
  let startName = 'start';
  switch (q) {
    case TASKS2_CHANNEL:
      startName = 'start2';
      break;
    case TASKS3_CHANNEL:
      startName = 'start3';
      break;
    default:
      break;
  }
  return startName;
};
const elapsedSec = (q) => {
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
const createChannel = async (queueName = TASKS_CHANNEL) => {
  let channel;
  try {
    const connection = await amqp.connect(process.env.MESSAGE_QUEUE);
    channel = await connection.createChannel();
    await channel.assertQueue(queueName, { durable: true });
  } catch (e) {
    logger(e);
  }
  rchannel = channel;
  return channel;
};

const run = async (job, qName) => {
  try {
    let queueName = qName;
    if (!queueName) {
      queueName = TASKS_CHANNEL;
    }
    if (FILESLAVE && queueName !== FILES_CHANNEL) {
      return;
    }
    const channel = await createChannel(queueName);
    await channel.prefetch(1);
    channel.consume(queueName, async (message) => {
      const content = message.content.toString();
      const task = JSON.parse(content);
      if (queueName !== TASKS_CHANNEL) task.q = queueName;
      await job(task);
      channel.ack(message);
    });
  } catch (e) {
    logger(e);
  }
};
const runSecond = (job) => run(job, TASKS2_CHANNEL);
const runPuppet = (job) => run(job, TASKS3_CHANNEL);

const keys = [
  process.env.TGPHTOKEN_0,
  process.env.TGPHTOKEN_1,
  process.env.TGPHTOKEN_2,
  process.env.TGPHTOKEN_3,
  process.env.TGPHTOKEN_4,
  process.env.TGPHTOKEN_5,
  process.env.TGPHTOKEN_6,
];
function shuffle(arr) {
  let currentIndex = arr.length; let temporaryValue; let
    randomIndex;

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
  const isPuppet = queueName === TASKS3_CHANNEL;
  let accessToken = getKey();
  if (queueName === TASKS2_CHANNEL) {
    accessToken = process.env.TGPHTOKEN2;
  }
  return {
    isPuppet,
    access_token: accessToken,
  };
};

const addToQueue = async (task, qName = TASKS_CHANNEL) => {
  if (rchannel) {
    let queueName = qName;
    const el = elapsedTime(queueName);
    const elTime = elapsedSec(queueName);
    logger(`availableOne ${availableOne}`);
    logger(`elTime ${elTime}`);
    if (queueName === TASKS_CHANNEL && !availableOne && elTime > 15) {
      queueName = chanSecond();
    }
    logger(el);
    await rchannel.sendToQueue(queueName,
      Buffer.from(JSON.stringify(task)), {
        contentType: 'application/json',
        persistent: true,
      });
  }
};
const addToQueueFile = async (task) => addToQueue(task, FILES_CHANNEL);
const isMain = (q) => !q || q === TASKS_CHANNEL;
const chanSecond = () => TASKS2_CHANNEL;
const chanPuppet = () => TASKS3_CHANNEL;

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

module.exports.createChannel = createChannel;
module.exports.addToQueue = addToQueue;
module.exports.addToQueueFile = addToQueueFile;
module.exports.runSecond = runSecond;
module.exports.runPuppet = runPuppet;

module.exports.isMain = isMain;
module.exports.chanSecond = chanSecond;
module.exports.chanPuppet = chanPuppet;
module.exports.getParams = getParams;
module.exports.time = time;
module.exports.run = run;
