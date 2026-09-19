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

  // Cap token history to the last 10 messages to prevent infinite token growth
  const recentHistory = Array.isArray(history) ? history.slice(-10) : [];

  try {
    const aiResponse = await processChatMessage(userId, message, recentHistory);
    res.json({ 
      text: aiResponse.text,
      pendingTransaction: aiResponse.pendingTransaction 
    });
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ error: error.message || 'Internal server error while processing chat.' });
  }
});

export default router;
