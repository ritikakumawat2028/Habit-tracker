import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import apiRouter from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*', // Allow all origins for local development ease
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

app.use(express.json());

// Register API router
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health-check', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Start Express server right away so local API endpoints respond instantly
app.listen(PORT, () => {
  console.log(`🚀 GrowSync Backend running on http://localhost:${PORT}`);
});

mongoose.connect(process.env.MONGODB_URI as string, {
  serverSelectionTimeoutMS: 3000,
  bufferCommands: false,
})
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB. Backend running in offline/fallback mode.', err.message || err);
  });
