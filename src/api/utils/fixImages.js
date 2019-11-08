const setRegex = /srcset="/;
const tmpReplacer = '##@#IMG#@##';

const findImages = (content) => {
  const urlRegex = /<img [^>]+\/?>/g;
  return content.match(urlRegex) || [];
};

const replaceImages = (content, imgs) => {
  for (let img of imgs) {
    content = content.replace(img, tmpReplacer);
  }
  return content;
};

const restoreImages = (content, imgs) => {
  for (let img of imgs) {
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
    content = content.replace(tmpReplacer, img);
  }
  return content;
};

module.exports.restoreImages = restoreImages;
module.exports.replaceImages = replaceImages;
module.exports.findImages = findImages;
