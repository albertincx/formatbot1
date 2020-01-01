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
    headless: true,
    args,
  }).then((browser) => {
    const browserWSEndpoint = browser.wsEndpoint();
    browser.disconnect();
    return browserWSEndpoint;
  });
};
const puppet = async (url, ws) => {
  if (!ws) {
    return Promise.resolve(false);
  }
  try {
    logger(url);
    // Use the endpoint to reestablish a connection
    const browser = await puppeteer.connect({ browserWSEndpoint: ws });
    const page = await browser.newPage();
    const status = await page.goto(url);
    if (!status.ok) {
      throw new Error('cannot open google.com');
    }
    //console.log('wait',url);
    let sec = 4000;
    await new Promise(resolve => setTimeout(() => resolve(), sec));
    await new Promise(resolve => setTimeout(async () => {
      await page.evaluate(_ => {
        window.scrollBy(0, 100);
      });
      resolve();
    }, 500));
    await new Promise(resolve => setTimeout(async () => {
      await page.evaluate(_ => {
        window.scrollBy(0, 100);
      });
      resolve();
    }, 700));
    sec = 2000;
    await new Promise(resolve => setTimeout(() => resolve(), sec));
    logger('wait 2');
    let content = await page.content();
    page.close();
    return content;
  } catch (e) {
    logger(e);
  }
  return '';
};
module.exports = puppet;
module.exports.getBrowser = getBrowser;
