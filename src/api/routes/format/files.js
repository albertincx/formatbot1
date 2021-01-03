const fs = require('fs');
const fetch = require('node-fetch');
const showdown = require('showdown');

const { uploadDir } = require('../../../config/vars');
const logger = require('../../utils/logger');

const FILESLAVE_MAXSIZE = parseInt(process.env.FILESLAVE_MAXSIZE, 10);

async function downloadFile(filename, urlLink) {
  const res = await fetch(urlLink);
  const fileStream = fs.createWriteStream(filename);
  return new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on('error', (err) => {
      reject(err);
    });
    fileStream.on('finish', () => {
      resolve();
    });
  });
}

const putFile = async (file) => {
  const filepath = `${uploadDir}/${file.file_name}`;
  const fileJson = `${uploadDir}/request.json`;
  const {
    file_id, mime_type, file_size, file_name,
  } = file;
  if (!mime_type.match(/^text\/|x-subrip|x-httpd-php|x-sh|application\/xml/)) {
    throw new Error(`file type (${mime_type}) not supported`);
  }
  if (file_size > FILESLAVE_MAXSIZE) {
    throw new Error(`Filesize too big ${file_size} > ${FILESLAVE_MAXSIZE}`);
  }
  const url = `https://api.telegram.org/bot${process.env.MAIN_TOKEN}/getFile?file_id=${file_id}`;
  await downloadFile(fileJson, url);
  const data = fs.readFileSync(fileJson).toString();
  let response = '';
  try {
    response = JSON.parse(data);
  } catch (e) {
    //
  }
  const fileUrl = `https://api.telegram.org/file/bot${process.env.MAIN_TOKEN}/${response.result.file_path}`;
  await downloadFile(filepath, fileUrl);
  let content = fs.readFileSync(filepath).toString();
  if (file_name.match(/\.md$/)) {
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
