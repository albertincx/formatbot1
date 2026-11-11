const puppeteer = require('puppeteer');
const {timeout} = require('./index');
const {logger} = require('./logger');
const {HEADLESS} = require('../../config/vars');

let activeBrowserWs = null;
let activeBrowserProcess = null;

const getBrowser = async () => {
  const args = [
    '--disable-web-security',
    '--ignore-certificate-errors',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-extensions',
    '--mute-audio',
    '--ignore-autoplay-restrictions',
    '--disable-background-timer-throttling',
    '--lang=en',
    '--incognito',
  ];
  const opts = {args};
  if (HEADLESS !== '1') {
    opts.headless = 'new';
  }
  return puppeteer.launch(opts)
    .then(browser => {
      const browserWSEndpoint = browser.wsEndpoint();
      activeBrowserWs = browserWSEndpoint;
      activeBrowserProcess = browser.process();
      browser.disconnect();
      return browserWSEndpoint;
    });
};

const closeBrowser = async () => {
  const ws = activeBrowserWs;
  const proc = activeBrowserProcess;
  activeBrowserWs = null;
  activeBrowserProcess = null;

  if (ws) {
    try {
      const browser = await puppeteer.connect({browserWSEndpoint: ws});
      await browser.close();
      return;
    } catch (e) {
      logger(`closeBrowser connect/close error: ${e.message}`);
    }
  }
  if (proc && !proc.killed) {
    try {
      proc.kill('SIGTERM');
    } catch (e) {
      logger(`closeBrowser kill error: ${e.message}`);
    }
  }
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

  let browser;
  let context;
  let page;

  try {
    logger(url);
    browser = await puppeteer.connect({browserWSEndpoint: ws});
    context = await browser.createBrowserContext();
    page = await context.newPage();
    page.setDefaultTimeout(10000);
    let response;
    try {
      response = await page.goto(url, {
        waitUntil: 'load',
        timeout: 5000
      });
      logger('page loaded')
    } catch (err) {
      logger(`Navigation error: ${err.message}`);
    }

    if (response && !response.ok()) {
      logger(`HTTP status: ${response.status()} for ${url}`);
    }

    const scrollCount = scroll ? 6 : 3;
    logger(scroll);
    logger('wait scroll ' + scrollCount);
    await timeout(3);
    logger('waited 3 sec');

    for (let scrollTime = 0; scrollTime < scrollCount; scrollTime += 1) {
      await page.evaluate(sc => {
        window.scrollBy(0, 200);
        const scrollElement = document.getElementById(sc);
        if (scrollElement) {
          scrollElement.scrollTop += 200;
        }
      }, scroll);
    }
    await timeout(3);
    logger('wait 3');
    const content = await page.content();
    // logger('ppt len = ' + content.length);
    return content;
  } catch (e) {
    logger(e);
  } finally {
    if (page && !page.isClosed()) {
      await page.close().catch(() => {});
    }
    if (context) {
      await context.close().catch(() => {});
    }
    if (browser) {
      await browser.disconnect().catch(() => {});
    }
    logger('puppet end');
    logger(new Date());
  }
  return '';
};

module.exports = puppet;
module.exports.getBrowser = getBrowser;
module.exports.closeBrowser = closeBrowser;
