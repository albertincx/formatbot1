const fetch = require('node-fetch');

async function run(params, botHelper) {
  try {
    const url = process.env.TEST_API;
    if (!url) return;
    await fetch(url);
    await botHelper.sendAdmin('cron test check url', process.env.TGGROUPLOGS);
  } catch (e) {
    console.log(e);
  }
}

module.exports = {run};
