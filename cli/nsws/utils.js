import { ArgumentError } from '@jackwener/opencli/errors';

export const ROLE_CODES = Object.freeze({
  ta: [1, 7],
  ra: [3],
});

export const APPLICANT_CODES = Object.freeze({
  undergrad: [
    'AT-UNDERGRAD',
    'AT-UNDERGRAD-GRADUATE',
    'AT-UNDERGRAD-GRADUATE-GRADUATE_SRA',
  ],
  graduate: [
    'AT-GRADUATE',
    'AT-GRADUATE-GRADUATE_SRA',
    'AT-UNDERGRAD-GRADUATE',
    'AT-UNDERGRAD-GRADUATE-GRADUATE_SRA',
  ],
  'graduate-sra': [
    'AT-GRADUATE_SRA',
    'AT-GRADUATE-GRADUATE_SRA',
    'AT-UNDERGRAD-GRADUATE-GRADUATE_SRA',
  ],
});

export const PAYMENT_CODES = Object.freeze({
  timesheet: ['PT-TIMESHEET'],
  deliverables: ['PT-DELIVERABLES'],
});

export function parseRole(value = 'ta,ra') {
  const raw = String(value).trim().toLowerCase();
  if (raw === 'all') return null;

  const roles = raw.split(',').map((role) => role.trim()).filter(Boolean);
  if (roles.length === 0 || roles.some((role) => !(role in ROLE_CODES))) {
    throw new ArgumentError('role must be ta, ra, ta,ra, or all');
  }

  return [...new Set(roles.flatMap((role) => ROLE_CODES[role]))];
}

export function parseApplicant(value = 'any') {
  const applicant = String(value).trim().toLowerCase();
  if (applicant === 'any') return null;
  if (!(applicant in APPLICANT_CODES)) {
    throw new ArgumentError('applicant must be any, undergrad, graduate, or graduate-sra');
  }
  return APPLICANT_CODES[applicant];
}

export function parsePayment(value = 'any') {
  const payment = String(value).trim().toLowerCase();
  if (payment === 'any') return null;
  if (!(payment in PAYMENT_CODES)) {
    throw new ArgumentError('payment must be any, timesheet, or deliverables');
  }
  return PAYMENT_CODES[payment];
}

export function parseLimit(value = 20) {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new ArgumentError('limit must be a positive integer');
  }
  if (limit > 100) throw new ArgumentError('limit must be <= 100');
  return limit;
}

export function parseMinRate(value = 0) {
  const minRate = Number(value);
  if (!Number.isFinite(minRate) || minRate < 0) {
    throw new ArgumentError('min-rate must be a non-negative number');
  }
  return minRate;
}

export function parseHourlyRate(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const rate = Number(value);
  return Number.isFinite(rate) ? rate : null;
}

export function meetsMinRate(value, minRate) {
  if (minRate === 0) return true;
  const rate = parseHourlyRate(value);
  return rate !== null && rate >= minRate;
}

export function buildSearchPayload({ page, role, query, applicant, payment }) {
  const payload = {
    page,
    windowSize: 100,
    filterType: 'jobs',
    context: 'SEARCH',
  };
  if (role) payload.jobRoles = role;
  if (query) payload.keywords = query;
  if (applicant) payload.applicantTypes = applicant;
  if (payment) payload.paymentTypes = payment;
  return payload;
}

export function toJobRow(job) {
  const jobRefId = String(job.jobRefId ?? '').trim();
  return {
    jobRefId,
    title: String(job.jobTitle ?? '').trim(),
    role: job.jobRoleDesc ? String(job.jobRoleDesc).trim() : null,
    applicantType: job.applicantTypeDesc ? String(job.applicantTypeDesc).trim() : null,
    hourlyRate: parseHourlyRate(job.jobRate),
    paymentType: job.paymentTypeDesc ? String(job.paymentTypeDesc).trim() : null,
    department: job.departmentName ? String(job.departmentName).trim() : null,
    closingDate: job.jobPostingEndDate ? String(job.jobPostingEndDate) : null,
    skills: job.jobSkill ? String(job.jobSkill).trim() : null,
    description: job.jobDescription ? String(job.jobDescription).trim() : null,
    url: `https://inetapps.nus.edu.sg/nsws/app/student/browse-jobs/view-listing/${encodeURIComponent(jobRefId)}`,
  };
}
