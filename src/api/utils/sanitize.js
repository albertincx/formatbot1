const san = (content) => {
  const replace = /(<iframe[^>]+>.*?<\/iframe>|<iframe><\/iframe>)/g;
  content = content.replace(replace, '');
  content = content.replace(/<a href="(.*?)">(.*?)<\/a>/gi, '$1');
  return content;
};
module.exports = san;
