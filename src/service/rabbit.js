const amqp = require('amqplib');
module.exports.start = async () => {
  let channel;
  try {
    const connection = await amqp.connect(process.env.MESSAGE_QUEUE);
    channel = await connection.createChannel();
    await channel.assertQueue('tasks', { durable: true });
  } catch (e) {
    console.log(e);
  }
  return channel;
};
