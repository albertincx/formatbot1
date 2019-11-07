const amqp = require('amqplib');
module.exports.start = async () => {
  const connection = await amqp.connect(process.env.MESSAGE_QUEUE);
  const channel = await connection.createChannel();
  await channel.assertQueue('tasks', { durable: true });
  return channel;
};
