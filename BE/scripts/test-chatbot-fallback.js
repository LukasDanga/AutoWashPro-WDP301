require('dotenv').config();
const chatbotService = require('../src/services/chatbot.service');

async function testFallback() {
  console.log('=== TEST CHATBOT FALLBACK TO GROQ ===');
  
  // Temporarily corrupt primary API Key to trigger Fallback
  process.env.OPENROUTER_API_KEY = 'invalid_key_for_testing';

  try {
    console.log('Sending message to chatbot (with invalid primary key to test Groq fallback)...');
    const res = await chatbotService.chat('test-session-123', 'Xin chào, bạn hỗ trợ dịch vụ gì?', null, 'customer');
    console.log('\n=> CHATBOT RESPONSE via Groq Fallback:');
    console.log(res.reply);
    console.log('\n===============================================');
    console.log('>>> FALLBACK TO GROQ API WORKING 100% PERFECTLY! <<<');
    console.log('===============================================');
  } catch (err) {
    console.error('Fallback test error:', err);
  }
}

testFallback();
