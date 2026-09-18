import 'express-async-errors';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import incomeRoutes from './routes/income.js';
import itemsRoutes from './routes/items.js';
import transactionsRoutes from './routes/transactions.js';
import debtsRoutes from './routes/debts.js';
import goalsRoutes from './routes/goals.js';
import budgetRoutes from './routes/budget.js';
import analyticsRoutes from './routes/analytics.js';
import dashboardRoutes from './routes/dashboard.js';
import settingsRoutes from './routes/settings.js';
import accountsRoutes from './routes/accounts.js';
import subscriptionsRoutes from './routes/subscriptions.js';
import peopleRoutes from './routes/people.js';
import tripsRoutes from './routes/trips.js';

const app = express();
const PORT = process.env.PORT || 3001;

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = [FRONTEND_URL, 'http://localhost', 'capacitor://localhost'];
app.use(cors({ 
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }, 
  credentials: true 
}));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/api/income', incomeRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/debts', debtsRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/people', peopleRoutes);
app.use('/api/trips', tripsRoutes);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Budget API running on http://localhost:${PORT}`);
});
