import * as fs from 'node:fs';
import * as path from 'node:path';
import { pipeline } from 'node:stream/promises';
import {
  ArgumentError,
  AuthRequiredError,
  CommandExecutionError,
  EmptyResultError,
} from '@jackwener/opencli/errors';

export const CANVAS_DOMAIN = 'canvas.nus.edu.sg';
export const CANVAS_BASE = `https://${CANVAS_DOMAIN}`;

export function parseLimit(value = 20, max = 100) {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1) {
    throw new ArgumentError('limit must be a positive integer');
  }
  if (limit > max) throw new ArgumentError(`limit must be <= ${max}`);
  return limit;
}

export function parseCourseRef(value) {
  const course = String(value ?? '').trim();
  if (!course) throw new ArgumentError('course must be a Canvas course ID or course code');
  if (!/^\d+$/.test(course) && !/^[A-Za-z][A-Za-z0-9/_-]{1,30}$/.test(course)) {
    throw new ArgumentError('course must be a Canvas course ID or course code such as BMS5502S');
  }
  return course;
}

export function parseOptionalCourseRef(value) {
  const course = String(value ?? '').trim();
  return course ? parseCourseRef(course) : null;
}

export function parseFileId(value) {
  const raw = String(value ?? '').trim();
  const match = /(?:^|\/files\/)(\d+)(?:\/|$|\?)/.exec(raw);
  if (!match) throw new ArgumentError('file must be a numeric Canvas file ID or Canvas file URL');
  return match[1];
}

export function stripHtml(value) {
  if (value === null || value === undefined) return null;
  const text = String(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text || null;
}

function nullableText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

export async function readCanvasCookie(page) {
  const seen = new Map();
  for (const options of [
    { url: CANVAS_BASE },
    { domain: CANVAS_DOMAIN },
    { domain: `.${CANVAS_DOMAIN}` },
  ]) {
    try {
      const cookies = await page.getCookies(options);
      for (const cookie of cookies ?? []) {
        if (!seen.has(cookie.name)) seen.set(cookie.name, cookie.value);
      }
    } catch {
      // Try the next cookie-jar lookup form.
    }
  }
  if (!seen.size) {
    throw new AuthRequiredError(
      CANVAS_DOMAIN,
      'Sign in to NUS Canvas in Chrome, then run the command again.',
    );
  }
  return [...seen].map(([name, value]) => `${name}=${value}`).join('; ');
}

async function canvasResponse(page, pathname, options = {}) {
  const cookie = await readCanvasCookie(page);
  const url = pathname.startsWith('http') ? pathname : `${CANVAS_BASE}${pathname}`;
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        Cookie: cookie,
        Referer: `${CANVAS_BASE}/`,
        'User-Agent': 'Mozilla/5.0',
        ...options.headers,
      },
      redirect: options.redirect ?? 'follow',
    });
  } catch (error) {
    throw new CommandExecutionError(`NUS Canvas request failed: ${error?.message || error}`);
  }

  const redirectedToLogin = response.url
    ? /\/login(?:\?|$)/.test(new URL(response.url).pathname)
    : false;
  if (response.status === 401 || response.status === 403 || redirectedToLogin) {
    throw new AuthRequiredError(
      CANVAS_DOMAIN,
      'Your NUS Canvas session is missing or expired. Sign in in Chrome and retry.',
    );
  }
  return response;
}

export async function canvasJson(page, pathname, label) {
  const response = await canvasResponse(page, pathname);
  if (response.status === 404) {
    throw new EmptyResultError(label, 'The requested Canvas resource was not found or is unavailable.');
  }
  if (!response.ok) {
    throw new CommandExecutionError(`${label} failed: HTTP ${response.status}`);
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('json')) {
    throw new CommandExecutionError(`${label} returned ${contentType || 'a non-JSON response'}`);
  }
  try {
    return await response.json();
  } catch (error) {
    throw new CommandExecutionError(`${label} returned invalid JSON: ${error?.message || error}`);
  }
}

