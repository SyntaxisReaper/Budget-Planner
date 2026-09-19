import express from 'express';
import { processChatMessage } from '../services/llmService.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

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
    res.status(500).json({ error: 'Internal server error while processing chat.' });
  }
});

export default router;
