const puppeteer = require('puppeteer');
const {timeout} = require('./index');
const logger = require('./logger');

const getBrowser = async () => {
  const args = [
    '--disable-web-security',
    '--ignore-certificate-errors',
    '--no-sandbox',
    '--ignore-autoplay-restrictions',
    '--disable-dev-shm-usage',
    '--disable-background-timer-throttling',
    '--lang=en',
    '--incognito',
  ];

  return puppeteer
    .launch({
      headless: process.env.HDLSS !== '1',
      args,
    })
    .then(browser => {
      const browserWSEndpoint = browser.wsEndpoint();
      browser.disconnect();
      return browserWSEndpoint;
    });
};

const puppet = async (url, params) => {
  const {browserWs: ws, scroll} = params;
  if (!ws) {
    return Promise.resolve('');
  }
  try {
    //logger(url);
    const browser = await puppeteer.connect({browserWSEndpoint: ws});
    const page = await browser.newPage();
    const status = await page.goto(url, {});
    if (!status.ok) {
      logger('cannot open google.com');
    } else {
      logger('wait');
      const scCnt = scroll ? 6 : 3;
      logger(scroll);
      await timeout(5);
      for (let i = 0; i < scCnt; i += 1) {
        // eslint-disable-next-line no-await-in-loop,no-loop-func
        await page.evaluate(sc => {
          window.scrollBy(0, 200);
          const s = document.getElementById(sc);
          if (s) {
            s.scrollTop += 200;
          }
        }, scroll);
      }
      await timeout(2);
      logger('wait 2');
      const content = await page.content();
      await page.close();
      return content;
    }
  } catch (e) {
    logger(e);
  }
  return '';
};
module.exports = puppet;
module.exports.getBrowser = getBrowser;
