const {get} = require("node:https");
const {createWriteStream} = require("node:fs");
const {
    docsDir,
} = require('../../config/vars');

// const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
const fs = require('fs').promises;
const path = require('path');

async function convertPdfToHtml(pdfPath, outputDir) {
    try {
        const pdfjsLib = await import ('pdfjs-dist/legacy/build/pdf.mjs');
        // Ensure output directory exists
        // await fs.mkdir(outputDir, {recursive: true});

        // Load the PDF document
        const pdf = await pdfjsLib.getDocument(pdfPath).promise;

        // HTML template
        let htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>PDF Content</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .page { margin-bottom: 20px; border-bottom: 1px solid #ccc; }
        .text-content { white-space: pre-wrap; }
    </style>
</head>
<body>`;

        // Process each page
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);

            // Extract text content
            const textContent = await page.getTextContent();

            // Concatenate text items
            const pageText = textContent.items
                .map(item => item.str)
                .join(' ');

            // Add page to HTML
            htmlContent += `
      <div class="page" id="page-${pageNum}">
        <h2>Page ${pageNum}</h2>
        <div class="text-content">${pageText}</div>
      </div>`;
        }

        // Close HTML
        htmlContent += `
    </body>
</html>`;

        // Write HTML file
        // const outputPath = path.join(outputDir, 'converted-pdf.html');
        // await fs.writeFile(outputPath, htmlContent);

        // console.log(`PDF converted to HTML: ${outputPath}`);
        // return outputPath;
        return htmlContent;
    } catch (error) {
        console.error('Error converting PDF:', error);
        throw error;
    }
}

const pdfExport = async (path) => {
    const pdfjs = await import ('pdfjs-dist/legacy/build/pdf.mjs');
    let doc = await pdfjs.getDocument(path).promise;
    let page1 = await doc.getPage(1);
    let content = await page1.getTextContent();
    return content.items.map(function (item) {
        return item.str;
    });
}

const getTextFromPDF = (link) => {
    return new Promise((resolve, reject) => {
        get(link, (r) => {
            r.pipe(createWriteStream(`${docsDir}/tmp.pdf`));
            r.on('error', reject);
            r.on('end', () => {
                // return `${docsDir}/tmp.pdf`;
                resolve(`${docsDir}/tmp.pdf`);
                // pdfExport(`${docsDir}/tmp.pdf`).then(data => {
                //     console.log('data');
                //     console.log(data);
                // });
            });
        })
    })
}

module.exports = {getTextFromPDF, convertPdfToHtml};
