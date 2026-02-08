import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';
import {
  VerifiedUser,
  EmployeeReview,
  VerificationCode,
  CompanyEmailDomain,
} from '../services/mongodb';

const router = Router();
const JWT_SECRET = () => process.env.JWT_SECRET || 'dev-secret-change-me';
const EMAIL_HASH_SALT = () => process.env.EMAIL_HASH_SALT || 'dev-salt';
const DEMO_MODE = () => process.env.DEMO_MODE_ENABLED === 'true';
const RESEND_FROM = () => process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

// --- Helpers ---

function hashEmail(email: string): string {
  return crypto
    .createHash('sha256')
    .update(email.toLowerCase().trim() + EMAIL_HASH_SALT())
    .digest('hex');
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const TIME_WEIGHTS: Record<string, number> = {
  last_6_months: 1.0,
  '6_12_months': 0.75,
  '1_2_years': 0.5,
  over_2_years: 0.25,
};

// --- JWT Auth Middleware ---

interface AuthRequest extends Request {
  user?: { user_id: string; verified_for: string };
}

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid token' });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET()) as {
      user_id: string;
      verified_for: string;
    };
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// --- POST /auth/request-verification ---

router.post('/auth/request-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'Valid email required' });
      return;
    }

    const domain = email.split('@')[1].toLowerCase();
    let companyDoc = await CompanyEmailDomain.findOne({
      email_domains: domain,
    });

    // Allow admin email to verify for any company
    if (!companyDoc && email.toLowerCase().trim() === 'senosanjeevj@gmail.com') {
      companyDoc = await CompanyEmailDomain.findOne({});
    }

    if (!companyDoc) {
      res.status(404).json({
        error: `No company found for domain "${domain}". Contact support if your company should be listed.`,
      });
      return;
    }

    // Rate limit: 3 verification requests per email per 24h
    const recentCodes = await VerificationCode.countDocuments({
      email: email.toLowerCase().trim(),
      created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    if (recentCodes >= 3) {
      res.status(429).json({ error: 'Too many verification requests. Try again in 24 hours.' });
      return;
    }

    const code = generateCode();
    await VerificationCode.create({
      code,
      email: email.toLowerCase().trim(),
      company_ticker: companyDoc.ticker,
      expires_at: new Date(Date.now() + 15 * 60 * 1000), // 15 min TTL
    });

    // Send verification email via Resend (non-blocking — failure here should not prevent verification)
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: RESEND_FROM(),
          to: email.toLowerCase().trim(),
          subject: 'Hera — Your Verification Code',
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #000; color: #fff;">
              <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 8px;">Hera</h1>
              <p style="color: rgba(255,255,255,0.5); font-size: 14px; margin: 0 0 32px;">Employment Verification</p>
              <p style="font-size: 14px; color: rgba(255,255,255,0.7); margin: 0 0 24px;">
                Use the code below to verify your employment at <strong style="color: #fff;">${companyDoc.company_name}</strong>.
              </p>
              <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px;">
                <span style="font-family: monospace; font-size: 36px; letter-spacing: 8px; color: #fff; font-weight: 700;">${code}</span>
              </div>
              <p style="font-size: 12px; color: rgba(255,255,255,0.4); margin: 0 0 8px;">This code expires in 15 minutes.</p>
              <p style="font-size: 12px; color: rgba(255,255,255,0.4); margin: 0;">If you did not request this, you can safely ignore this email. Your identity remains completely anonymous.</p>
            </div>
          `,
        });
        console.log(`[Reviews] Verification email sent to ${email}`);
      } catch (emailErr: any) {
        console.error('[Reviews] Resend failed:', emailErr?.message || emailErr);
        // Don't throw — the code is still in the DB and can be used via demo mode or retries
      }
    } else {
      console.log(`[Reviews] Resend not configured — verification code for ${email}: ${code}`);
    }

    res.json({
      success: true,
      company_ticker: companyDoc.ticker,
      company_name: companyDoc.company_name,
      // Include code in dev/demo for easy testing
      ...(DEMO_MODE() ? { code } : {}),
    });
  } catch (err: any) {
    console.error('[Reviews] request-verification FULL ERROR:', err);
    console.error('[Reviews] Error name:', err?.name, '| Message:', err?.message);

    // Surface the real error so frontend can display it
    let message = 'Verification failed';
    if (err?.name === 'MongooseError' || err?.name === 'MongoServerError') {
      message = 'Database connection error. Is MongoDB connected?';
    } else if (err?.message?.includes('buffering timed out')) {
      message = 'Database not connected. Check MONGODB_URI.';
    } else if (err?.message) {
      message = err.message;
    }
    res.status(500).json({ error: message });
  }
});

// --- POST /auth/verify ---

router.post('/auth/verify', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Verification code required' });
      return;
    }

    const doc = await VerificationCode.findOne({ code });
    if (!doc) {
      res.status(400).json({ error: 'Invalid or expired code' });
      return;
    }

    if (doc.expires_at < new Date()) {
      await VerificationCode.deleteOne({ _id: doc._id });
      res.status(400).json({ error: 'Code expired' });
      return;
    }

    const emailHash = hashEmail(doc.email);

    // Check if user already exists for this email
    let user = await VerifiedUser.findOne({ email_hash: emailHash });
    const userId = user?.user_id || uuidv4();

    if (!user) {
      await VerifiedUser.create({
        user_id: userId,
        email_hash: emailHash,
        verified_company_ticker: doc.company_ticker,
      });
    }

    // Delete verification code (and the original email with it)
    await VerificationCode.deleteOne({ _id: doc._id });

    // Generate JWT — NO email or name in payload
    const token = jwt.sign(
      { user_id: userId, verified_for: doc.company_ticker },
      JWT_SECRET(),
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user_id: userId,
      verified_for: doc.company_ticker,
    });
  } catch (err: any) {
    console.error('[Reviews] verify error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Verification failed' });
  }
});

// --- POST /auth/login-demo ---

router.post('/auth/login-demo', async (req: Request, res: Response) => {
  if (!DEMO_MODE()) {
    res.status(403).json({ error: 'Demo mode is not enabled' });
    return;
  }

  try {
    const { company_ticker, demo_user_name } = req.body;
    if (!company_ticker) {
      res.status(400).json({ error: 'company_ticker required' });
      return;
    }

    const userId = uuidv4();
    const token = jwt.sign(
      { user_id: userId, verified_for: company_ticker },
      JWT_SECRET(),
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user_id: userId,
      verified_for: company_ticker,
    });
  } catch (err: any) {
    console.error('[Reviews] login-demo error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Login failed' });
  }
});

// --- POST /submit ---

router.post('/submit', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { company_ticker, review_data } = req.body;
    const userId = req.user!.user_id;

    if (!company_ticker || !review_data) {
      res.status(400).json({ error: 'company_ticker and review_data required' });
      return;
    }

    // Validate required fields
    const { witnessed_issues, timeframe, reported, would_recommend } = review_data;
    if (!witnessed_issues || !timeframe || !reported || !would_recommend) {
      res.status(400).json({ error: 'Missing required review fields' });
      return;
    }

    // Check 6-month cooldown
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const recentReview = await EmployeeReview.findOne({
      user_id: userId,
      company_ticker,
      created_at: { $gte: sixMonthsAgo },
    });
    if (recentReview) {
      res.status(429).json({
        error: 'You have already reviewed this company in the last 6 months',
      });
      return;
    }

    // Truncate comment
    if (review_data.optional_comment) {
      review_data.optional_comment = review_data.optional_comment.slice(0, 200);
    }

    // Calculate weight based on timeframe
    const weight = TIME_WEIGHTS[timeframe] || 0.5;

    const reviewId = uuidv4();
    await EmployeeReview.create({
      review_id: reviewId,
      user_id: userId,
      company_ticker,
      review_data,
      published: true,
      weight,
    });

    res.json({ success: true, review_id: reviewId });
  } catch (err: any) {
    console.error('[Reviews] submit error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Review submission failed' });
  }
});

// --- GET /company/:ticker/aggregate ---

router.get('/company/:ticker/aggregate', async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    const reviews = await EmployeeReview.find({
      company_ticker: ticker.toUpperCase(),
      published: true,
    }).lean();

    if (!reviews.length) {
      res.json({
        company_ticker: ticker.toUpperCase(),
        total_reviews: 0,
        aggregated_data: null,
        employee_perspective_score: null,
      });
      return;
    }

    // Weighted aggregation
    let totalWeight = 0;
    let witnessedWeight = 0;
    let reportedWeight = 0;
    const issueTypeCounts: Record<string, number> = {};
    const responseCounts: Record<string, number> = {};
    const recommendCounts: Record<string, number> = { yes: 0, with_reservations: 0, no: 0 };

    for (const r of reviews) {
      const w = r.weight || 1;
      totalWeight += w;
      const rd = r.review_data;

      if (rd.witnessed_issues === 'yes_direct' || rd.witnessed_issues === 'yes_witnessed') {
        witnessedWeight += w;
      }
      if (rd.reported !== 'no') {
        reportedWeight += w;
      }
      for (const it of rd.issue_types || []) {
        issueTypeCounts[it] = (issueTypeCounts[it] || 0) + w;
      }
      for (const cr of rd.company_response || []) {
        responseCounts[cr] = (responseCounts[cr] || 0) + w;
      }
      if (rd.would_recommend) {
        recommendCounts[rd.would_recommend] = (recommendCounts[rd.would_recommend] || 0) + w;
      }
    }

    const pct = (v: number) => Math.round((v / totalWeight) * 100);

    const issueTypeBreakdown: Record<string, number> = {};
    for (const [k, v] of Object.entries(issueTypeCounts)) {
      issueTypeBreakdown[k] = pct(v);
    }

    const companyResponseBreakdown: Record<string, number> = {};
    for (const [k, v] of Object.entries(responseCounts)) {
      companyResponseBreakdown[k] = pct(v);
    }

    const wouldRecommend: Record<string, number> = {};
    for (const [k, v] of Object.entries(recommendCounts)) {
      wouldRecommend[k] = pct(v);
    }

    // Employee Perspective Score (1-10)
    let score = 10;
    const witnessedPct = pct(witnessedWeight);
    if (witnessedPct > 60) score -= 5;
    else if (witnessedPct > 30) score -= 3;
    else if (witnessedPct > 10) score -= 1;

    if ((companyResponseBreakdown['no_action'] || 0) > 40) score -= 3;
    else if ((companyResponseBreakdown['no_action'] || 0) > 20) score -= 1;

    if ((companyResponseBreakdown['retaliation'] || 0) > 10) score -= 4;
    else if ((companyResponseBreakdown['retaliation'] || 0) > 0) score -= 2;

    if ((companyResponseBreakdown['investigation'] || 0) > 30 && (companyResponseBreakdown['disciplinary_action'] || 0) > 20) {
      score += 2;
    }
    if ((wouldRecommend['yes'] || 0) > 50) score += 2;
    else if ((wouldRecommend['yes'] || 0) > 30) score += 1;

    score = Math.max(1, Math.min(10, score));

    res.json({
      company_ticker: ticker.toUpperCase(),
      total_reviews: reviews.length,
      aggregated_data: {
        witnessed_issues_percent: pct(witnessedWeight),
        issue_type_breakdown: issueTypeBreakdown,
        reported_percent: pct(reportedWeight),
        company_response_breakdown: companyResponseBreakdown,
        would_recommend: wouldRecommend,
      },
      employee_perspective_score: score,
    });
  } catch (err: any) {
    console.error('[Reviews] aggregate error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Failed to load review data' });
  }
});

// --- GET /company-domains (for demo login dropdown) ---

router.get('/company-domains', async (_req: Request, res: Response) => {
  try {
    const domains = await CompanyEmailDomain.find({}).lean();
    res.json(domains.map((d) => ({ ticker: d.ticker, company_name: d.company_name })));
  } catch (err: any) {
    console.error('[Reviews] company-domains error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Failed to load company domains' });
  }
});

export default router;
