const { chunk } = require('lodash');
const fetch = require('isomorphic-fetch');

const { toDom } = require('../utils/dom');
const logger = require('../utils/logger');

const MAX_LENGHT_CONTENT = 65000;
const makeTelegraphLink = async ({ title, url }, content) => {
  const body = {
    access_token: process.env.TGPHTOKEN,
    title,
    author_name: 'From',
    author_url: url,
    content,
    return_content: false,
  };
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
  if (link) {
    dom.push(toDom(`<br /><p align="center"><a href="${link}">Read Next page</a></p>`));
  }
  const content = JSON.stringify(dom);
  logger(`part content ${content.length}`);
  return makeTelegraphLink(obj, content);
};

function timeout(s) {
  const tm = r => setTimeout(() => r(true), s * 1000);
  return new Promise(r => tm(r));
}

const makeTelegaphMany = async (obj, dom, chunksLen) => {
  const parts = chunk(dom, dom.length / chunksLen);
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

  }
  return link;
};

const makeTelegaph = async (obj, content) => {
  let telegraphLink = '';
  const domEd = toDom(content);
  const tgContent = JSON.stringify(domEd);
  logger(tgContent, 'domed.html');
  logger(`domed ${tgContent.length}`);
  if (tgContent.length) {
    if (tgContent.length > MAX_LENGHT_CONTENT) {
      const chunksLen = Math.ceil(tgContent.length / MAX_LENGHT_CONTENT, 10);
      telegraphLink = await makeTelegaphMany(obj, domEd, chunksLen);
    } else {
      telegraphLink = await makeTelegraphLink(obj, tgContent);
    }
  }
  return telegraphLink;
};

module.exports = makeTelegaph;
