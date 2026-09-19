import { GoogleGenerativeAI } from '@google/generative-ai';

process.env.GEMINI_API_KEY = "dummy";
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

try {
  const chat = ai.getGenerativeModel({ model: 'gemini-1.5-flash' }).startChat();
  console.log("startChat ok");
  
  // mock response
  const response = {
    response: {
      functionCalls: () => [],
      text: () => "Hello"
    }
  };
  
  console.log("Type of functionCalls:", typeof response.response.functionCalls);
} catch(e) {
  console.error("err:", e);
}
