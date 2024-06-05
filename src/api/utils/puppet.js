const puppeteer = require('puppeteer');
const {timeout} = require('./index');
const {logger} = require('./logger');
const {HEADLESS} = require('../../config/vars');

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
    '--disabled-setupid-sandbox',
  ];
  const opts = {args};
  if (HEADLESS !== '1') {
    opts.headless = 'new';
  }
  return puppeteer.launch(opts)
    .then(browser => {
      const browserWSEndpoint = browser.wsEndpoint();
      browser.disconnect();
      return browserWSEndpoint;
    });
};

const puppet = async (url, params) => {
  const {
    browserWs: ws,
    scroll
  } = params;
  if (!ws) {
    return Promise.resolve('');
  }
  logger('puppet start');
  logger(new Date());
  try {
    logger(url);
    const browser = await puppeteer.connect({browserWSEndpoint: ws});
    const page = await browser.newPage();
    const status = await page
      .goto(url, {
        waitUntil: 'load',
        timeout: 30000
      })
      .catch(() => page.close()
        .then(() => page.content()));
    if (!status.ok) {
      logger('cannot open google.com');
    } else {
      logger('wait');
      const scrollCount = scroll ? 6 : 3;
      logger(scroll);
      await timeout(5);
      for (let scrollTime = 0; scrollTime < scrollCount; scrollTime += 1) {
        await page.evaluate(sc => {
          window.scrollBy(0, 200);
          const scrollElement = document.getElementById(sc);
          if (scrollElement) {
            scrollElement.scrollTop += 200;
          }
        }, scroll);
      }
      await timeout(2);
      logger('wait 2');
      const content = await page.content();
      await page.close();
      logger('puppet end');
      logger(new Date());
      return content;
    }
  } catch (e) {
    logger(e);
  }
  return '';
};
module.exports = puppet;
module.exports.getBrowser = getBrowser;
