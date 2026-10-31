const {get} = require("node:https");
const {createWriteStream} = require("node:fs");
const {
    docsDir,
} = require('../../config/vars');

// const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
const fs = require('fs').promises;
const path = require('path');

const escapeHtml = (str) =>
    String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

async function convertPdfToHtml(pdfPath, outputDir) {
    try {
        const pdfjsLib = await import ('pdfjs-dist/legacy/build/pdf.mjs');
        const data = new Uint8Array(await fs.readFile(pdfPath));

        // Load the PDF document
        const pdf = await pdfjsLib.getDocument({data}).promise;

        // HTML template
        let htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>PDF Content</title>
</head>
<body>`;

        // Process each page
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);

            // Extract text content
            const textContent = await page.getTextContent();

            // Build lines/paragraphs using hasEOL or empty str items
            const lines = [];
            let currentLine = '';
            for (const item of textContent.items) {
                const str = item.str || '';
                if (!str && item.hasEOL) {
                    if (currentLine.trim()) {
                        lines.push(currentLine.trim());
                        currentLine = '';
                    }
                    continue;
                }
                currentLine += (currentLine && str ? ' ' : '') + str;
                if (item.hasEOL) {
                    if (currentLine.trim()) {
                        lines.push(currentLine.trim());
                        currentLine = '';
                    }
                }
            }
            if (currentLine.trim()) {
                lines.push(currentLine.trim());
            }

            const paragraphs = lines.length
                ? lines.map(line => `<p>${escapeHtml(line)}</p>`).join('\n        ')
                : `<p>${escapeHtml(textContent.items.map(item => item.str).join(' '))}</p>`;

            // Add page to HTML using Telegra.ph-compatible tags (h3, p)
            htmlContent += `
      <h3>Page ${pageNum}</h3>
      ${paragraphs}`;
        }

        // Close HTML
        htmlContent += `
    </body>
</html>`;

        return htmlContent;
    } catch (error) {
        console.error('Error converting PDF:', error);
        throw error;
    }
}

const pdfExport = async (filePath) => {
    const pdfjs = await import ('pdfjs-dist/legacy/build/pdf.mjs');
    const data = new Uint8Array(await fs.readFile(filePath));
    let doc = await pdfjs.getDocument({data}).promise;
    let page1 = await doc.getPage(1);
    let content = await page1.getTextContent();
    return content.items.map(function (item) {
        return item.str;
    });
}

const getTextFromPDF = (link) => {
    return new Promise((resolve, reject) => {
        get(link, (r) => {
            const filePath = `${docsDir}/tmp.pdf`;
            const stream = createWriteStream(filePath);
            r.pipe(stream);
            r.on('error', reject);
            stream.on('error', reject);
            stream.on('finish', () => {
                resolve(filePath);
            });
        }).on('error', reject);
    });
}

const getTextFromMd = (link) => {
    return new Promise((resolve, reject) => {
        get(link, (r) => {
            const filePath = `${docsDir}/tmp.md`;
            const stream = createWriteStream(filePath);
            r.pipe(stream);
            r.on('error', reject);
            stream.on('error', reject);
            stream.on('finish', () => {
                resolve(filePath);
            });
        }).on('error', reject);
    });
};

async function convertMdToHtml(mdPath) {
    try {
        const mdText = await fs.readFile(mdPath, 'utf8');
        const escapeHtml = (str) =>
            str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

        const lines = mdText.split(/\r?\n/);
        const paragraphs = lines
            .map(line => `<p>${escapeHtml(line) || '<br>'}</p>`)
            .join('\n');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>MD Content</title>
</head>
<body>
${paragraphs}
</body>
</html>`;
    } catch (error) {
        console.error('Error converting MD:', error);
        throw error;
    }
}

module.exports = {getTextFromPDF, convertPdfToHtml, getTextFromMd, convertMdToHtml};
