const sanitizeHtml = require('sanitize-html');
const request = require('request');

const sanitizeHtmlForce = require('./sanitize');
const logger = require('./logger');
const setRegex = /srcset="/;
const iframes = /(<iframe[^>]+>.*?<\/iframe>|<iframe><\/iframe>)/g;
const imgReplacer = '##@#IMG#@##';

const checkImage = (url) => {
  return new Promise((resolve, reject) => {
    const r = request({
      url,
      timeout: 5000,
    });
    r.on('response', response => {
      const contentType = response.headers['content-type'];
      resolve(contentType.match('image'));
      r.abort();
    });
    r.on('error', () => reject(null));
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
        mid = mid.trim().replace(/\s(.*?)$/, '');
        const src = img.match(/src="(.*?)"/);
        if (src) {
          img = img.replace(src[0], `src="${mid}"`);
          img = img.replace(srcsetAttr, '');
          img = img.replace(/srcset=""\s?/, '');
        }
      }
    } catch (e) {
      logger(e);
    }
  }
  return img;
};

const findIframes = (content) => {
  return content.match(iframes);
};

const findImages = (content, parsedUrl) => {
  const urlRegex = /<img [^>]+\/?>/g;
  const imgs = content.match(urlRegex) || [];
  const tasks = [];
  if (imgs.length && imgs.length < 10) {
    let baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
    for (let i = 0; i < imgs.length; i += 1) {
      let img = imgs[i].replace(/\n/g, '').replace(/\s+/g, ' ');
      const src = img.match(/src="(.*?)"/);
      if (src && src[1]) {
        let s = src[1];
        if (s[0] !== '/') {
          baseUrl = parsedUrl.dir;
        }
        if (!s.match('://')) {
          s = `${baseUrl}/${s}`;
        }
        tasks.push(checkImage(s).then(isValid => ({
          isValid,
          i,
        })).catch(() => ({ isValid: false, i })));
      }
    }
  }

  return Promise.all(tasks).then(checked => {
    for (let i = 0; i < checked.length; i += 1) {
      if (!checked[i].isValid) imgs[checked[i].i] = '';
    }
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

const restoreTags = (content, imgs, replaceFrom, parsedUrl) => {
  let baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
  for (let img of imgs) {
    if (replaceFrom === imgReplacer) {
      img = findSrcSet(img);
    }
    if (!img.match(/src=.(\/\/|https?)/)) {
      if (!img.match(/src="\//)) {
        baseUrl = parsedUrl.dir;
      }
      if (baseUrl && !img.match(/src=.\.\.|;/)) {
        img = img.replace(' src="', ` src="${baseUrl}/`);
      } else {
        img = '';
      }
    }
    content = content.replace(imgReplacer, img);
  }
  return content;
};

const replaceImages = (content, imgs) => replaceTags(content, imgs,
    imgReplacer);
const restoreImages = (content, imgs, parsedUrl) => restoreTags(content, imgs,
    imgReplacer, parsedUrl);
const replaceServices = (content) => {
  const srvs = [/<a.+(imgur\.com).+\/a>/g];
  for (let i = 0; i < srvs.length; i += 1) {
    const found = content.match(srvs[i]) || [];
    if (found.length) {
      for (let fi = 0; fi < found.length; fi += 1) {
        const href = found[fi].match(/href="([^>]+)"/);
        if (href) {
          content = content.replace(found[fi], `<img src="${href[1]}/zip" />`);
        }
      }
    }
  }
  return content;
};

const fixHtml = async (content, iframe, parsedUrl) => {
  const imgs = await findImages(content, parsedUrl);
  if (!iframe) {
    iframe = findIframes(content);
  }
  content = replaceImages(content, imgs);
  logger(`before san ${content.length}`);
  content = sanitizeHtml(content);
  content = sanitizeHtmlForce(content);
  content = restoreImages(content, imgs, parsedUrl);
  content = replaceServices(content);
  if (iframe && Array.isArray(iframe)) {
    content = insertYoutube(content, iframe);
  }
  return content;
};
module.exports.findImages = findImages;
module.exports.findIframes = findIframes;

module.exports.fixHtml = fixHtml;
module.exports.checkImage = checkImage;
