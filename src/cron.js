const fs = require('fs');
const {CronJob} = require('cron');
const {
  NODE_CRON,
  CRON_TASKS
} = require('./config/vars');

const CRON_SEP = ':';
const JOB_SEP = ',';

function cron(crontime, tasks, botHelper) {
  console.log(`init cron ${crontime} ${tasks}`);
  const job = new CronJob(`${crontime}`, async () => {
    if (global.isDevEnabled) {
      console.log(`created task ${crontime} `, new Date());
    }
    for (let taskIdx = 0; taskIdx < tasks.length; taskIdx += 1) {
      const taskName = tasks[taskIdx];
      try {
        const microtasks = require(`./service/commands/${taskName}`);
        await microtasks.run({cronJob: crontime}, botHelper);
      } catch (e) {
        if (global.isDevEnabled) {
          console.log(`task error ${taskName}`);
          console.log(e);
        }
      }
    }
  });
  job.start();
}

function init(botHelper) {
  const cronTimes = NODE_CRON || '';
  const cronTasks = CRON_TASKS || '';

  const cronArray = cronTimes.split(CRON_SEP);
  const tasksMain = cronTasks.split(CRON_SEP);

  try {
    if (cronArray && cronArray.length) {
      for (let cronIdx = 0; cronIdx < cronArray.length; cronIdx += 1) {
        const cronTime = `${cronArray[cronIdx]}`
          .trim()
          .replace(/G/g, '*')
          .replace(/d/g, '/');

        if (cronTime && tasksMain[cronIdx]) {
          const jobs = tasksMain[cronIdx].split(JOB_SEP);
          if (jobs && jobs.length) {
            const tasks = [];
            for (let jobIdx = 0; jobIdx < jobs.length; jobIdx += 1) {
              const taskName = `${jobs[jobIdx]}`.trim();
              const cmdPath = `${__dirname}/service/commands/${taskName}.js`;
              if (fs.existsSync(cmdPath)) {
                tasks.push(taskName);
              }
            }
            if (tasks.length) {
              cron(cronTime, tasks, botHelper);
            }
          } else {
            console.log(`no jobs ${cronTime}`);
          }
        } else {
          console.log(`empty ${cronTime}`);
        }
      }
    } else {
      console.log('no cron arr');
    }
  } catch (e) {
    console.log(e);
  }
}

module.exports = init;
