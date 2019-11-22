const amqp = require('amqplib');
const TASKS_CHANNEL = 'tasks';
const TASKS2_CHANNEL = 'tasks2';
let rchannel = null;
const createChannel = async (queueName = TASKS_CHANNEL) => {
  let channel;
  try {
    const connection = await amqp.connect(process.env.MESSAGE_QUEUE);
    channel = await connection.createChannel();
    await channel.assertQueue(queueName, { durable: true });
  } catch (e) {
    console.log(e);
  }
  rchannel = channel;
  return channel;
};

const run = async (job, queueName = TASKS_CHANNEL) => {
  try {
    const channel = await createChannel(queueName);
    await channel.prefetch(1);
    channel.consume(queueName, async (message) => {
      const content = message.content.toString();
      const task = JSON.parse(content);
      task.q = queueName;
      await job(task);
      channel.ack(message);
    });
  } catch (e) {
    console.log(e);
  }
};
const runSecond = job => run(job, TASKS2_CHANNEL);
const getSecond = () => TASKS2_CHANNEL;
const addToQueue = async (task, queueName = TASKS_CHANNEL) => {
  if (rchannel) {
    await rchannel.sendToQueue(queueName,
      Buffer.from(JSON.stringify(task)), {
        contentType: 'application/json',
        persistent: true,
      });
  }
};
module.exports.createChannel = createChannel;
module.exports.addToQueue = addToQueue;
module.exports.runSecond = runSecond;
module.exports.getSecond = getSecond;
module.exports.run = run;
