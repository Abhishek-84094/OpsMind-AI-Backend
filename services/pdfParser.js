const pdfParse = require("pdf-parse");
const fs = require("fs");

class PDFParser {
  async extractText(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return {
        text: data.text,
        pages: data.numpages,
        metadata: data.metadata,
      };
    } catch (err) {
      throw new Error(`PDF parsing failed: ${err.message}`);
    }
  }

  async getPageCount(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.numpages;
    } catch (err) {
      throw new Error(`Failed to get page count: ${err.message}`);
    }
  }

  cleanText(text) {
    return text
      .replace(/\s+/g, " ")
      .replace(/\n+/g, " ")
      .trim();
  }
}

module.exports = new PDFParser();
