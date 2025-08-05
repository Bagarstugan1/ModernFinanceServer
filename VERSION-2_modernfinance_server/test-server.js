// Quick test to verify the server setup
const axios = require('axios');

async function testServer() {
  try {
    console.log('Testing server health check...');
    const response = await axios.get('http://localhost:3000/health');
    console.log('✅ Health check passed:', response.data);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
}

// Give instructions
console.log('To test the server:');
console.log('1. Copy .env.example to .env and add your API keys');
console.log('2. Run: npm run dev');
console.log('3. In another terminal, run: node test-server.js');
console.log('\nMake sure to have your API keys set in the .env file.');