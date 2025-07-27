import express from 'express';
import pool from '../db';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  const userId = (req as any).user.userId;
  const result = await pool.query('SELECT * FROM workflows WHERE user_id = $1', [userId]);
  res.json(result.rows);
});

router.post('/', authenticateToken, async (req, res) => {
  const userId = (req as any).user.userId;
  const { name, steps } = req.body;
  const result = await pool.query(
    'INSERT INTO workflows (user_id, name, steps, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *',
    [userId, name, JSON.stringify(steps)]
  );
  res.json(result.rows[0]);
});

export default router;
