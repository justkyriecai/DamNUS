import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSearchPayload,
  meetsMinRate,
  parseApplicant,
  parseHourlyRate,
  parseLimit,
  parseMinRate,
  parsePayment,
  parseRole,
  toJobRow,
} from '../cli/nsws/utils.js';

test('role aliases map to the NSWS tutor and research-assistant codes', () => {
  assert.deepEqual(parseRole('ta'), [1, 7]);
  assert.deepEqual(parseRole('ra'), [3]);
  assert.deepEqual(parseRole('ta,ra'), [1, 7, 3]);
  assert.equal(parseRole('all'), null);
  assert.throws(() => parseRole('researcher'), /role must be/);
});

test('applicant and payment filters map to server codes', () => {
  assert.ok(parseApplicant('undergrad').includes('AT-UNDERGRAD'));
  assert.ok(parseApplicant('graduate').includes('AT-GRADUATE'));
  assert.deepEqual(parsePayment('timesheet'), ['PT-TIMESHEET']);
  assert.equal(parsePayment('any'), null);
});

test('numeric filters reject invalid values rather than silently clamping', () => {
  assert.equal(parseLimit(20), 20);
  assert.throws(() => parseLimit(0), /positive integer/);
  assert.throws(() => parseLimit(101), /<= 100/);
  assert.equal(parseMinRate('20.5'), 20.5);
  assert.throws(() => parseMinRate(-1), /non-negative/);
  assert.equal(meetsMinRate('', 0), true);
  assert.equal(meetsMinRate('', 10), false);
  assert.equal(meetsMinRate('20', 20), true);
});

test('search payload preserves the observed NSWS request contract', () => {
  assert.deepEqual(buildSearchPayload({
    page: 0,
    role: [1, 3, 7],
    query: 'AI',
    applicant: null,
    payment: ['PT-TIMESHEET'],
  }), {
    page: 0,
    windowSize: 100,
    filterType: 'jobs',
    context: 'SEARCH',
    jobRoles: [1, 3, 7],
    keywords: 'AI',
    paymentTypes: ['PT-TIMESHEET'],
  });
});

test('job rows use stable columns and preserve missing values as null', () => {
  assert.equal(parseHourlyRate(''), null);
  const row = toJobRow({
    jobRefId: 'J2026080144',
    jobTitle: 'Research Assistant',
    jobRoleDesc: 'Research Assistant',
    jobRate: '20',
    jobPostingEndDate: '2026-08-31T00:00:00',
  });
  assert.deepEqual(Object.keys(row), [
    'jobRefId', 'title', 'role', 'applicantType', 'hourlyRate', 'paymentType',
    'department', 'closingDate', 'skills', 'description', 'url',
  ]);
  assert.equal(row.hourlyRate, 20);
  assert.equal(row.department, null);
  assert.match(row.url, /J2026080144$/);
});
