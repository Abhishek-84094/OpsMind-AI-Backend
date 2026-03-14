const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function testGeminiAPI() {
  try {
    console.log("🧪 Testing Gemini API...\n");

    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.log("❌ GEMINI_API_KEY not found in .env\n");
      process.exit(1);
    }

    console.log("✓ API Key found\n");

    const genAI = new GoogleGenerativeAI(apiKey);

    // Test different models
    const modelsToTest = [
      "gemini-pro",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
      "gemini-1.0-pro",
      "gemini-2.0-flash"
    ];

    console.log("Testing models:\n");

    for (const modelName of modelsToTest) {
      try {
        console.log(`Testing ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const result = await model.generateContent("Say 'Hello' in one word");
        const response = await result.response;
        const text = response.text();
        
        console.log(`✓ ${modelName} - WORKS!\n`);
        console.log(`  Response: "${text}"\n`);
        
        console.log(`\n✅ Use this model: ${modelName}\n`);
        process.exit(0);
        
      } catch (err) {
        console.log(`❌ ${modelName} - ${err.message.split('\n')[0]}\n`);
      }
    }

    console.log("❌ No working models found!\n");
    console.log("Possible issues:");
    console.log("1. API key is invalid or expired");
    console.log("2. API key doesn't have access to Gemini models");
    console.log("3. Billing not enabled on Google Cloud project\n");
    console.log("Solution:");
    console.log("1. Go to https://aistudio.google.com/app/apikey");
    console.log("2. Create a new API key");
    console.log("3. Update GEMINI_API_KEY in .env\n");

    process.exit(1);

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

testGeminiAPI();
