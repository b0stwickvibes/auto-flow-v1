import express from 'express';
import pool from '../db';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  const userId = (req as any).user.userId;
  const result = await pool.query('SELECT * FROM integrations WHERE user_id = $1', [userId]);
  res.json(result.rows);
});

// OAuth endpoints for Gmail, Drive, GitHub would go here

export default router;
