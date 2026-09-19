import express from 'express';
import { processChatMessage } from '../services/llmService.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

import { GoogleGenerativeAI } from '@google/generative-ai';

router.get('/models', async (req, res) => {
  try {
    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/chat', authenticate, async (req, res) => {
  const { message, history } = req.body;
  const userId = req.userId;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const aiResponse = await processChatMessage(userId, message, history);
    res.json({ text: aiResponse });
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ error: error.message || 'Internal server error while processing chat.' });
  }
});

export default router;
