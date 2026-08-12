const sanitizeHtml = require('sanitize-html');
const path = require('path');

const {REST_API} = require('../../config/vars');

const htmlParser = require('./readability');
const puppet = require('./puppet');
const {logger} = require('./logger');
const {
  fetchTimeout,
  timeout
} = require('./index');

const ASYNC_FILE = 'asyncContent.html';

const race = (promises) => Promise.race(promises);

function parseServices(link) {
  if (link.match(/^(https?:\/\/)?(www.)?google/)) {
    const found = link.match(/url=(.*?)($|&)/);
    if (found && found[1]) return found[1];
  }
  if (link.match(/\/turbo\?text=/)) {
    const found = link.match(/text=(.*?)($|&)/);
    if (found && found[1]) return found[1];
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
    this.parsed = new URL(link);
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
    let link = this.link;
    if (this.params.isCached) {
      link = `${REST_API}file?file=${ASYNC_FILE}`;
    }
    let html = '';
    if (!this.params.isPuppet) {
      html = await puppet(link, this.params);
      logger('pup html is ' + html.length);

      if (!this.params.isCached) {
        this.log(html, ASYNC_FILE);
      }
    }

    return html;
  }

  async fetchHtml(link) {
    logger('fetchHtml');
    logger(this.custom);
    logger(this.params.isCached);
    if (this.custom && !this.params.isCached) {
      //
    } else {
      logger(`custom skipping ${link}`);
      return '';
    }
    let content;
    logger(`this.params.isPuppet ${this.params.isPuppet}`);
    if (this.params.isPuppet) {
      content = await puppet(link, this.params);
      // logger('pup html 0 is ' + content.length);
      this.log(content, 'puppet.html');
    } else {
      try {
        content = await fetchTimeout(link)
          .then(r => r.text());
      } catch (e) {
        logger(e);
        content = '';
      }
      this.log(content, 'fetched_content.html');
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
      throw new Error('empty content fetch');
    }
    this.log(content, 'fixed_fetched.html');

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
    return content;
    // if (!content) {
    //   return Promise.resolve(false);
    // }
    // return fixImages.fixHtml(content, iframe, this.parsed, this.params);
  }

  log(content, file) {
    let _len = content && content.length;
    logger(`len - ${_len} ${_len < 1000 && content}`);
    if (this.params.isadmin) {
      logger(content, file);
    }
  }

  async parse() {
    const userUrl = this.link;
    const opts = {};
    const fetchedDocument = await this.fetchHtml(userUrl);
    if (fetchedDocument) {
      opts.html = Buffer.from(fetchedDocument);
    }

    let result = {};
    if (this.params.isCached) {
      const cf = this.params.cachefile;
      const cacheFile = cf || 'parsed.html';
      this.log('html from cache');
      result.content = `${fs.readFileSync(`.conf/${cacheFile}`)}`;
    } else {
      result = await htmlParser(userUrl, opts);
      if (result && typeof result === 'object') this.log(result.content, 'parsed.html');
    }

    let {content} = result || {};
    this.log(content, 'before_content.html');

    let preContent = sanitizeHtml(content);
    if (typeof preContent === 'string') {
      preContent = preContent.trim();
    }

    if (preContent.length === 0) {
      const html = await this.puppet(userUrl);
      if (html) {
        result = await htmlParser(userUrl, {html: Buffer.from(html)});
        if (result && typeof result === 'object') this.log(result.content, 'parsedAsyncContent.html');
      }
    }
    const {url: source, iframe} = result || {};

    let {title = ''} = result || {};
    if (iframe) {
      this.log(iframe, 'iframes.html');
    }
    if (this.title) title = this.title;

    if (result) content = result.content;
    const data = await race([
      this.fixHtml(content, iframe),
      timeout(7)
    ]);
    logger('typeof data ' + typeof data);
    if (typeof data === 'string' && data) {
      content = this.fixImages(data);
      this.log(content, 'after_content.html');
      logger(`after clean ${content.length}`);
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
