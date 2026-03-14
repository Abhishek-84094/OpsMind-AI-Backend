const pdfParse = require("pdf-parse");
const fs = require("fs");

const Document = require("../models/Document");
const Chunk = require("../models/Chunk");

const { generateEmbedding } = require("../services/embeddingService");
const logger = require("../utils/logger");

// ================= UPLOAD DOCUMENT WITH EMBEDDING =================
exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    logger.info(`Starting document upload: ${req.file.originalname}`);

    // Read PDF
    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);

    // Create document
    const document = await Document.create({
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      uploadedBy: req.user._id,
      totalPages: pdfData.numpages,
      status: "processing"
    });

    logger.info(`Document created: ${document._id}, Pages: ${pdfData.numpages}`);

    // Extract and clean text
    let fullText = pdfData.text || "";
    
    // Remove extra whitespace and normalize
    fullText = fullText
      .replace(/\s+/g, " ")
      .replace(/\n+/g, " ")
      .trim();

    logger.info(`Extracted text length: ${fullText.length} characters`);

    if (!fullText || fullText.length < 50) {
      logger.error("PDF has insufficient text content");
      await Document.findByIdAndUpdate(document._id, { status: "failed" });
      return res.status(400).json({
        success: false,
        message: "PDF has no readable text content"
      });
    }

    // Split into better chunks - smaller chunks for better matching
    const chunks = [];
    const chunkSize = 500; // Smaller chunks
    const overlap = 100;
    
    let startIndex = 0;
    while (startIndex < fullText.length) {
      const endIndex = Math.min(startIndex + chunkSize, fullText.length);
      const chunkText = fullText.slice(startIndex, endIndex).trim();
      
      if (chunkText.length > 50) { // Only add meaningful chunks
        chunks.push(chunkText);
      }
      
      startIndex += chunkSize - overlap;
    }

    logger.info(`Created ${chunks.length} chunks from PDF`);

    if (chunks.length === 0) {
      logger.error("No valid chunks created");
      await Document.findByIdAndUpdate(document._id, { status: "failed" });
      return res.status(400).json({
        success: false,
        message: "Failed to process PDF content"
      });
    }

    // Generate embeddings for each chunk
    const chunkIds = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      
      try {
        logger.info(`Processing chunk ${i + 1}/${chunks.length}...`);
        
        // Generate embedding
        const embedding = await generateEmbedding(chunkText);

        if (!embedding || embedding.length === 0) {
          logger.warn(`Empty embedding for chunk ${i + 1}`);
          failCount++;
          continue;
        }

        // Create chunk with embedding
        const chunk = await Chunk.create({
          documentId: document._id,
          documentFilename: req.file.originalname,
          text: chunkText,
          pageNumber: Math.floor((i / chunks.length) * pdfData.numpages) + 1,
          embedding: embedding,
          embeddingCached: true
        });

        chunkIds.push(chunk._id);
        successCount++;
        logger.info(`✓ Chunk ${i + 1} created with embedding`);

      } catch (err) {
        logger.error(`Failed to process chunk ${i + 1}: ${err.message}`);
        failCount++;
      }
    }

    // Update document status
    await Document.findByIdAndUpdate(document._id, { status: "processed" });

    logger.info(`✓ Document processed: ${successCount} chunks with embeddings, ${failCount} failed`);

    if (successCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Failed to process document. No chunks created."
      });
    }

    res.status(201).json({
      success: true,
      message: `✓ Document uploaded successfully! ${successCount} chunks processed.`,
      data: {
        document,
        chunksCreated: successCount,
        chunksFailed: failCount,
        status: "processed"
      }
    });

  } catch (error) {
    logger.error(`Upload error: ${error.message}`);
    next(error);
  }
};

// ================= GET DOCUMENT DETAILS =================
exports.getDocumentDetails = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    const chunks = await Chunk.find({ documentId }).select("pageNumber text embedding");

    const chunksWithEmbeddings = chunks.filter(c => c.embedding && c.embedding.length > 0).length;

    res.json({
      success: true,
      data: {
        document,
        chunks,
        totalChunks: chunks.length,
        chunksWithEmbeddings: chunksWithEmbeddings
      }
    });
  } catch (error) {
    logger.error(`Get document details error: ${error.message}`);
    next(error);
  }
};
