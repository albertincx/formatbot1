const jsdom = require('jsdom');
const { make } = require('./mercury.controller');
const makeTelegaph = require('../utils/makeTelegaph');
const logger = require('../utils/logger');

const { JSDOM } = jsdom;

function domToNode(domNode) {
  if (domNode.nodeType == domNode.TEXT_NODE) {
    return domNode.data;
  }
  if (domNode.nodeType != domNode.ELEMENT_NODE) {
    return false;
  }
  var nodeElement = {};
  nodeElement.tag = domNode.tagName.toLowerCase();
  for (var i = 0; i < domNode.attributes.length; i++) {
    var attr = domNode.attributes[i];
    if (attr.name == 'href' || attr.name == 'src') {
      if (!nodeElement.attrs) {
        nodeElement.attrs = {};
      }
      nodeElement.attrs[attr.name] = attr.value;
    }
  }
  if (domNode.childNodes.length > 0) {
    nodeElement.children = [];
    for (var i = 0; i < domNode.childNodes.length; i++) {
      var child = domNode.childNodes[i];
      nodeElement.children.push(domToNode(child));
    }
  }
  return nodeElement;
}

const makeIvLink = async (link) => {
  let telegraphLink = '';
  const { title, content } = await make(link, false, true);
  let dom = new JSDOM(`<!DOCTYPE html>${content}`);
  const domEd = domToNode(dom.window.document.body).children;
  dom = JSON.stringify(domEd);
  logger(dom, 'domed.html');
  if (dom && dom.length) {
    logger(`domed ${dom.length}`);
    telegraphLink = await makeTelegaph(title, dom);
  }
  return telegraphLink;
};
exports.makeIvLink = makeIvLink;
