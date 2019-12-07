const { chunk } = require('lodash');
const fetch = require('isomorphic-fetch');

const { toDom } = require('../utils/dom');
const logger = require('../utils/logger');

const MAX_LENGHT_CONTENT = 65000;
let pages = 0;
let push = 0;

function lengthInUtf8Bytes(str) {
  if (!str) return 0;
  // Matches only the 10.. bytes that are non-initial characters in a multi-byte sequence.
  const m = encodeURIComponent(str).match(/%[89ABab]/g);
  return str.length + (m ? m.length : 0);
}

const makeTelegraphLink = async (obj, content) => {
  logger(`access ${obj.access_token}`);
  const body = Object.assign(obj, {
    author_name: 'From',
    return_content: false,
    content,
  });

  return fetch('https://api.telegra.ph/createPage', {
    body: JSON.stringify(body),
    method: 'POST',
    headers: { 'content-type': 'application/json' },
  }).then(res => {
    if (!res.ok) {
      const err = new Error(res.statusText || 'Error calling telegra.ph');
      err.statusCode = res.status;
      throw err;
    }
    return res.json().then((json) => {
      if (('ok' in json && !json.ok)) {
        throw new Error(json.error || 'Error calling telegra.ph');
      }
      return json.result.url;
    });
  });
};

const makeLink = (obj, dom, link, index) => {
  try {
    let content = JSON.stringify(dom);
    const bytes = lengthInUtf8Bytes(content);
    if (content.length > MAX_LENGHT_CONTENT || bytes > MAX_LENGHT_CONTENT) {
      const chunksLen = Math.ceil(content.length / MAX_LENGHT_CONTENT);
      return makeTelegaphMany(obj, dom, chunksLen + 1);
    }
    if (link) {
      logger(`push ${link}`);
      push += 1;
      const nextBtn = `<p align="center"><br /><br /><a href="${link}">Read Next page</a></p>`;
      dom.push(...toDom(nextBtn)[0].children);
    }
    content = JSON.stringify(dom);
    logger(content, `page${index}.json`);

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
      pages += 1;
      link = await makeLink(obj, domed, link, i);
    }
    await timeout(3);
    link = await makeLink(obj, parts[0], link, 0);
  } catch (e) {
    logger(e);
  }
  return link;
};

const makeTelegaph = async (obj, parsedHtml) => {
  let telegraphLink = '';
  let domEd = toDom(parsedHtml);
  if (domEd.length === 1) {
    domEd = domEd[0].children;
  }

  const content = JSON.stringify(domEd);
  const bytes = lengthInUtf8Bytes(content);
  logger(content, 'domed.json');
  logger(`length ${parsedHtml.length}`);
  logger(`bytes ${bytes}`);
  let isLong = false;
  pages = 0;
  push = 0;
  if (content && content.length) {
    logger(`domed ${content.length}`);
    if (content.length > MAX_LENGHT_CONTENT || bytes > MAX_LENGHT_CONTENT) {
      isLong = true;
      logger(`is too big ${bytes}`);
      const chunksLen = Math.ceil(bytes / MAX_LENGHT_CONTENT);
      telegraphLink = await makeTelegaphMany(obj, domEd, chunksLen + 1);
    } else {
      telegraphLink = await makeTelegraphLink(obj, content);
    }
  }
  return {
    telegraphLink,
    isLong,
    pages,
    push,
  };
};

module.exports = makeTelegaph;
