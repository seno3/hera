import mongoose from 'mongoose';

let connected = false;

export async function connectMongo() {
  if (connected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('[MongoDB] No MONGODB_URI set, review features disabled');
    return;
  }
  try {
    await mongoose.connect(uri);
    connected = true;
    console.log('[MongoDB] Connected to Atlas');
  } catch (err) {
    console.error('[MongoDB] Connection failed:', err);
  }
}

// --- Schemas ---

const verifiedUserSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true },
  email_hash: { type: String, required: true, unique: true },
  verified_company_ticker: { type: String, required: true, index: true },
  verification_date: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
});

const reviewDataSchema = new mongoose.Schema({
  witnessed_issues: { type: String, enum: ['yes_direct', 'yes_witnessed', 'no'], required: true },
  issue_types: [{ type: String, enum: ['sexual_harassment', 'discrimination', 'assault', 'retaliation', 'pay_gap', 'hostile_environment'] }],
  timeframe: { type: String, enum: ['last_6_months', '6_12_months', '1_2_years', 'over_2_years'], required: true },
  reported: { type: String, enum: ['yes_hr', 'yes_management', 'yes_external', 'no'], required: true },
  reported_to: [{ type: String }],
  company_response: [{ type: String, enum: ['investigation', 'disciplinary_action', 'policy_changes', 'no_action', 'retaliation'] }],
  would_recommend: { type: String, enum: ['yes', 'with_reservations', 'no'], required: true },
  optional_comment: { type: String, maxlength: 200 },
}, { _id: false });

const employeeReviewSchema = new mongoose.Schema({
  review_id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true, index: true },
  company_ticker: { type: String, required: true, index: true },
  review_data: { type: reviewDataSchema, required: true },
  created_at: { type: Date, default: Date.now, index: true },
  published: { type: Boolean, default: true, index: true },
  weight: { type: Number, default: 1.0 },
  flagged_count: { type: Number, default: 0 },
  helpful_count: { type: Number, default: 0 },
});

const verificationCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  company_ticker: { type: String, required: true },
  expires_at: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  created_at: { type: Date, default: Date.now },
});

const companyEmailDomainSchema = new mongoose.Schema({
  ticker: { type: String, required: true, unique: true },
  company_name: { type: String, required: true },
  email_domains: { type: [String], required: true, index: true },
});

// --- Models ---

export const VerifiedUser = mongoose.model('VerifiedUser', verifiedUserSchema);
export const EmployeeReview = mongoose.model('EmployeeReview', employeeReviewSchema);
export const VerificationCode = mongoose.model('VerificationCode', verificationCodeSchema);
export const CompanyEmailDomain = mongoose.model('CompanyEmailDomain', companyEmailDomainSchema);
