const fetch = require('node-fetch');

async function run(params, botHelper) {
  try {
    let url = process.env.TEST_API;
    if (!url) return;
    await fetch(url);
    await botHelper.sendAdmin('cron test check url');
  } catch (e) {
    console.log(e);
  }
}

module.exports = { run };
