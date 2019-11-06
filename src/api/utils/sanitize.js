const san = (content) => {
  content = content.replace(/(<iframe[^>]+>.*?<\/iframe>|<iframe><\/iframe>)/g, '');
  return content;
};
module.exports = san;
