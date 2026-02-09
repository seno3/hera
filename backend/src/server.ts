import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import companiesRouter from './routes/companies';
import portfolioRouter from './routes/portfolio';
import communityRouter from './routes/community';
import resolveRouter from './routes/resolve';
import plaidRouter from './routes/plaid';
import nessieRouter from './routes/nessie';
import reviewsRouter from './routes/reviews';
import { connectMongo } from './services/mongodb';

const app = express();

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',')
  : [];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, health checks)
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/companies', companiesRouter);
app.use('/api', companiesRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/community', communityRouter);
app.use('/api/resolve', resolveRouter);
app.use('/api/plaid', plaidRouter);
app.use('/api/nessie', nessieRouter);
app.use('/api/reviews', reviewsRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;

connectMongo().then(() => {
  app.listen(PORT, () => console.log(`Hera backend running on port ${PORT}`));
});
