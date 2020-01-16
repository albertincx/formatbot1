const san = (content, params) => {
  const replace = /(<iframe[^>]+>.*?<\/iframe>|<iframe><\/iframe>)/g;
  content = content.replace(replace, '');
  if (params && params.noLinks) {
    content = content.replace(/<a href="(.*?)">(.*?)<\/a>/gi, '$1');
  }
  return content;
};
module.exports = san;
