import { spawn } from 'child_process';
import path from 'path';

interface Job {
  status: 'processing' | 'complete' | 'error';
  startedAt: Date;
  ticker: string;
  error?: string;
}

// Track jobs by ticker so status endpoint can look them up
const jobsByTicker = new Map<string, Job>();

export function startAnalysis(ticker: string): string {
  const jobId = `${ticker}-${Date.now()}`;
  const job: Job = { status: 'processing', startedAt: new Date(), ticker };
  jobsByTicker.set(ticker, job);

  const ingestionDir = path.resolve(__dirname, '../../../ingestion');
  const proc = spawn('python3', ['run.py', '--ticker', ticker], { cwd: ingestionDir });

  let stderr = '';
  proc.stdout.on('data', (d) => console.log(`[${ticker}] ${d}`));
  proc.stderr.on('data', (d) => {
    const msg = d.toString();
    stderr += msg;
    console.error(`[${ticker}] ${msg}`);
  });

  proc.on('close', (code) => {
    const j = jobsByTicker.get(ticker);
    if (j) {
      if (code === 0) {
        j.status = 'complete';
      } else {
        j.status = 'error';
        j.error = stderr.slice(-500) || `Process exited with code ${code}`;
      }
    }
  });

  proc.on('error', (err) => {
    const j = jobsByTicker.get(ticker);
    if (j) {
      j.status = 'error';
      j.error = err.message;
    }
  });

  return jobId;
}

export function getJobByTicker(ticker: string): Job | null {
  return jobsByTicker.get(ticker) || null;
}
