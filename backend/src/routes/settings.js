import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as settingsService from '../services/settingsService.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const settings = await settingsService.getSettings(req.userId);
  res.json(settings);
});

router.put('/', async (req, res) => {
  const updatedSettings = await settingsService.updateSettings(req.userId, req.body);
  res.json(updatedSettings);
});

export default router;
