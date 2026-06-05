export const EXPERTISES = [
  { code: 'E01', name: 'Software', group: 'Technical', segment: 'BUILD', enable: true },
  { code: 'E02', name: 'Data Engineering', group: 'Technical', segment: 'BUILD', enable: true },
  { code: 'E03', name: 'QA & Testing', group: 'Technical', segment: 'BUILD', enable: true },
  { code: 'E04', name: 'DevOps', group: 'Technical', segment: 'BUILD', enable: true },
  { code: 'E05', name: 'Product Management', group: 'Business', segment: 'BUILD', enable: true },
  { code: 'E06', name: 'UX Design', group: 'Business', segment: 'BUILD', enable: true },
  { code: 'E07', name: 'Cybersecurity', group: 'Technical', segment: 'RUN', enable: true },
  { code: 'E08', name: 'Infrastructure', group: 'Technical', segment: 'RUN', enable: true },
  { code: 'E09', name: 'IT Support', group: 'Technical', segment: 'RUN', enable: false },
  { code: 'E10', name: 'Business Analysis', group: 'Business', segment: 'BUILD', enable: true },
  { code: 'E11', name: 'Data Science', group: 'Technical', segment: 'BUILD', enable: true },
  { code: 'E12', name: 'ML Engineering', group: 'Technical', segment: 'BUILD', enable: true },
  { code: 'E13', name: 'Frontend', group: 'Technical', segment: 'BUILD', enable: true },
  { code: 'E14', name: 'Backend', group: 'Technical', segment: 'BUILD', enable: true },
  { code: 'E15', name: 'Mobile', group: 'Technical', segment: 'BUILD', enable: true },
  { code: 'E16', name: 'Architecture', group: 'Technical', segment: 'BUILD', enable: true },
  { code: 'E17', name: 'Finance', group: 'Business', segment: 'MANAGE', enable: true },
  { code: 'E18', name: 'HR Operations', group: 'Business', segment: 'MANAGE', enable: true },
  { code: 'E19', name: 'Legal', group: 'Business', segment: 'MANAGE', enable: false },
];

export type TrackName = 'Trainee' | 'Intern' | 'Professional' | 'Management' | 'Leadership';
export type EdgeType = 'up' | 'branch' | 'bidirectional' | 'dashed';

export interface CareerNode {
  id: string;
  title: string;
  track: TrackName;
  level: number;
  active: boolean;
}

export interface CareerEdge {
  from: string;
  to: string;
  type: EdgeType;
  label?: string;
}

export interface CareerPath {
  nodes: CareerNode[];
  edges: CareerEdge[];
  currentNodeId?: string;
}

const SOFTWARE_PATH: CareerPath = {
  nodes: [
    { id: 'trainee-1', title: 'Software Trainee', track: 'Trainee', level: 1, active: true },
    { id: 'intern-1', title: 'Junior Software Engineer', track: 'Intern', level: 1, active: true },
    { id: 'intern-2', title: 'Software Engineer', track: 'Intern', level: 2, active: true },
    { id: 'professional-1', title: 'Software Engineer I', track: 'Professional', level: 1, active: true },
    { id: 'professional-2', title: 'Software Engineer II', track: 'Professional', level: 2, active: true },
    { id: 'professional-3', title: 'Senior Software Engineer', track: 'Professional', level: 3, active: true },
    { id: 'professional-4', title: 'Lead Software Engineer', track: 'Professional', level: 4, active: true },
    { id: 'management-3', title: 'Engineering Manager', track: 'Management', level: 3, active: true },
    { id: 'management-4', title: 'Senior Engineering Manager', track: 'Management', level: 4, active: true },
    { id: 'management-5', title: 'Director of Engineering', track: 'Management', level: 5, active: true },
    { id: 'leadership-4', title: 'VP of Engineering', track: 'Leadership', level: 4, active: true },
    { id: 'leadership-5', title: 'CTO', track: 'Leadership', level: 5, active: true },
  ],
  edges: [
    { from: 'trainee-1', to: 'intern-1', type: 'up' },
    { from: 'intern-1', to: 'intern-2', type: 'up' },
    { from: 'intern-2', to: 'professional-1', type: 'up' },
    { from: 'professional-1', to: 'professional-2', type: 'up' },
    { from: 'professional-2', to: 'professional-3', type: 'up' },
    { from: 'professional-3', to: 'professional-4', type: 'up' },
    { from: 'professional-4', to: 'management-3', type: 'branch' },
    { from: 'management-3', to: 'management-4', type: 'up' },
    { from: 'management-4', to: 'management-5', type: 'up' },
    { from: 'management-4', to: 'leadership-4', type: 'bidirectional' },
    { from: 'management-5', to: 'leadership-5', type: 'dashed', label: 'Path phụ thuộc quyết định tổ chức' },
  ],
  currentNodeId: 'professional-2',
};

