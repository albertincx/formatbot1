const jsdom = require('jsdom');
const logger = require('./logger');

const { JSDOM } = jsdom;

function domToNode(domNode) {
  if (domNode.nodeType === domNode.TEXT_NODE) {
    return domNode.data;
  }
  if (domNode.nodeType !== domNode.ELEMENT_NODE) {
    return false;
  }
  const nodeElement = {};
  nodeElement.tag = domNode.tagName.toLowerCase();
  for (let i = 0; i < domNode.attributes.length; i += 1) {
    const attr = domNode.attributes[i];
    if (attr.name === 'href' || attr.name === 'src') {
      if (!nodeElement.attrs) {
        nodeElement.attrs = {};
      }
      nodeElement.attrs[attr.name] = attr.value;
    }
  }
  if (domNode.childNodes.length > 0) {
    nodeElement.children = [];
    for (let i = 0; i < domNode.childNodes.length; i += 1) {
      const child = domNode.childNodes[i];
      nodeElement.children.push(domToNode(child));
    }
  }
  return nodeElement;
}

const toDom = (html) => {
  logger('todom');
  const dom = new JSDOM(`<!DOCTYPE html>${html}`);
  return domToNode(dom.window.document.body).children;
};
module.exports = { toDom };
