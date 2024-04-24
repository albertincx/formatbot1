const fs = require('fs');
const {CronJob} = require('cron');
const {
  IS_DEV,
  NODE_CRON,
  CRON_TASKS
} = require('./config/vars');

const CRON_SEP = ':';
const JOB_SEP = ',';

function cron(crontime, tasks, botHelper) {
  console.log(`init cron ${crontime} ${tasks}`);
  const job = new CronJob(`${crontime}`, async () => {
    if (IS_DEV) {
      const d = new Date();
      console.log(`created task ${crontime} `, d);
    }
    for (let i = 0; i < tasks.length; i += 1) {
      const taskName = tasks[i];
      try {
        const microtasks = require(`./service/commands/${taskName}`);
        await microtasks.run({cronJob: crontime}, botHelper);
      } catch (e) {
        if (IS_DEV) {
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
      for (let i = 0; i < cronArray.length; i += 1) {
        const cronTime = `${cronArray[i]}`
          .trim()
          .replace(/G/g, '*')
          .replace(/d/g, '/');

        if (cronTime && tasksMain[i]) {
          const jobs = tasksMain[i].split(JOB_SEP);
          if (jobs && jobs.length) {
            const tasks = [];
            for (let t = 0; t < jobs.length; t += 1) {
              const taskName = `${jobs[t]}`.trim();
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
