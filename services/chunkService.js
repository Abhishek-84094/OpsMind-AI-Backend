// Simple text chunker

const splitTextIntoChunks = (text, chunkSize = 800, overlap = 150) => {
  const chunks = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const endIndex = startIndex + chunkSize;

    chunks.push(text.slice(startIndex, endIndex));

    startIndex += chunkSize - overlap;
  }

  return chunks;
};

module.exports = {
  splitTextIntoChunks,
};