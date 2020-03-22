const fs = require('fs');
const { CronJob } = require('cron');

const CRON_SEP = ':';
const JOB_SEP = ',';

function cron(crontime, tasks, botHelper) {
  console.log(`init cron ${crontime} ${tasks}`);
  const job = new CronJob(`${crontime}`, async () => {
    if (process.env.DEV) {
      const d = new Date();
      console.log(`created task ${crontime} `, d);
    }
    for (let i = 0; i < tasks.length; i += 1) {
      const taskName = tasks[i];
      try {
        const microtasks = require(`./service/commands/${taskName}`);
        await microtasks.run({ cronJob: crontime }, botHelper);
      } catch (e) {
        if (process.env.DEV) {
          console.log(`task error ${taskName}`);
          console.log(e);
        }
      }
    }
  });
  job.start();
}

function init(botHelper) {
  const crontime = process.env.NODE_CRON || '';
  const crontasks = process.env.CRON_TASKS || '';

  const crons = crontime.split(CRON_SEP);
  const tasks = crontasks.split(CRON_SEP);

  try {
    console.log(tasks);
    if (crons && crons.length) {
      for (let i = 0; i < crons.length; i += 1) {
        let crontime = `${crons[i]}`.trim().
          replace(/G/g, '*').
          replace(/d/g, '/');
        if (crontime && tasks[i]) {
          const jobs = tasks[i].split(JOB_SEP);
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
              console.log(tasks, crontime);
              cron(crontime, tasks, botHelper);
            }
          } else {
            console.log(`no jobs ${crontime}`);
          }
        } else {
          console.log(`empty ${crontime}`);
        }
      }
    } else {
      console.log('no crons');
    }
  } catch (e) {
    console.log(e);
  }
}

module.exports = init;
