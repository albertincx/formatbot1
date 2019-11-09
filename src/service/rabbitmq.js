const amqp = require('amqplib');

const start = async (job) => {
  try {
    const connection = await amqp.connect(process.env.MESSAGE_QUEUE);

    const channel = await connection.createChannel();
    await channel.assertQueue('tasks', { durable: true });
    await channel.prefetch(1);
    channel.consume('tasks', async (message) => {
      const content = message.content.toString();
      const task = JSON.parse(content);
      if (task.chatId && job) {
        await job(task);
      }
      channel.ack(message);
    });
  } catch (e) {
    console.log(e);
  }
};
module.exports.start = start;