const DATA_ENG_PATH: CareerPath = {
  nodes: [
    { id: 'trainee-1', title: 'Data Trainee', track: 'Trainee', level: 1, active: true },
    { id: 'intern-1', title: 'Junior Data Engineer', track: 'Intern', level: 1, active: true },
    { id: 'intern-2', title: 'Data Engineer', track: 'Intern', level: 2, active: true },
    { id: 'professional-1', title: 'Data Engineer I', track: 'Professional', level: 1, active: true },
    { id: 'professional-2', title: 'Data Engineer II', track: 'Professional', level: 2, active: true },
    { id: 'professional-3', title: 'Senior Data Engineer', track: 'Professional', level: 3, active: true },
    { id: 'professional-4', title: 'Lead Data Engineer', track: 'Professional', level: 4, active: true },
    { id: 'management-3', title: 'Data Engineering Manager', track: 'Management', level: 3, active: true },
    { id: 'management-4', title: 'Data Platform Lead', track: 'Management', level: 4, active: true },
    { id: 'management-5', title: 'Head of Data Engineering', track: 'Management', level: 5, active: true },
    { id: 'leadership-4', title: 'VP of Data', track: 'Leadership', level: 4, active: true },
    { id: 'leadership-5', title: 'Chief Data Officer', track: 'Leadership', level: 5, active: true },
  ],
  edges: [
    { from: 'trainee-1', to: 'intern-1', type: 'up' },
    { from: 'intern-1', to: 'intern-2', type: 'up' },
    { from: 'intern-2', to: 'professional-1', type: 'up' },
    { from: 'professional-1', to: 'professional-2', type: 'up' },
    { from: 'professional-2', to: 'professional-3', type: 'up' },
    { from: 'professional-3', to: 'professional-4', type: 'up' },
    { from: 'professional-4', to: 'management-3', type: 'branch' },
    { from: 'management-3', to: 'management-4', type: 'up' },
    { from: 'management-4', to: 'management-5', type: 'up' },
    { from: 'management-4', to: 'leadership-4', type: 'bidirectional' },
    { from: 'management-5', to: 'leadership-5', type: 'dashed', label: 'Path phụ thuộc quyết định tổ chức' },
  ],
};

export const CAREER_PATHS: Record<string, CareerPath> = {
  E01: SOFTWARE_PATH,
  E02: DATA_ENG_PATH,
};

// Default path for codes without specific data
EXPERTISES.forEach(e => {
  if (!CAREER_PATHS[e.code]) {
    CAREER_PATHS[e.code] = {
      nodes: SOFTWARE_PATH.nodes.map(n => ({
        ...n,
        title: n.title.replace('Software', e.name).replace('Engineering', e.name),
      })),
      edges: SOFTWARE_PATH.edges,
    };
  }
});

export const MY_CAREER_PATH: CareerPath = {
  ...SOFTWARE_PATH,
  currentNodeId: 'professional-2',
};

