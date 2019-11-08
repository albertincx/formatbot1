const sizesRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|]) [0-9]+[a-zA-Z]{1,4}/gi;
const tmpReplacer = '##@#IMG#@##';

const replaceImages = (content, imgs) => {
  for (let img of imgs) {
    content = content.replace(img, tmpReplacer);
  }
};

const findImages = (content) => {
  const urlRegex = /<img [^>]+\/?>/g;
  return content.match(urlRegex);
};

const restoreImages = (content, imgs) => {
  for (let img of imgs) {
    content = content.replace(tmpReplacer, img);
  }
};

module.exports.restoreImages = restoreImages;
module.exports.replaceImages = replaceImages;
module.exports.findImages = findImages;
