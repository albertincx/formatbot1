const request = require('sync-request');
const urlParse = require('url').parse;
const isImage = require('is-image');
const isUrl = require('is-url');

module.exports = (url, accurate, timeout = 5000) => {
  if (!url) return false;
  const http = url.lastIndexOf('http');
  if (http !== -1) url = url.substring(http);
  if (!isUrl(url)) return isImage(url);
  let { pathname } = urlParse(url);
  if (!pathname) return false;
  const last = pathname.search(/[:?&]/);
  if (last !== -1) pathname = pathname.substring(0, last);
  if (/styles/i.test(pathname)) return false;
  try {
    const res = request('GET', url, { timeout });
    if (!res) return false;
    const { headers } = res;
    if (!headers) return false;
    const contentType = headers['content-type'];
    if (!contentType) return false;
    return contentType.search(/^image\//) !== -1 &&
      contentType.search(/xml/) === -1;
  } catch (e) {
    return false;
  }
};
