const { fetch } = require('undici');
const urlParse = require('url').parse;

let isImage = require('is-image');

if (isImage && typeof isImage.default === 'function') {
  isImage = isImage.default;
}

const isUrl = require('is-url');

module.exports = async (urlParam, accurate, timeout = 5000) => {
  let url = urlParam;
  if (!url) return false;
  const http = url.lastIndexOf('http');
  if (http !== -1) url = url.substring(http);
  if (!isUrl(url)) return isImage(url);
  let {pathname} = urlParse(url);
  if (!pathname) return false;
  const last = pathname.search(/[:?&]/);
  if (last !== -1) pathname = pathname.substring(0, last);
  if (/styles/i.test(pathname)) return false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    clearTimeout(timeoutId);
    const contentType = res.headers.get('content-type');
    if (!contentType) return false;
    const contentTypeStr = `${contentType}`;
    return (
      contentTypeStr.search(/^image\//) !== -1 && contentTypeStr.search(/xml/) === -1
    );
  } catch (e) {
    return false;
  }
};
