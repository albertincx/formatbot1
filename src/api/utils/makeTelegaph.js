const { chunk } = require('lodash');
const fetch = require('isomorphic-fetch');

const { toDom } = require('../utils/dom');
const logger = require('../utils/logger');

const MAX_LENGHT_CONTENT = 65000;
function lengthInUtf8Bytes(str) {
  // Matches only the 10.. bytes that are non-initial characters in a multi-byte sequence.
  const m = encodeURIComponent(str)
    .match(/%[89ABab]/g);
  return str.length + (m ? m.length : 0);
}

const makeTelegraphLink = async (obj, content) => {
  const body = Object.assign(obj, {
    access_token: process.env.TGPHTOKEN,
    author_name: 'From',
    return_content: false,
    content,
  });

  return fetch('https://api.telegra.ph/createPage', {
    body: JSON.stringify(body),
    method: 'POST',
    headers: { 'content-type': 'application/json' },
  })
    .then(res => {
      if (!res.ok) {
        const err = new Error(res.statusText || 'Error calling telegra.ph');
        err.statusCode = res.status;
        throw err;
      }
      return res.json()
        .then((json) => {
          if (('ok' in json && !json.ok)) {
            throw new Error(json.error || 'Error calling telegra.ph');
          }
          return json.result.url;
        });
    });
};

const makeLink = (obj, dom, link) => {
  try {
    let content = JSON.stringify(dom);
    const bytes = lengthInUtf8Bytes(content);
    if (content.length > MAX_LENGHT_CONTENT || bytes > MAX_LENGHT_CONTENT) {
      const chunksLen = Math.ceil(content.length / MAX_LENGHT_CONTENT);
      return makeTelegaphMany(obj, dom, chunksLen + 1);
    }
    if (link) {
      logger(`push ${link}`);
      dom.push(...toDom(`<p align="center"><br /><br /><a href="${link}">Read Next page</a></p>`)[0].children);
    }
    content = JSON.stringify(dom);
    logger(content, 'withnext.json');

    return makeTelegraphLink(obj, content);
  } catch (e) {
    logger(e);
  }
};

function timeout(s) {
  const tm = r => setTimeout(() => r(true), s * 1000);
  return new Promise(r => tm(r));
}

const makeTelegaphMany = async (obj, dom, chunksLen) => {
  if (dom.length === 1) {
    dom = dom[0].children;
  }
  const partsLen = Math.ceil(dom.length / chunksLen);
  const parts = chunk(dom, partsLen);
  let link = '';
  try {
    for (let i = parts.length - 1; i > 0; i -= 1) {
      const domed = parts[i];
      await timeout(3);
      link = await makeLink(obj, domed, link);
    }
    await timeout(3);
    link = await makeLink(obj, parts[0], link);
  } catch (e) {
    logger(e);
  }
  return link;
};

const makeTelegaph = async (obj, parsedHtml) => {
  let telegraphLink = '';
  const domEd = toDom(parsedHtml);
  const content = JSON.stringify(domEd);
  const bytes = lengthInUtf8Bytes(content);
  logger(content, 'domed.html');
  logger(`length ${parsedHtml.length}`);
  logger(`domed ${content.length}`);
  logger(`bytes ${lengthInUtf8Bytes(content)}`);
  let isLong = false;
  if (content.length) {
    if (content.length > MAX_LENGHT_CONTENT || bytes > MAX_LENGHT_CONTENT) {
      isLong = true;
      logger(`is too big ${content.length}`);
      const chunksLen = Math.ceil(content.length / MAX_LENGHT_CONTENT);
      telegraphLink = await makeTelegaphMany(obj, domEd, chunksLen + 1);
    } else {
      telegraphLink = await makeTelegraphLink(obj, content);
    }
  }
  return {
    telegraphLink,
    isLong,
  };
};

module.exports = makeTelegaph;
