import { GoogleGenerativeAI } from '@google/generative-ai';

process.env.GEMINI_API_KEY = "dummy_key";
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

try {
  const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const chat = model.startChat();
  
  await chat.sendMessage("test").catch(e => {
    console.error("SendMessage Error:", e.message);
  });
} catch (e) {
  console.error("Create Error:", e.message);
}
