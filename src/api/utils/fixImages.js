const sanitizeHtml = require('sanitize-html');
const request = require('request');

const sanitizeHtmlForce = require('./sanitize');
const logger = require('./logger');
const setRegex = /srcset="/;
const imgReplacer = '##@#IMG#@##';

const checkImage = (img) => {
  return new Promise(resolve => {
    const r = request(img);
    r.on('response', response => {
      const contentType = response.headers['content-type'];
      resolve(contentType.match('image'));
      r.abort();
    });
  });
};
const findSrcSet = (img) => {
  const srcSet = img.match(setRegex);
  if (srcSet && srcSet.length) {
    try {
      const srcsetAttr = img.split(setRegex)[1].replace(/"\>/, '');
      const arr = srcsetAttr.split(',');
      let mid = arr[Math.round((arr.length - 1) / 2)];
      if (mid) {
        mid = mid.trim()
          .replace(/\s(.*?)$/, '');
        const src = img.match(/src="(.*?)"/);
        if (src) {
          img = img.replace(src[0], `src="${mid}"`);
          img = img.replace(srcsetAttr, '');
          img = img.replace(/srcset=""\s?/, '');
        }
      }
    } catch (e) {
      // console.log(e);
    }
  }
  return img;
};

const findImages = (content) => {
  const urlRegex = /<img [^>]+\/?>/g;
  const imgs = content.match(urlRegex) || [];
  const tasks = [];
  if (imgs.length && imgs.length < 10) {
    for (let i = 0; i < imgs.length; i += 1) {
      const src = imgs[i].match(/src="(.*?)"/);
      if (src && src[1]) {
        tasks.push(checkImage(src[1])
          .then(isValid => ({
            isValid,
            i,
          })));
      }
    }
  }

  return Promise.all(tasks)
    .then(checked => {
      for (let i = 0; i < checked.length; i += 1) if (!checked[i].isValid) imgs[checked[i].i] = '';
      return imgs;
    });
};

const insertYoutube = (content, links = []) => {
  for (let link of links) {
    let youid = link.match(/embed\/(.*?)(\?|$)/);
    if (youid && youid[1]) {
      const src = `/embed/youtube?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D${youid[1]}`;
      content = `<figure><iframe src="${src}"></iframe></figure>${content}`;
    }
  }
  return content;
};

const replaceTags = (content, imgs, replaceWith) => {
  for (let img of imgs) {
    content = content.replace(img, replaceWith);
  }
  return content;
};

const restoreTags = (content, imgs, replaceFrom, domain) => {
  for (let img of imgs) {
    if (replaceFrom === imgReplacer) {
      img = findSrcSet(img);
    }
    if (!img.match(/src=.(\/\/|https?)/)) {
      if (domain && !img.match(/src=.\.\.|;/)) {
        img = img.replace(' src="', ` src="${domain}`);
      } else {
        img = '';
      }
    }
    content = content.replace(imgReplacer, img);
  }
  return content;
};

module.exports.findImages = findImages;
const replaceImages = (content, imgs) => replaceTags(content, imgs, imgReplacer);
const restoreImages = (content, imgs, domain) => restoreTags(content, imgs, imgReplacer, domain);

const fixHtml = async (content, iframe, baseUrl) => {
  const imgs = await findImages(content);
  content = replaceImages(content, imgs);
  logger(`before san ${content.length}`);
  content = sanitizeHtml(content);
  content = sanitizeHtmlForce(content);
  content = restoreImages(content, imgs, baseUrl);
  if (iframe && Array.isArray(iframe)) {
    content = insertYoutube(content, iframe);
  }

  return content;
};

module.exports.fixHtml = fixHtml;
module.exports.checkImage = checkImage;
