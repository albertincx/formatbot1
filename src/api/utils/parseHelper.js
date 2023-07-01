const fs = require('fs');
const Mercury = require('@postlight/mercury-parser');
const {Readability} = require('@mozilla/readability');
const sanitizeHtml = require('sanitize-html');
const path = require('path');
const url = require('url');
const fetch = require('isomorphic-fetch');

const mercury = require('./mercury');
const fixImages = require('./fixImages');
const puppet = require('./puppet');
const {getDom} = require('./dom');
const logger = require('./logger');

const ASYNC_FILE = 'asyncContent.html';
const API = process.env.REST_API;

function parseServices(link) {
  if (link.match(/^(https?:\/\/)?(www.)?google/)) {
    const l = link.match(/url=(.*?)($|&)/);
    if (l && l[1]) return l[1];
  }
  if (link.match(/\/turbo\?text=/)) {
    const l = link.match(/text=(.*?)($|&)/);
    if (l && l[1]) return l[1];
  }
  return link;
}

class ParseHelper {
  constructor(linkParam, params = {}) {
    let link = parseServices(linkParam);
    if (!link.match(/^http/)) {
      link = `http://${link}`;
    }
    if (link.match(/%3A/)) {
      link = decodeURIComponent(link);
    }
    const matches = link.match(/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i);
    this.domain = matches && matches[1];
    this.parsed = url.parse(link);
    const {host} = this.parsed;
    const {dir = ''} = path.parse(link);
    if (dir.match(/:\/\/./)) {
      this.parsed.dir = dir;
    }
    this.link = link;
    this.host = host;
    this.fb = false;
    this.sites = {};
    this.title = '';
    this.params = params;
    this.custom = this.checkCustom();
  }

  addExtractor() {
    if (!this.domain) return;
    const e = {
      domain: this.domain,
      extend: {
        iframe: {
          selectors: [['iframe[src*=youtube]', 'src']],
          allowMultiple: true,
        },
      },
    };
    let selectors = null;
    if (this.fb) {
      selectors = ['.userContentWrapper'];
    }

    if (this.sites.vk) {
      selectors = ['.wall_text'];
    }
    if (this.params.content) {
      selectors = [this.params.content];
    }
    if (selectors) {
      e.content = {selectors};
    }
    if (e) {
      Mercury.addExtractor(e);
    }
  }

  checkCustom() {
    if (this.host.match(/facebook\.com/)) {
      this.fb = true;
      return true;
    }
    if (this.host.match(/(^t|https?:\/\/t)\.co/)) {
      return true;
    }
    if (this.host.match(/vk\.com/)) {
      this.sites.vk = true;
    }
    if (this.host.match(/cnn\.com/)) {
      this.sites.cnn = true;
    }
    return this.params.isCustom || this.params.isPuppet;
  }

  async puppet() {
    let l = this.link;
    if (this.params.isCached) {
      l = `${API}file?file=${ASYNC_FILE}`;
    }
    let html = '';
    if (!this.params.isPuppet) {
      html = await puppet(l, this.params);
      if (!this.params.isCached) {
        this.log(html, ASYNC_FILE);
      }
    }
    return html;
  }

  async fetchHtml(link) {
    if (this.params.mozilla || (this.custom && !this.params.isCached)) {
      //
    } else {
      return '';
    }
    let content;
    this.log(`this.params.isPuppet ${this.params.isPuppet}`);
    if (this.params.isPuppet) {
      content = await puppet(link, this.params);
      this.log(content, 'puppet.html');
    } else {
      try {
        content = await fetch(link, {timeout: 5000}).then(r => r.text());
      } catch (e) {
        content = '';
      }
      this.log(content, 'fetchContent.html');
    }
    if (this.fb) {
      const title = content.match(/<title.*>([^<]+\/?)/);
      if (title && title[1]) {
        this.title = title[1].substring(0, 100);
      }
      content = content.replace(/<!-- </g, '<');
      content = content.replace(/> --!>/g, '>');
    }
    if (content) {
      content = content.replace(/<br\s?\/>\n<br\s?\/>/gm, '\n<p></p>');
    }
    if (!content) {
      throw new Error('empty content');
    }
    this.log(content, 'fixedFetched.html');

    return content;
  }

  fixImages(content) {
    if (this.sites.cnn) {
      const match = /cnn\/(.*?)\/http/g;
      const replaces = content.match(match);
      if (replaces) {
        return content.replace(match, 'cnn/q_auto,w_727,c_fit/http');
      }
    }
    return content;
  }

  fixHtml(content, iframe) {
    return fixImages.fixHtml(content, iframe, this.parsed, this.params);
  }

  log(content, file) {
    if (this.params.isadmin) {
      logger(content, file);
    }
  }

  async parse() {
    const mozillaParserEnabled = this.params.mozilla;
    const userUrl = this.link;
    const opts = {};
    const fetchedDocument = await this.fetchHtml(userUrl);
    if (fetchedDocument) {
      opts.html = Buffer.from(fetchedDocument);
    }
    if (!mozillaParserEnabled) {
      this.addExtractor();
    }

    let result = {};
    if (this.params.isCached) {
      const cf = this.params.cachefile;
      const cacheFile = cf || 'mercury.html';
      this.log('html from cache');
      result.content = `${fs.readFileSync(`.conf/${cacheFile}`)}`;
    } else {
      // eslint-disable-next-line
      if (mozillaParserEnabled) {
        result = new Readability(getDom(opts.html)).parse();
        logger('mozilla');
        this.log(result.content, 'mercury.html');
      } else {
        result = await mercury(userUrl, opts);
        this.log(result.content, 'mercury.html');
      }
    }
    let {content} = result;
    let preContent = sanitizeHtml(content);
    if (typeof preContent === 'string') {
      preContent = preContent.trim();
    }
    this.log(preContent, 'preContent.html');
    if (preContent.length === 0) {
      const html = await this.puppet(userUrl);
      if (html) {
        result = await mercury(userUrl, {html: Buffer.from(html)});
        this.log(result.content, 'mercuryAsyncContent.html');
      }
    }
    const {url: source, iframe} = result;
    let {title = ''} = result;
    if (iframe) {
      this.log(iframe, 'iframes.html');
    }
    if (this.title) {
      title = this.title;
    }
    content = result.content;
    if (content) {
      content = await this.fixHtml(content, iframe);
      content = this.fixImages(content);
      this.log(content, 'tg_content.html');
      this.log(`after san ${content.length}`);
    }
    title = title && title.trim();
    title = title || 'Untitled article';

    return {
      title,
      content,
      source: source || userUrl,
    };
  }
}

module.exports = ParseHelper;
