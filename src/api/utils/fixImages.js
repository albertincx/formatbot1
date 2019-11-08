const setRegex = /srcset="/;
const imgReplacer = '##@#IMG#@##';

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
  return content.match(urlRegex) || [];
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

const restoreTags = (content, imgs, replaceFrom) => {
  for (let img of imgs) {
    if (replaceFrom === imgReplacer) {
      img = findSrcSet(img);
    }
    content = content.replace(imgReplacer, img);
  }
  return content;
};

module.exports.findImages = findImages;
module.exports.replaceImages = (content, imgs) => replaceTags(content, imgs, imgReplacer);
module.exports.restoreImages = (content, imgs) => restoreTags(content, imgs, imgReplacer);
module.exports.insertYoutube = insertYoutube;
