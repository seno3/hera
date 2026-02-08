import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';

const router = Router();

function runResolve(inputs: string[]): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['resolve.py', JSON.stringify(inputs)], {
      cwd: path.resolve(__dirname, '../../../ingestion'),
      timeout: 30000,
    });

    let out = '';
    let err = '';
    proc.stdout.on('data', (d) => { out += d.toString(); });
    proc.stderr.on('data', (d) => { err += d.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(err || `exit code ${code}`));
      try {
        resolve(JSON.parse(out.trim()));
      } catch {
        reject(new Error(`Invalid JSON: ${out}`));
      }
    });
    proc.on('error', reject);
  });
}

router.post('/', async (req: Request, res: Response) => {
  const { inputs } = req.body as { inputs: string[] };
  if (!inputs?.length) return res.status(400).json({ error: 'inputs required' });

  try {
    const results = await runResolve(inputs.slice(0, 20));
    res.json(results);
  } catch (e: any) {
    console.error('[resolve] Error:', e.message);
    res.status(500).json({ error: 'Resolution failed' });
  }
});

export default router;
