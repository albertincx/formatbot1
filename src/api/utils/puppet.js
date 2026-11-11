const puppeteer = require('puppeteer');
const {timeout, MAX_HTML_BYTES} = require('./index');
const {logger} = require('./logger');
const {HEADLESS} = require('../../config/vars');

const IDLE_TIMEOUT_MS = parseInt(process.env.PUPPET_IDLE_TIMEOUT_MS, 10) || 90 * 1000;

let activeBrowserWs = null;
let activeBrowserProcess = null;
let launchPromise = null;
let idleTimer = null;
let activeTasks = 0;

const clearIdleTimer = () => {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
};

const scheduleIdleClose = () => {
  clearIdleTimer();
  if (!activeBrowserWs || activeTasks > 0) return;
  const delay = parseInt(process.env.PUPPET_IDLE_TIMEOUT_MS, 10) || IDLE_TIMEOUT_MS;
  idleTimer = setTimeout(() => {
    idleTimer = null;
    if (activeTasks === 0 && activeBrowserWs) {
      logger('puppet idle timeout reached, closing browser');
      closeBrowser().catch(() => {});
    }
  }, delay);
  if (typeof idleTimer.unref === 'function') {
    idleTimer.unref();
  }
};

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
      const proc = browser.process();
      activeBrowserWs = browserWSEndpoint;
      activeBrowserProcess = proc;
      if (proc && typeof proc.once === 'function') {
        proc.once('exit', () => {
          if (activeBrowserWs === browserWSEndpoint) {
            activeBrowserWs = null;
            activeBrowserProcess = null;
            clearIdleTimer();
          }
        });
      }
      browser.disconnect();
      return browserWSEndpoint;
    });
};

const ensureBrowser = async () => {
  if (activeBrowserWs) {
    return activeBrowserWs;
  }
  if (!launchPromise) {
    launchPromise = getBrowser().finally(() => {
      launchPromise = null;
    });
  }
  return launchPromise;
};

const closeBrowser = async () => {
  clearIdleTimer();
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

  clearIdleTimer();
  activeTasks += 1;
  const isManaged = ws === 'lazy' || ws === true || ws === activeBrowserWs;

  let browser;
  let context;
  let page;

  try {
    logger(url);
    const targetWs = (ws === 'lazy' || ws === true) ? await ensureBrowser() : ws;
    browser = await puppeteer.connect({browserWSEndpoint: targetWs});
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
    const htmlLength = await page.evaluate(() => (
      document.documentElement ? document.documentElement.outerHTML.length : 0
    ));
    if (htmlLength > MAX_HTML_BYTES) {
      logger(`puppet html too large: ${htmlLength}`);
      return '';
    }
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
    activeTasks = Math.max(0, activeTasks - 1);
    if (isManaged && activeTasks === 0) {
      scheduleIdleClose();
    }
    logger('puppet end');
    logger(new Date());
  }
  return '';
};

module.exports = puppet;
module.exports.getBrowser = getBrowser;
module.exports.closeBrowser = closeBrowser;
