import test from 'node:test';
import assert from 'node:assert/strict';
import { ArgumentError, EmptyResultError } from '@jackwener/opencli/errors';
import { searchModules } from '../cli/nusmods/search.js';
import { getModule } from '../cli/nusmods/module.js';
import { getTimetable } from '../cli/nusmods/timetable.js';
import {
  compactWeeks,
  defaultAcadYear,
  parseAcadYear,
  parseDay,
  parseLimit,
  parseModuleCode,
  parseSemester,
  searchModuleRows,
  timetableRows,
  toModuleRow,
} from '../cli/nusmods/utils.js';

const moduleFixture = {
  moduleCode: 'CS1010S',
  title: 'Programming Methodology',
  moduleCredit: '4',
  department: 'Computer Science',
  faculty: 'Computing',
  description: 'Introduction to programming.',
  prerequisite: 'No programming experience required.',
  workload: [2, 1, 1, 3, 3],
  semesterData: [{
    semester: 1,
    timetable: [
      {
        classNo: '32', lessonType: 'Tutorial', day: 'Tuesday',
        startTime: '1300', endTime: '1400', venue: 'COM1-0201',
        weeks: [2, 3, 4, 6, 7], size: 20,
      },
      {
        classNo: '01', lessonType: 'Lecture', day: 'Monday',
        startTime: '1000', endTime: '1200', venue: '',
        weeks: [1, 2, 3],
      },
    ],
  }, { semester: 2, timetable: [] }],
};

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

async function withMockFetch(handler, callback) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler;
  try {
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test('academic year, semester, module code, day, and limit parsing is strict', () => {
  assert.equal(defaultAcadYear(new Date(2026, 7, 12)), '2026-2027');
  assert.equal(defaultAcadYear(new Date(2026, 0, 12)), '2025-2026');
  assert.equal(parseAcadYear('2026-2027'), '2026-2027');
  assert.throws(() => parseAcadYear('2026/27'), ArgumentError);
  assert.throws(() => parseAcadYear('2026-2028'), ArgumentError);
  assert.equal(parseSemester(0, { allowAll: true }), 0);
  assert.equal(parseSemester(4), 4);
  assert.throws(() => parseSemester(0), ArgumentError);
  assert.equal(parseModuleCode(' cs1010s '), 'CS1010S');
  assert.throws(() => parseModuleCode(''), ArgumentError);
  assert.equal(parseDay('tue'), 'Tuesday');
  assert.equal(parseDay('all'), null);
  assert.throws(() => parseDay('Funday'), ArgumentError);
  assert.equal(parseLimit(100), 100);
  assert.throws(() => parseLimit(101), ArgumentError);
});

test('module search ranks exact codes before prefixes and title matches', () => {
  const rows = searchModuleRows([
    { moduleCode: 'CS1010S', title: 'Programming Methodology', semesters: [1, 2] },
    { moduleCode: 'CS1010', title: 'Programming Methodology', semesters: [1] },
    { moduleCode: 'IS1108', title: 'Digital Ethics and Data Privacy', semesters: [2] },
  ], 'CS1010', 0, 10);
  assert.deepEqual(rows.map((row) => row.moduleCode), ['CS1010', 'CS1010S']);
  assert.deepEqual(Object.keys(rows[0]), ['rank', 'moduleCode', 'title', 'semesters', 'url']);
  assert.equal(searchModuleRows([
    { moduleCode: 'IS1108', title: 'Digital Ethics', semesters: [2] },
  ], 'ethics', 1, 10).length, 0);
});

test('module details preserve stable columns and null missing fields', () => {
  const row = toModuleRow(moduleFixture);
  assert.deepEqual(Object.keys(row), [
    'moduleCode', 'title', 'units', 'department', 'faculty', 'semesters',
    'description', 'prerequisite', 'corequisite', 'preclusion', 'workload', 'url',
  ]);
  assert.equal(row.units, 4);
  assert.equal(row.semesters, '1, 2');
  assert.equal(row.corequisite, null);
  assert.equal(row.workload, '2, 1, 1, 3, 3');
});

test('timetable filters case-insensitively, sorts by weekday, and compacts weeks', () => {
  assert.equal(compactWeeks([7, 2, 3, 4, 6, 3]), '2-4, 6-7');
  const rows = timetableRows(moduleFixture, 1, {
    lessonType: 'tutorial', classNo: '32', day: 'tue',
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].weeks, '2-4, 6-7');
  assert.equal(rows[0].size, 20);
  assert.deepEqual(Object.keys(rows[0]), [
    'moduleCode', 'semester', 'classNo', 'lessonType', 'day', 'startTime',
    'endTime', 'venue', 'weeks', 'size', 'url',
  ]);
  const allRows = timetableRows(moduleFixture, 1, {});
  assert.deepEqual(allRows.map((row) => row.day), ['Monday', 'Tuesday']);
  assert.equal(allRows[0].venue, null);
  assert.equal(allRows[0].size, null);
});

test('search command fetches the selected academic year and reports no matches', async () => {
  const urls = [];
  await withMockFetch(async (url) => {
    urls.push(url);
    return jsonResponse([
      { moduleCode: 'CS1010S', title: 'Programming Methodology', semesters: [1, 2] },
    ]);
  }, async () => {
    const rows = await searchModules({
      query: 'programming', acadYear: '2026-2027', semester: 1, limit: 5,
    });
    assert.equal(rows[0].moduleCode, 'CS1010S');
    await assert.rejects(() => searchModules({
      query: 'physics', acadYear: '2026-2027', semester: 1, limit: 5,
    }), EmptyResultError);
  });
  assert.match(urls[0], /2026-2027\/moduleList\.json$/);
});

test('module and timetable commands handle live response shapes and 404s', async () => {
  await withMockFetch(async (url) => url.includes('MISSING')
    ? jsonResponse({}, 404)
    : jsonResponse(moduleFixture), async () => {
    const rows = await getModule({ code: 'cs1010s', acadYear: '2026-2027' });
    assert.equal(rows[0].moduleCode, 'CS1010S');
    const lessons = await getTimetable({
      code: 'CS1010S', acadYear: '2026-2027', semester: 1,
      lessonType: 'Tutorial', classNo: 'all', day: 'Tuesday',
    });
    assert.equal(lessons.length, 1);
    await assert.rejects(() => getModule({
      code: 'MISSING123', acadYear: '2026-2027',
    }), EmptyResultError);
    await assert.rejects(() => getTimetable({
      code: 'CS1010S', acadYear: '2026-2027', semester: 1,
      lessonType: 'Seminar', classNo: 'all', day: 'all',
    }), EmptyResultError);
  });
});
