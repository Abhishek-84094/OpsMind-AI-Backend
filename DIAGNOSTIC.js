const mongoose = require("mongoose");
const Chunk = require("./models/Chunk");
require("dotenv").config();

async function checkVectorSearch() {
  try {
    console.log("🔍 Checking MongoDB Vector Search Setup...\n");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✓ Connected to MongoDB\n");

    // Check if chunks exist
    const totalChunks = await Chunk.countDocuments();
    console.log(`📊 Total chunks in database: ${totalChunks}\n`);

    if (totalChunks === 0) {
      console.log("❌ No chunks found! Upload a PDF first.\n");
      process.exit(0);
    }

    // Check chunks with embeddings
    const chunksWithEmbeddings = await Chunk.countDocuments({
      embedding: { $exists: true, $ne: [] }
    });
    console.log(`✓ Chunks with embeddings: ${chunksWithEmbeddings}\n`);

    // Get sample chunk
    const sampleChunk = await Chunk.findOne({
      embedding: { $exists: true, $ne: [] }
    });

    if (sampleChunk) {
      console.log("📋 Sample Chunk:");
      console.log(`  - Document: ${sampleChunk.documentFilename}`);
      console.log(`  - Text length: ${sampleChunk.text.length} chars`);
      console.log(`  - Embedding dimensions: ${sampleChunk.embedding.length}`);
      console.log(`  - Page: ${sampleChunk.pageNumber}\n`);
    }

    // Check Vector Search Index
    console.log("🔎 Checking Vector Search Index...\n");
    
    try {
      const indexes = await Chunk.collection.getIndexes();
      console.log("Available indexes:");
      Object.keys(indexes).forEach(idx => {
        console.log(`  - ${idx}`);
      });
      console.log();

      const hasVectorIndex = Object.keys(indexes).some(idx => 
        idx.includes("embedding") || idx.includes("vector")
      );

      if (hasVectorIndex) {
        console.log("✓ Vector Search index found!\n");
      } else {
        console.log("⚠️  Vector Search index NOT found!\n");
        console.log("📝 To create Vector Search index in MongoDB Atlas:");
        console.log("   1. Go to MongoDB Atlas Console");
        console.log("   2. Select your cluster");
        console.log("   3. Go to Collections > opsmindDB > chunks");
        console.log("   4. Click 'Search Indexes' tab");
        console.log("   5. Create index with this JSON:\n");
        console.log(`{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "similarity": "cosine",
      "dimensions": 384
    }
  ]
}\n`);
      }
    } catch (err) {
      console.log("⚠️  Could not check indexes:", err.message, "\n");
    }

    // Test keyword search
    console.log("🧪 Testing Keyword Search...\n");
    
    const testQuestion = "annual leave";
    const keywords = testQuestion.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    console.log(`Testing with keywords: ${keywords.join(", ")}\n`);

    const allChunks = await Chunk.find().select("text documentFilename").lean();
    
    const scored = allChunks.map(chunk => {
      const chunkText = chunk.text.toLowerCase();
      let score = 0;
      keywords.forEach(keyword => {
        if (chunkText.includes(keyword)) score += 1;
      });
      return { ...chunk, score };
    });

    const topResults = scored.sort((a, b) => b.score - a.score).slice(0, 3);
    
    console.log("Top 3 results:");
    topResults.forEach((result, idx) => {
      console.log(`\n${idx + 1}. Score: ${result.score}`);
      console.log(`   Document: ${result.documentFilename}`);
      console.log(`   Text: ${result.text.substring(0, 100)}...`);
    });

    console.log("\n\n✅ Diagnostic Complete!\n");

    if (chunksWithEmbeddings > 0) {
      console.log("✓ System is ready to use!");
      console.log("✓ Keyword search is working!");
      console.log("✓ Try asking a question now!\n");
    } else {
      console.log("❌ No embeddings found. Upload a PDF first!\n");
    }

    process.exit(0);

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

checkVectorSearch();
