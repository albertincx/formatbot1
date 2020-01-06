const puppeteer = require('puppeteer');
const logger = require('../utils/logger');

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
  return puppeteer.launch({
    headless: process.env.HDLSS !== '1',
    args,
  }).then((browser) => {
    const browserWSEndpoint = browser.wsEndpoint();
    browser.disconnect();
    return browserWSEndpoint;
  });
};
const puppet = async (url, params) => {
  let { browserWs: ws, scroll } = params;
  if (!ws) {
    return Promise.resolve(false);
  }
  try {
    logger(url);
    const browser = await puppeteer.connect({ browserWSEndpoint: ws });
    const page = await browser.newPage();
    const status = await page.goto(url);
    if (!status.ok) {
      throw new Error('cannot open google.com');
    }
    logger('wait');
    let sec = 5000;
    let scCnt = scroll ? 6 : 3;
    await new Promise(resolve => setTimeout(() => resolve(), sec));
    for (let i = 0; i < scCnt; i += 1) {
      await new Promise(resolve => setTimeout(async () => {
        await page.evaluate(_ => {
          window.scrollBy(0, 200);
          if (scroll) {
            logger(scroll);
            const s = document.getElementById(scroll);
            if (s) {
              s.scrollTop += 200;
            }
          }
        });
        resolve();
      }, 1100));
    }
    sec = 2000;
    await new Promise(resolve => setTimeout(() => resolve(), sec));
    logger('wait 2');
    let content = await page.content();
    page.close();
    logger(content, 'puppet.html');
    return content;
  } catch (e) {
    logger(e);
  }
  return '';
};
module.exports = puppet;
module.exports.getBrowser = getBrowser;
