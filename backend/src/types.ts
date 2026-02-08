export interface CompanyAnalysis {
  id: string;
  company_ticker: string;
  company_name: string;
  accountability_score: number;
  summary: string;
  issues: Issue[];
  response: ResponseAnalysis;
  timeline: TimelineEvent[];
  score_breakdown: ScoreBreakdown;
  sources: Source[];
  document_count: number;
  model_used: string;
  analyzed_at: string;
  expires_at: string;
  disclaimer: string;
}

export interface Issue {
  type: string;
  date: string;
  status: string;
  settlement_amount: number | null;
  affected_parties: number | null;
  description: string;
  source_urls: string[];
}

export interface ResponseAnalysis {
  actions_taken: string[];
  gaps: string[];
}

export interface TimelineEvent {
  date: string;
  event: string;
}

export interface ScoreBreakdown {
  severity: string;
  response_quality: number;
  transparency: number;
  speed: string;
  current_status: string;
  pattern_analysis: string;
}

export interface Source {
  url: string;
  title: string;
  type: string;
  date: string;
}

export interface PortfolioResult {
  total: number;
  flagged: number;
  clean: number;
  not_analyzed: number;
  holdings: HoldingSummary[];
  impact_statement: string;
}

export interface HoldingSummary {
  ticker: string;
  name: string;
  accountability_score: number | null;
  severity: string | null;
  summary: string | null;
  analyzed: boolean;
}

export interface UserAction {
  id: string;
  user_name: string;
  action_type: string;
  company_ticker: string;
  created_at: string;
}
