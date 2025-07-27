
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PORT } from './config';
import authRoutes from './routes/auth';
import workflowRoutes from './routes/workflows';
import integrationRoutes from './routes/integrations';
import logRoutes from './routes/logs';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use('/api/auth', authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/logs', logRoutes);

app.listen(PORT, () => {
  console.log(`AutoFlow backend running on port ${PORT}`);
});