export function courseUrl(courseId) {
  return `${CANVAS_BASE}/courses/${courseId}`;
}

export function toCourseRow(course) {
  return {
    courseId: String(course.id),
    courseCode: nullableText(course.course_code),
    name: nullableText(course.name),
    term: nullableText(course.term?.name),
    startAt: nullableText(course.term?.start_at ?? course.start_at),
    endAt: nullableText(course.term?.end_at ?? course.end_at),
    status: nullableText(course.workflow_state),
    url: courseUrl(course.id),
  };
}

export function isNonAcademicCourse(course) {
  const term = String(course.term?.name ?? '').toLowerCase();
  return term.includes('non-academic');
}

export async function listActiveCourses(page, { includeNonAcademic = false } = {}) {
  const params = new URLSearchParams({
    enrollment_state: 'active',
    per_page: '100',
  });
  params.append('include[]', 'term');
  const courses = await canvasJson(page, `/api/v1/courses?${params}`, 'canvas courses');
  if (!Array.isArray(courses)) {
    throw new CommandExecutionError('canvas courses returned an unexpected response shape');
  }
  return includeNonAcademic ? courses : courses.filter((course) => !isNonAcademicCourse(course));
}

export async function resolveCourse(page, reference) {
  const course = parseCourseRef(reference);
  if (/^\d+$/.test(course)) {
    return canvasJson(
      page,
      `/api/v1/courses/${course}?include[]=term`,
      'canvas course',
    );
  }

  const courses = await listActiveCourses(page, { includeNonAcademic: true });
  const matches = courses.filter((item) => String(item.course_code ?? '').toLowerCase() === course.toLowerCase());
  if (!matches.length) {
    throw new EmptyResultError('canvas course', `No active Canvas course matched ${course}.`);
  }
  if (matches.length > 1) {
    throw new ArgumentError(
      `course code ${course} matched multiple active courses; use the numeric Canvas course ID`,
    );
  }
  return matches[0];
}

export function sanitizeFilename(value, fallback = 'canvas-file') {
  const filename = path.basename(path.win32.basename(String(value ?? '')))
    .replace(/[\u0000-\u001f<>:"/\\|?*]+/g, '_')
    .trim();
  return filename && filename !== '.' && filename !== '..' ? filename : fallback;
}

export async function downloadFile(page, metadata, outputDirectory) {
  const output = path.resolve(String(outputDirectory ?? './canvas-downloads'));
  const filename = sanitizeFilename(metadata.display_name ?? metadata.filename, `canvas-${metadata.id}`);
  const destination = path.join(output, filename);
  if (fs.existsSync(destination)) {
    throw new ArgumentError(`refusing to overwrite existing file: ${destination}`);
  }

  const response = await canvasResponse(page, metadata.url, {
    headers: { Accept: '*/*' },
  });
  if (!response.ok) {
    throw new CommandExecutionError(`canvas download failed: HTTP ${response.status}`);
  }
  if (!response.body) throw new CommandExecutionError('canvas download returned an empty response body');

  try {
    await fs.promises.mkdir(output, { recursive: true });
    await pipeline(response.body, fs.createWriteStream(destination, { flags: 'wx' }));
  } catch (error) {
    await fs.promises.unlink(destination).catch(() => {});
    if (error?.code === 'EEXIST') {
      throw new ArgumentError(`refusing to overwrite existing file: ${destination}`);
    }
    throw new CommandExecutionError(`Unable to save Canvas file: ${error?.message || error}`);
  }

  const stat = await fs.promises.stat(destination);
  if (Number.isFinite(Number(metadata.size)) && stat.size !== Number(metadata.size)) {
    await fs.promises.unlink(destination).catch(() => {});
    throw new CommandExecutionError(
      `Canvas download size mismatch: expected ${metadata.size} bytes, received ${stat.size}`,
    );
  }
  return { destination, size: stat.size };
}

export const __test__ = { nullableText };
