const puppeteer = require('puppeteer');
const args = [
    '--disable-web-security',
    '--ignore-certificate-errors',
    '--no-sandbox',
    '--ignore-autoplay-restrictions',
    '--disable-dev-shm-usage',
    // "--auto-open-devtools-for-tabs",
    '--disable-background-timer-throttling',
    '--lang=en',
    '--incognito',
  ];
  (async () => {
    const browser = await puppeteer.launch({ headless: true,args });
    // Store the endpoint to be able to reconnect to Chromium
    const browserWSEndpoint = browser.wsEndpoint();
    // Disconnect puppeteer from Chromium
    browser.disconnect();

    // Use the endpoint to reestablish a connection
    const browser2 = await puppeteer.connect({ browserWSEndpoint });
    // Close Chromium
    await browser2.close();
  })();
