import express from 'express';
import pool from '../db';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  const userId = (req as any).user.userId;
  const result = await pool.query('SELECT * FROM logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100', [userId]);
  res.json(result.rows);
});

export default router;
