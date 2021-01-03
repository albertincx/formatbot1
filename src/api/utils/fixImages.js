const sanitizeHtml = require('sanitize-html');
const isImageUrl = require('./is-image-url');
const sanitizeHtmlForce = require('./sanitize');
const logger = require('./logger');

const iframes = /(<iframe[^>]+>.*?<\/iframe>|<iframe><\/iframe>)/g;
const imgReplacer = '##@#IMG#@##';

function checkImage(url) {
  return Promise.resolve(isImageUrl(url));
}

function convert(strParam) {
  let str = strParam;
  str = str.replace(/&amp;/g, '&');
  str = str.replace(/&gt;/g, '>');
  str = str.replace(/&lt;/g, '<');
  str = str.replace(/&quot;/g, '"');
  str = str.replace(/&#039;/g, '\'');
  return str;
}

const findIframes = (content) => content.match(iframes);

const replaceDir = (imgParam, parsedUrl) => {
  let img = imgParam;
  if (img.match(/src=['"]..\//)) {
    let { dir } = parsedUrl;
    dir = dir.replace(/[^/]+\/?$/, '');
    if (dir.substr(-2, 2) !== '//') {
      img = img.replace('../', dir);
    }
  }
  return img;
};

const findImages = (content, parsedUrl, params) => {
  const urlRegex = /<img [^>]+\/?>/g;
  const imgs = content.match(urlRegex) || [];
  const tasks = [];
  if (imgs.length && imgs.length < 10) {
    let baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
    for (let i = 0; i < imgs.length; i += 1) {
      let img = imgs[i].replace(/\n/g, '').replace(/\s+/g, ' ');
      img = replaceDir(img, parsedUrl);
      const src = img.match(/src="(.*?)"/);
      if (src && src[1]) {
        let s = src[1];
        let sl = '';
        if (s[0] !== '/') {
          baseUrl = parsedUrl.dir;
          sl = '/';
        }
        if (!s.match('://')) {
          s = `${baseUrl}${sl}${s}`;
        }
        s = convert(s);
        if (params.isCached) {
          tasks.push({ isValid: true, i });
        } else {
          tasks.push(checkImage(s).then((isValid) => (
            {
              isValid,
              i,
            }
          )).catch(() => ({ isValid: false, i })));
        }
      }
    }
  }

  return Promise.all(tasks).then((checked) => {
    for (let i = 0; i < checked.length; i += 1) {
      if (!checked[i].isValid) imgs[checked[i].i] = '';
    }
    return imgs;
  });
};

const insertYoutube = (contentParam, links = []) => {
  let content = contentParam;
  for (let i = 0; i < links.length; i += 1) {
    const link = links[i];
    const youid = link.match(/embed\/(.*?)(\?|$)/);
    if (youid && youid[1]) {
      const src = `/embed/youtube?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D${youid[1]}`;
      content = `<figure><iframe src="${src}"></iframe></figure>${content}`;
    }
  }
  return content;
};

const replaceTags = (contentParam, imgs, replaceWith) => {
  let content = contentParam;
  for (let i = 0; i < imgs.length; i += 1) {
    content = content.replace(imgs[i], replaceWith);
  }
  return content;
};

const restoreTags = (contentParam, images, replaceFrom, parsedUrl) => {
  let content = contentParam;
  let baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
  for (let i = 0; i < images.length; i += 1) {
    let img = images[i];
    img = convert(img);
    img = replaceDir(img, parsedUrl);
    if (!img.match(/src=.(\/\/|https?)/)) {
      let sl = '';
      if (!img.match(/src="\//)) {
        baseUrl = parsedUrl.dir;
        sl = '/';
      }
      if (baseUrl && !img.match(/src=.\.\.|;base64/)) {
        img = img.replace(' src="', ` src="${baseUrl}${sl}`);
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

const replaceServices = (contentParam) => {
  let content = contentParam;
  const srvs = [/<a.+(imgur\.com).+\/a>/g];
  for (let i = 0; i < srvs.length; i += 1) {
    const found = content.match(srvs[i]) || [];
    if (found.length) {
      for (let fi = 0; fi < found.length; fi += 1) {
        const href = found[fi].match(/href="([^>]+)"/);
        if (href) {
          content = content.replace(found[fi], `<img alt="" src="${href[1]}/zip" />`);
        }
      }
    }
  }
  return content;
};

const fixHtml = async (contentParam, iframeParam, parsedUrl, params) => {
  let content = contentParam;
  let iframe = iframeParam;
  const imgs = await findImages(content, parsedUrl, params);
  if (!iframe) {
    iframe = findIframes(content);
  }
  content = replaceImages(content, imgs);
  logger(`before san ${content.length}`);
  content = sanitizeHtml(content);
  content = sanitizeHtmlForce(content, params);
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
