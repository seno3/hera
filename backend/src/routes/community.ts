import { Router, Request, Response } from 'express';
import { query } from '../services/snowflake';

const router = Router();

router.post('/action', async (req: Request, res: Response) => {
  const { user_name, action_type, company_ticker } = req.body;
  if (!user_name || !action_type || !company_ticker) {
    return res.status(400).json({ error: 'user_name, action_type, company_ticker required' });
  }
  await query(
    `INSERT INTO user_actions (user_name, action_type, company_ticker) VALUES (?, ?, ?)`,
    [user_name, action_type, company_ticker.toUpperCase()]
  );
  res.json({ success: true });
});

router.get('/activity', async (_req: Request, res: Response) => {
  const rows = await query(
    `SELECT * FROM user_actions ORDER BY created_at DESC LIMIT 20`
  );
  res.json(rows.map(r => ({
    id: r.ID,
    user_name: r.USER_NAME,
    action_type: r.ACTION_TYPE,
    company_ticker: r.COMPANY_TICKER,
    created_at: r.CREATED_AT,
  })));
});

export default router;
