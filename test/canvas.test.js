import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ArgumentError, AuthRequiredError, EmptyResultError } from '@jackwener/opencli/errors';
import { getAnnouncements } from '../cli/canvas/announcements.js';
import { getCourse } from '../cli/canvas/course.js';
import { getCourses } from '../cli/canvas/courses.js';
import { downloadCanvasFile } from '../cli/canvas/download.js';
import { getFiles } from '../cli/canvas/files.js';
import {
  canvasJson,
  parseCourseRef,
  parseFileId,
  parseLimit,
  sanitizeFilename,
  stripHtml,
  toCourseRow,
} from '../cli/canvas/utils.js';

const courseFixture = {
  id: 93405,
  course_code: 'BMS5502S',
  name: "BMS5502S The Entrepreneur's Edge [2610]",
  workflow_state: 'available',
  term: {
    name: '[2610] 2026/2027 Semester 1',
    start_at: '2026-07-19T16:00:00Z',
    end_at: '2027-01-09T15:59:00Z',
  },
};

const nonAcademicFixture = {
  id: 40630,
  course_code: 'THE1001',
  name: 'A Culture of Respect and Consent',
  workflow_state: 'available',
  term: { name: 'Non-Academic' },
};

function mockPage(cookies = [{ name: '_normandy_session', value: 'session-value' }]) {
  return { getCookies: async () => cookies };
}

