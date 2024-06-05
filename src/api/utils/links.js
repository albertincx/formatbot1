function getAllLinks(text) {
  const urlRegex =
    /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/gi;
  return text.match(urlRegex) || [];
}

function getLink(links) {
  let lnk = links[0];
  for (let i = 1; i < links.length; i += 1) {
    if (links[i].startsWith(lnk)) {
      lnk = links[i];
    }
  }
  return lnk;
}

const getLinkFromEntity = (entities, txt) => {
  const links = [];
  for (let i = 0; i < entities.length; i += 1) {
    if (entities[i].url) {
      links.push(entities[i].url);
    } else if (entities[i].type === 'url' || entities[i].type === 'text_link') {
      let checkFf = txt.substring(0, entities[i].length);
      checkFf = checkFf.match(/\[(.*?)]/);
      if (!checkFf) {
        links.push(txt.substring(entities[i].offset, entities[i].offset + entities[i].length));
      }
    }
  }

  return links;
};

module.exports.getAllLinks = getAllLinks;
module.exports.getLink = getLink;
module.exports.getLinkFromEntity = getLinkFromEntity;
