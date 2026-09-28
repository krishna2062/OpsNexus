import express from 'express';
import path from 'path';
import cors from 'cors';
import apiRouter from './routes/api';

export const app = express();

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const uploadsDir = isVercel ? path.resolve('/tmp', 'uploads') : path.resolve(process.cwd(), 'uploads');

// Basic security and parsing middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Uploads directory for file storage
app.use('/uploads', express.static(uploadsDir));

// Health check endpoint
const healthHandler = (_req: express.Request, res: express.Response) => {
  res.json({
    status: 'healthy',
    app: 'OpsNexus Enterprise System',
    environment: process.env.NODE_ENV || (isVercel ? 'production-serverless' : 'development'),
    time: new Date().toISOString(),
  });
};

app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// Mount API router on both /api and root router to ensure compatibility with all serverless rewrite modes
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
