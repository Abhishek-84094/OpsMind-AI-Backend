const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testAPIKey() {
  try {
    console.log("🧪 Testing Gemini API Key...\n");

    const apiKey = "AIzaSyCBuQKn2d95TKlUaq70xoAzivNdSwKQB_o";
    
    if (!apiKey) {
      console.log("❌ API Key is empty\n");
      process.exit(1);
    }

    console.log("✓ API Key provided\n");

    const genAI = new GoogleGenerativeAI(apiKey);

    // Test with gemini-2.0-flash
    console.log("Testing gemini-2.0-flash model...\n");
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash"
    });

    const result = await model.generateContent("What is 2+2? Answer in one word.");
    const response = await result.response;
    const text = response.text();
    
    console.log("✅ API KEY IS WORKING!\n");
    console.log(`Response: "${text}"\n`);
    console.log("✓ Your API key is valid and working");
    console.log("✓ gemini-2.0-flash model is accessible");
    console.log("✓ You can now use the system!\n");

    process.exit(0);

  } catch (error) {
    console.log("❌ API KEY TEST FAILED\n");
    console.log(`Error: ${error.message}\n`);
    
    if (error.message.includes("404")) {
      console.log("Issue: Model not found");
    } else if (error.message.includes("429")) {
      console.log("Issue: Rate limit exceeded or quota exceeded");
    } else if (error.message.includes("401") || error.message.includes("403")) {
      console.log("Issue: Invalid API key or no access");
    }
    
    console.log("\nSolution:");
    console.log("1. Go to https://aistudio.google.com/app/apikey");
    console.log("2. Create a new API key");
    console.log("3. Make sure billing is enabled");
    console.log("4. Update the key in .env file\n");

    process.exit(1);
  }
}

testAPIKey();
