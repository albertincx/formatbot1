const amqp = require('amqplib');
const {logger} = require('../api/utils/logger');
const messages = require('../messages/format');

const {
    PUPPET_QUE,
    RABBIT_MQ_QUE,
    R_MQ_MAIN_CHANNEL,
    R_MQ_SECOND_CHANNEL,
    WORKER,
} = require('../config/vars');
const {parseEnvArray} = require('../api/utils');

const TASKS_CHANNEL = R_MQ_MAIN_CHANNEL;

let rChannel = null;
let connection = null;
let isConnecting = false;
let registeredJob = null; // Сохраняем job для переподписки при реконнекте

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

// Функция для установки соединения с автореконнектом
const connectRabbit = async () => {
    if (!RABBIT_MQ_QUE) {
        console.log(messages.warningMQ());
        return null;
    }
    if (connection) return connection;
    if (isConnecting) return null;

    isConnecting = true;
    try {
        connection = await amqp.connect(RABBIT_MQ_QUE);
        isConnecting = false;
        console.log('RabbitMQ connected successfully');

        connection.on('error', (err) => {
            logger('RabbitMQ connection error: ' + err.message);
        });

        connection.on('close', () => {
            console.log('RabbitMQ connection closed. Reconnecting in 5s...');
            connection = null;
            rChannel = null;
            setTimeout(async () => {
                const newConn = await connectRabbit();
                // Если соединение восстановилось и был зарегистрирован обработчик задач, переподписываемся
                if (newConn && registeredJob) {
                    runMqChannels(registeredJob);
                }
            }, 5000);
        });

        return connection;
    } catch (e) {
        isConnecting = false;
        console.log('err rabbit connect, retrying in 5s...');
        logger(e);
        setTimeout(async () => {
            const newConn = await connectRabbit();
            if (newConn && registeredJob) {
                runMqChannels(registeredJob);
            }
        }, 5000);
        return null;
    }
};

const startFirst = async () => {
    const conn = await connectRabbit();
    if (conn && !rChannel) {
        try {
            rChannel = await conn.createChannel();
            rChannel.on('error', (err) => {
                logger('RabbitMQ main channel error: ' + err.message);
            });
            rChannel.on('close', () => {
                rChannel = null;
            });
        } catch (e) {
            console.log('err rabbit channel creation');
            logger(e);
        }
    }
};

const createChan = async (queueName = TASKS_CHANNEL) => {
    let channel;

    if (!RABBIT_MQ_QUE) {
        console.log(messages.warningMQ());
        return undefined;
    }
    try {
        const conn = await connectRabbit();
        if (!conn) return undefined;

        channel = await conn.createChannel();
        channel.on('error', (err) => {
            logger(`Channel error for ${queueName}: ` + err.message);
        });
        await channel.prefetch(1);
        await channel.assertQueue(queueName, {durable: true});
    } catch (e) {
        console.log('err rabbit channel/queue setup');
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
        job.isClosed = false;
        channel.consume(queueName, message => {
            // logger('queueName ');
            if (message) {
                const {content} = message;
                let task;
                try {
                    task = JSON.parse(`${content}`);
                } catch (parseErr) {
                    console.log('error parsing task JSON');
                    logger(parseErr);
                    try {
                        channel.ack(message);
                    } catch (err) {
                    }
                    return;
                }

                if (queueName !== TASKS_CHANNEL) {
                    task.q = queueName;
                }
                job(task)
                    .then(() => {
                        try {
                            channel.ack(message);
                        } catch (ackErr) {
                            logger('Ack error: ' + ackErr.message);
                        }
                    })
                    .catch(e => {
                        console.log('error job task');
                        console.log(e);
                        try {
                            channel.nack(message, false, false);
                        } catch (nackErr) {
                            logger('Nack error: ' + nackErr.message);
                        }
                    });
            }
        });
    } catch (e) {
        console.log('err rabbit job consumer');
        logger(e);
    }
};

const runMqChannels = job => {
    registeredJob = job; // Запоминаем для восстановления после обрыва
    if (!RABBIT_MQ_QUE) {
        console.log(messages.warningMQ());
        return;
    }
    setTimeout(() => {
        runMqChannel(job, TASKS_CHANNEL);
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

    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        temporaryValue = arr[currentIndex];
        arr[currentIndex] = arr[randomIndex];
        arr[randomIndex] = temporaryValue;
    }

    return arr;
}

function getKey() {
    const hours = new Date().getHours();
    const shuffleKeys = shuffle(keys);

    return shuffleKeys.find((k, i) => hours <= (24 / keys.length) * (i + 1)) || keys[0];
}

const getMqParams = (queueName = TASKS_CHANNEL) => {
    const isPuppet = queueName === PUPPET_QUE;
    const access_token = getKey();

    return {
        isPuppet,
        access_token,
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
            console.log('Send to queue error:', e);
        }
    } else {
        console.log('rChannel is not available to send message');
    }
};

const time = (queueName = TASKS_CHANNEL, start = false) => {
    if (queueName === TASKS_CHANNEL) {
        availableOne = !start;
    }
    const time1 = elapsedTime(queueName);
    if (start) {
        resetTime(queueName);
    }
    return time1;
};

const timeStart = q => time(q, true);

module.exports.startFirst = startFirst;
module.exports.addToChannel = addToChannel;
module.exports.getMqParams = getMqParams;
module.exports.time = time;
module.exports.runMqChannels = runMqChannels;
module.exports.timeStart = timeStart;