export const CAREER_PRECEDENTS = [
  { training_source: 'External hire', track: 'Professional', level: 2, age_at_promotion: null, expertise: 'E01' },
  { training_source: 'Internal pipeline', track: 'Professional', level: 3, age_at_promotion: 28, expertise: 'E01' },
  { training_source: 'External hire', track: 'Management', level: 3, age_at_promotion: 32, expertise: 'E01' },
  { training_source: 'Internal rotation', track: 'Professional', level: 4, age_at_promotion: 31, expertise: 'E01' },
  { training_source: 'Internal pipeline', track: 'Management', level: 4, age_at_promotion: 35, expertise: 'E01' },
  { training_source: 'External hire', track: 'Leadership', level: 4, age_at_promotion: 38, expertise: 'E01' },
];

export const PYRAMID_DATA = [
  { level: 'Level 6', Professional: 2, Management: 1, Leadership: 2, total: 5 },
  { level: 'Level 5', Professional: 8, Management: 12, Leadership: 5, total: 25 },
  { level: 'Level 4', Professional: 24, Management: 31, Leadership: 8, total: 63 },
  { level: 'Level 3', Professional: 67, Management: 42, Leadership: 0, total: 109 },
  { level: 'Level 2', Professional: 95, Management: 0, Leadership: 0, total: 95 },
  { level: 'Level 1', Professional: 112, Management: 0, Leadership: 0, total: 112 },
];

export const BRANCH_ELIGIBLE_ALERTS = [
  { employee_id: 'EMP-1042', expertise: 'Software', current_level: 4, stagnant_months: 18, track: 'Professional' },
  { employee_id: 'EMP-0873', expertise: 'Data Engineering', current_level: 4, stagnant_months: 24, track: 'Professional' },
  { employee_id: 'EMP-1156', expertise: 'Software', current_level: 4, stagnant_months: 14, track: 'Professional' },
  { employee_id: 'EMP-0991', expertise: 'QA & Testing', current_level: 4, stagnant_months: 20, track: 'Professional' },
  { employee_id: 'EMP-1378', expertise: 'DevOps', current_level: 4, stagnant_months: 16, track: 'Professional' },
  { employee_id: 'EMP-0654', expertise: 'Frontend', current_level: 4, stagnant_months: 22, track: 'Professional' },
];

export const STAGNATION_ALERTS = [
  { employee_id: 'EMP-0512', risk_score: 9.2, current_level: 3, stagnant_months: 36, track: 'Professional', expertise: 'Software' },
  { employee_id: 'EMP-1089', risk_score: 8.7, current_level: 2, stagnant_months: 42, track: 'Intern', expertise: 'Data Engineering' },
  { employee_id: 'EMP-0347', risk_score: 8.1, current_level: 4, stagnant_months: 30, track: 'Management', expertise: 'Software' },
  { employee_id: 'EMP-1203', risk_score: 7.6, current_level: 3, stagnant_months: 28, track: 'Professional', expertise: 'DevOps' },
  { employee_id: 'EMP-0789', risk_score: 7.2, current_level: 2, stagnant_months: 34, track: 'Professional', expertise: 'QA & Testing' },
  { employee_id: 'EMP-1445', risk_score: 6.8, current_level: 3, stagnant_months: 25, track: 'Professional', expertise: 'Backend' },
  { employee_id: 'EMP-0921', risk_score: 6.3, current_level: 2, stagnant_months: 22, track: 'Intern', expertise: 'Frontend' },
];

export const DEPENDENCY_DATA = {
  external_hire_ratio: 0.42,
  internal_pipeline_count: 87,
  by_segment: [
    { segment: 'BUILD', external_hire: 38, internal: 52, total: 90 },
    { segment: 'RUN', external_hire: 21, internal: 27, total: 48 },
    { segment: 'MANAGE', external_hire: 15, internal: 8, total: 23 },
  ],
  trend: [
    { month: 'T1', external: 44 },
    { month: 'T2', external: 41 },
    { month: 'T3', external: 43 },
    { month: 'T4', external: 40 },
    { month: 'T5', external: 38 },
    { month: 'T6', external: 42 },
  ],
};