function jsonResponse(body, status = 200, url = 'https://canvas.nus.edu.sg/api/v1/test') {
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    headers: new Headers({ 'content-type': 'application/json; charset=utf-8' }),
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

test('Canvas arguments reject malformed or out-of-range input', () => {
  assert.equal(parseLimit(100), 100);
  assert.throws(() => parseLimit(0), ArgumentError);
  assert.throws(() => parseLimit(101), ArgumentError);
  assert.equal(parseCourseRef(' bms5502s '), 'bms5502s');
  assert.equal(parseCourseRef('93405'), '93405');
  assert.throws(() => parseCourseRef('../course'), ArgumentError);
  assert.equal(parseFileId('9626980'), '9626980');
  assert.equal(parseFileId('https://canvas.nus.edu.sg/files/9626980/download'), '9626980');
  assert.throws(() => parseFileId('not-a-file'), ArgumentError);
});

test('HTML is converted to readable plain text and filenames are safe', () => {
  assert.equal(stripHtml('<p>Hello &amp; welcome</p><p>Week 1<br>Prepare</p>'), 'Hello & welcome\nWeek 1\nPrepare');
  assert.equal(stripHtml(''), null);
  assert.equal(sanitizeFilename('../../Course:Outline?.pdf'), 'Course_Outline_.pdf');
});

test('course rows use stable columns and ISO term metadata', () => {
  const row = toCourseRow(courseFixture);
  assert.deepEqual(Object.keys(row), [
    'courseId', 'courseCode', 'name', 'term', 'startAt', 'endAt', 'status', 'url',
  ]);
  assert.equal(row.courseId, '93405');
  assert.equal(row.startAt, '2026-07-19T16:00:00Z');
});

test('Canvas JSON requests replay browser cookies and classify expired auth', async () => {
  await withMockFetch(async (_url, options) => {
    assert.match(options.headers.Cookie, /_normandy_session=session-value/);
    return jsonResponse({ id: 1 });
  }, async () => {
    assert.deepEqual(await canvasJson(mockPage(), '/api/v1/test', 'canvas test'), { id: 1 });
  });

  await withMockFetch(async () => jsonResponse({}, 401), async () => {
    await assert.rejects(() => canvasJson(mockPage(), '/api/v1/test', 'canvas test'), AuthRequiredError);
  });
});

test('courses exclude non-academic enrollments unless requested', async () => {
  await withMockFetch(async () => jsonResponse([courseFixture, nonAcademicFixture]), async () => {
    const rows = await getCourses(mockPage(), { includeNonAcademic: false, limit: 20 });
    assert.deepEqual(rows.map((row) => row.courseCode), ['BMS5502S']);
  });
  await withMockFetch(async () => jsonResponse([courseFixture, nonAcademicFixture]), async () => {
    const rows = await getCourses(mockPage(), { includeNonAcademic: true, limit: 20 });
    assert.equal(rows.length, 2);
  });
});

test('course code resolution fetches details with teachers and syllabus', async () => {
  await withMockFetch(async (url) => {
    if (String(url).includes('/api/v1/courses?')) return jsonResponse([courseFixture]);
    return jsonResponse({
      ...courseFixture,
      teachers: [{ display_name: 'Professor Example' }],
      syllabus_body: '<h3>Course Description</h3><p>Build a venture.</p>',
    });
  }, async () => {
    const [row] = await getCourse(mockPage(), { course: 'BMS5502S' });
    assert.equal(row.teachers, 'Professor Example');
    assert.equal(row.syllabus, 'Course Description\nBuild a venture.');
    assert.deepEqual(Object.keys(row), [
      'courseId', 'courseCode', 'name', 'term', 'status', 'teachers',
      'description', 'syllabus', 'url',
    ]);
  });
});

test('announcements map context codes back to course metadata', async () => {
  await withMockFetch(async (url) => {
    if (String(url).includes('/api/v1/courses?')) return jsonResponse([courseFixture]);
    return jsonResponse([{
      id: 475037,
      context_code: 'course_93405',
      title: 'Welcome',
      author: { display_name: 'Professor Example' },
      posted_at: '2026-08-11T07:21:34Z',
      message: '<p>Please read the outline.</p>',
      html_url: '/courses/93405/discussion_topics/475037',
    }]);
  }, async () => {
    const [row] = await getAnnouncements(mockPage(), { course: '', limit: 20 });
    assert.equal(row.courseCode, 'BMS5502S');
    assert.equal(row.message, 'Please read the outline.');
    assert.deepEqual(Object.keys(row), [
      'announcementId', 'courseId', 'courseCode', 'courseName', 'title',
      'author', 'postedAt', 'message', 'url',
    ]);
  });
});

test('files include folder names and preserve numeric byte sizes', async () => {
  await withMockFetch(async (url) => {
    const value = String(url);
    if (value.includes('/api/v1/courses?')) return jsonResponse([courseFixture]);
    if (value.includes('/folders?')) {
      return jsonResponse([{ id: 2084372, full_name: 'course files' }]);
    }
    return jsonResponse([{
      id: 9626980,
      display_name: 'Course Outline.docx',
      'content-type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 85159,
      updated_at: '2026-08-06T18:34:18Z',
      folder_id: 2084372,
      html_url: '/courses/93405/files/9626980',
    }]);
  }, async () => {
    const [row] = await getFiles(mockPage(), { course: 'BMS5502S', query: '', limit: 20 });
    assert.equal(row.folder, 'course files');
    assert.equal(row.sizeBytes, 85159);
    assert.deepEqual(Object.keys(row), [
      'fileId', 'courseId', 'courseCode', 'name', 'contentType',
      'sizeBytes', 'updatedAt', 'folder', 'url',
    ]);
  });
});

test('download writes exact bytes and refuses to overwrite existing files', async () => {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'damnus-canvas-test-'));
  const bytes = Buffer.from('canvas file body');
  const metadata = {
    id: 9626980,
    display_name: 'Course Outline.txt',
    'content-type': 'text/plain',
    size: bytes.length,
    url: 'https://canvas.nus.edu.sg/files/9626980/download?download_frd=1',
  };
  try {
    await withMockFetch(async (url) => {
      if (String(url).includes('/api/v1/files/')) return jsonResponse(metadata);
      return new Response(bytes, {
        status: 200,
        headers: { 'content-type': 'text/plain', 'content-length': String(bytes.length) },
      });
    }, async () => {
      const [row] = await downloadCanvasFile(mockPage(), { file: '9626980', output: tempDir });
      assert.equal(row.status, 'downloaded');
      assert.equal(await fs.promises.readFile(row.path, 'utf8'), 'canvas file body');
      await assert.rejects(
        () => downloadCanvasFile(mockPage(), { file: '9626980', output: tempDir }),
        ArgumentError,
      );
    });
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
});

test('missing course codes and empty announcement lists use empty-result errors', async () => {
  await withMockFetch(async () => jsonResponse([]), async () => {
    await assert.rejects(() => getCourse(mockPage(), { course: 'MISSING1000' }), EmptyResultError);
  });
});
