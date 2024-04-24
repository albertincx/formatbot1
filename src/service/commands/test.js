async function run(params, botHelper) {
  try {
    // const url = process.env.TEST_API;
    const conf = botHelper.getConf('cron_test')
    if (conf) {
      // console.log(url);
      console.log(conf);
      await botHelper.sendAdmin('cron')
      await botHelper.sendAdmin('cron test', process.env.TGGROUPLOGS);
    }
  } catch (e) {
    console.log(e);
  }
}

module.exports = {run};
