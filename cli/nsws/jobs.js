import { Strategy } from '@jackwener/opencli/registry';
import {
  AuthRequiredError,
  CommandExecutionError,
  EmptyResultError,
} from '@jackwener/opencli/errors';
import {
  buildSearchPayload,
  meetsMinRate,
  parseApplicant,
  parseLimit,
  parseMinRate,
  parsePayment,
  parseRole,
  toJobRow,
} from './utils.js';

const DOMAIN = 'inetapps.nus.edu.sg';
const JOBS_URL = `https://${DOMAIN}/nsws/app/student/browse-jobs`;
const API_URL = `https://${DOMAIN}/nsws/api/v1/job/getall`;

async function readAccessToken(page) {
  let auth;
  try {
    auth = await page.evaluate(() => {
      try {
        const value = JSON.parse(sessionStorage.getItem('auth_info') || '{}');
        return value?.success && typeof value?.token === 'string' ? value.token : null;
      } catch {
        return null;
      }
    });
  } catch (error) {
    throw new CommandExecutionError(`Unable to read the NSWS browser session: ${error?.message || error}`);
  }

  if (!auth) {
    throw new AuthRequiredError(
      DOMAIN,
      'Sign in as an NUS student in the NSWS browser tab, then run the command again.',
    );
  }
  return auth;
}

async function fetchPage(token, payload) {
  let response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Referer: JOBS_URL,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new CommandExecutionError(`NSWS job search failed: ${error?.message || error}`);
  }

  if (response.status === 401 || response.status === 403) {
    throw new AuthRequiredError(DOMAIN, 'Your NSWS session expired. Sign in again and retry.');
  }
  if (!response.ok) {
    throw new CommandExecutionError(`NSWS job search failed: HTTP ${response.status}`);
  }

  let body;
  try {
    body = await response.json();
  } catch (error) {
    throw new CommandExecutionError(`NSWS returned invalid JSON: ${error?.message || error}`);
  }
  if (body?.isSuccessful !== true || !body?.data || !Array.isArray(body.data.data)) {
    const reason = body?.errorMessage || 'unexpected response shape';
    throw new CommandExecutionError(`NSWS job search failed: ${reason}`);
  }
  return body.data;
}

export async function searchJobs(page, args) {
  const limit = parseLimit(args.limit);
  const minRate = parseMinRate(args.minRate);
  const filters = {
    role: parseRole(args.role),
    query: String(args.query ?? '').trim(),
    applicant: parseApplicant(args.applicant),
    payment: parsePayment(args.payment),
  };

  try {
    await page.goto(JOBS_URL, { waitUntil: 'load', settleMs: 2500 });
  } catch (error) {
    throw new CommandExecutionError(`Unable to open NSWS: ${error?.message || error}`);
  }

  const token = await readAccessToken(page);
  const matches = [];
  let pageNumber = 0;
  let totalPages = 1;

  while (pageNumber < totalPages && matches.length < limit) {
    const pageData = await fetchPage(token, buildSearchPayload({
      page: pageNumber,
      ...filters,
    }));
    totalPages = Number.isInteger(pageData.totalPages) ? pageData.totalPages : 1;
    for (const job of pageData.data) {
      if (meetsMinRate(job.jobRate, minRate)) matches.push(job);
      if (matches.length === limit) break;
    }
    pageNumber += 1;
  }

  if (matches.length === 0) {
    throw new EmptyResultError('nsws jobs', 'No NSWS jobs matched the selected filters.');
  }
  return matches.map(toJobRow);
}

export const jobsDefinition = {
  site: 'nsws',
  name: 'jobs',
  access: 'read',
  description: 'Find NUS NSWS TA and RA opportunities; defaults to both roles',
  example: 'opencli nsws jobs --role ra --query AI --limit 10 -f json',
  domain: DOMAIN,
  strategy: Strategy.COOKIE,
  browser: true,
  siteSession: 'persistent',
  navigateBefore: false,
  args: [
    { name: 'role', type: 'string', default: 'ta,ra', help: 'Roles: ta, ra, ta,ra, or all' },
    { name: 'query', type: 'string', default: '', help: 'NSWS keyword search' },
    { name: 'applicant', type: 'string', default: 'any', help: 'Applicant: any, undergrad, graduate, or graduate-sra' },
    { name: 'payment', type: 'string', default: 'any', help: 'Payment: any, timesheet, or deliverables' },
    { name: 'minRate', type: 'float', default: 0, help: 'Minimum hourly rate in SGD' },
    { name: 'limit', type: 'int', default: 20, help: 'Maximum rows (1-100)' },
  ],
  columns: [
    'jobRefId',
    'title',
    'role',
    'applicantType',
    'hourlyRate',
    'paymentType',
    'department',
    'closingDate',
    'skills',
    'description',
    'url',
  ],
  func: searchJobs,
};
