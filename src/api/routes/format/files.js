const fs = require('fs');
const fetch = require('node-fetch');
const showdown = require('showdown');

const {uploadDir} = require('../../../config/vars');
const logger = require('../../utils/logger');

const FILE_MAXSIZE = parseInt(process.env.FILE_MAXSIZE, 10);

async function downloadFile(filename, urlLink) {
  const res = await fetch(urlLink);
  const fileStream = fs.createWriteStream(filename);
  return new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on('error', err => {
      reject(err);
    });
    fileStream.on('finish', () => {
      resolve();
    });
  });
}

const putFile = async file => {
  const filepath = `${uploadDir}/${file.file_name}`;
  const fileJson = `${uploadDir}/request.json`;
  const {
    file_id: fId,
    mime_type: mType,
    file_size: fSize,
    file_name: fName,
  } = file;
  if (!mType.match(/^text\/|x-subrip|x-httpd-php|x-sh|application\/xml/)) {
    throw new Error(`file type (${mType}) not supported`);
  }
  if (fSize > FILE_MAXSIZE) {
    throw new Error(`File size too big ${fSize} > ${FILE_MAXSIZE}`);
  }
  const url = `https://api.telegram.org/bot${process.env.MAIN_TOKEN}/getFile?file_id=${fId}`;
  await downloadFile(fileJson, url);
  const data = fs.readFileSync(fileJson).toString();
  let response = {};
  try {
    response = JSON.parse(data);
  } catch (e) {
    //
  }
  if (!response.result) {
    return {
      content: '',
      isHtml: false,
    };
  }

  const fileUrl = `https://api.telegram.org/file/bot${process.env.MAIN_TOKEN}/${response.result.file_path}`;
  await downloadFile(filepath, fileUrl);
  let content = fs.readFileSync(filepath).toString();
  if (fName.match(/\.md$/)) {
    const converter = new showdown.Converter();
    content = converter.makeHtml(content);
    content = `<html lang="en"><head><title>You have been blocked</title><body>${content}</body></html>`;
  }
  logger(content, 'fileContent.html');
  const isHtml = /<[a-z][\s\S]*>/i.test(content);
  return {
    content,
    isHtml,
  };
};

module.exports.putFile = putFile;
