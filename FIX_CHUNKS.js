const mongoose = require("mongoose");
const Chunk = require("./models/Chunk");
const Document = require("./models/Document");
require("dotenv").config();

async function fixChunks() {
  try {
    console.log("🔧 Fixing existing chunks...\n");

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✓ Connected to MongoDB\n");

    // Get all chunks without documentFilename
    const chunksToFix = await Chunk.find({
      $or: [
        { documentFilename: { $exists: false } },
        { documentFilename: null },
        { documentFilename: "" }
      ]
    });

    console.log(`Found ${chunksToFix.length} chunks to fix\n`);

    let fixed = 0;
    let failed = 0;

    for (const chunk of chunksToFix) {
      try {
        // Get document
        const doc = await Document.findById(chunk.documentId);
        
        if (doc) {
          // Update chunk with documentFilename
          await Chunk.findByIdAndUpdate(chunk._id, {
            documentFilename: doc.originalName
          });
          fixed++;
          console.log(`✓ Fixed chunk: ${doc.originalName}`);
        } else {
          failed++;
          console.log(`❌ Document not found for chunk: ${chunk._id}`);
        }
      } catch (err) {
        failed++;
        console.log(`❌ Error fixing chunk: ${err.message}`);
      }
    }

    console.log(`\n✓ Fixed: ${fixed}`);
    console.log(`❌ Failed: ${failed}\n`);

    // Verify embeddings
    console.log("🔍 Verifying embeddings...\n");

    const allChunks = await Chunk.find();
    let withEmbeddings = 0;
    let withoutEmbeddings = 0;

    allChunks.forEach(chunk => {
      if (chunk.embedding && chunk.embedding.length > 0) {
        withEmbeddings++;
      } else {
        withoutEmbeddings++;
      }
    });

    console.log(`✓ Chunks with embeddings: ${withEmbeddings}`);
    console.log(`❌ Chunks without embeddings: ${withoutEmbeddings}\n`);

    if (withoutEmbeddings > 0) {
      console.log("⚠️  Some chunks don't have embeddings!");
      console.log("   Please re-upload the PDF to generate embeddings.\n");
    }

    console.log("✅ Migration complete!\n");
    process.exit(0);

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

fixChunks();
