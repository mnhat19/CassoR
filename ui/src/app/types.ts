export type TrackName = 'Trainee' | 'Intern' | 'Professional' | 'Management' | 'Leadership';
export type EdgeType = 'up' | 'branch' | 'bidirectional';

export interface Expertise {
  code: string;
  name: string;
  group: string;
  segment: string;
  enable: boolean;
}

export interface CareerNode {
  id: string;
  db_id?: number;
  title: string;
  track: TrackName;
  level: number;
  active: boolean;
  desc?: string;
  general_requirement?: string;
  exp_requirement?: string;
}

export interface CareerEdge {
  from: string;
  to: string;
  type: EdgeType;
  label?: string;
}

export interface CareerPath {
  expertise: Expertise;
  nodes: CareerNode[];
  edges: CareerEdge[];
  currentNodeId?: string;
}

export interface TitleResolveResponse {
  matched_title: string | null;
  track: TrackName | null;
  level: number | null;
  expertise_code: string | null;
  confidence: number;
}

export interface PrecedentRow {
  training_source: string | null;
  track: TrackName | null;
  level: number | null;
  age_at_promotion: number | null;
  expertise: string | null;
}

export interface PyramidEntry {
  expertise_code: string;
  expertise_name: string;
  track: TrackName;
  level: number;
  count: number;
}

export interface BranchEligibleAlert {
  employee_id: string;
  expertise_code: string;
  current_level: number;
  months_stagnant: number;
}

export interface StagnationAlert {
  employee_id: string;
  score: number;
  current_level: number;
  months_stagnant: number;
}

export interface DependencyReport {
  segment: string;
  external_hire_ratio: number;
  internal_pipeline_count: number;
}

export type PaymentStatus = 'pending' | 'paid' | 'consumed' | 'expired';

export interface BankInfo {
  bank_name: string;
  account_number: string;
  account_name: string;
  amount_vnd: number;
  transfer_content: string;
}

export interface PaymentInitiateResponse {
  reference: string;
  amount_vnd: number;
  bank_info: BankInfo;
  expires_in_minutes: number;
  status: PaymentStatus;
}

export interface PaymentStatusResponse {
  reference: string;
  status: PaymentStatus;
  original_filename: string | null;
}

export type UserRole = 'employee' | 'hr' | 'leadership';

export interface UserProfile {
  id: number;
  username: string;
  role: UserRole;
  display_name: string | null;
  employee_id: number | null;
  employee_code: string | null;
  employee_number: string | null;
  full_name: string | null;
  raw_title: string | null;
  title: string | null;
  expertise_group: string | null;
  expertise_segment: string | null;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}
