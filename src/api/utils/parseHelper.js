const fs = require('fs');
const Mercury = require('@postlight/mercury-parser');
const sanitizeHtml = require('sanitize-html');
const path = require('path');
const url = require('url');
const fetch = require('isomorphic-fetch');

const mercury = require('./mercury');
const fixImages = require('./fixImages');
const puppet = require('./puppet');

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
    this.log(JSON.stringify(params), 'params.txt');
    this.custom = this.checkCustom();
  }

  getExtractor() {
    if (!this.domain) return false;
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

    return {...e};
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

  async fetchHtml() {
    let content;
    this.log(`this.params.isPuppet ${this.params.isPuppet}`);
    if (this.params.isPuppet) {
      content = await puppet(this.link, this.params);
      this.log(content, 'puppet.html');
    } else {
      content = await fetch(this.link, {timeout: 5000}).then(r => r.text());
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
    if (process.env.DEV || this.params.isadmin) {
      if (file) {
        fs.writeFileSync(`.conf/${file}`, content);
      } else {
        console.log(content);
      }
    }
  }

  async parseContent(html) {
    if (!html) return '';
    try {
      const {content} = await mercury(
        'https://albertincx-formatbot1.glitch.me/',
        {
          html: Buffer.from(html),
        },
      );
      this.log(content, 'mercuryFileContent.html');
      return content;
    } catch (e) {
      //
    }
    return '';
  }

  async parse() {
    const userUrl = this.link;
    const opts = {};
    if (this.custom && !this.params.isCached) {
      const html = await this.fetchHtml();
      if (!html) {
        throw new Error('empty content');
      }
      this.log(html, 'fixedFetched.html');
      opts.html = Buffer.from(html);
    }
    const extractor = this.getExtractor();
    if (extractor) {
      this.log(extractor);
      Mercury.addExtractor(extractor);
    }
    let result = {};
    if (this.params.isCached) {
      const cf = this.params.cachefile;
      const cacheFile = cf || 'mercury.html';
      this.log('html from cache');
      result.content = `${fs.readFileSync(`.conf/${cacheFile}`)}`;
    } else {
      result = await mercury(userUrl, opts);
      this.log(result.content, 'mercury.html');
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
      source,
    };
  }
}

module.exports = ParseHelper;
