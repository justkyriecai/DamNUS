import {
  ArgumentError,
  CommandExecutionError,
  EmptyResultError,
} from '@jackwener/opencli/errors';

export const API_BASE = 'https://api.nusmods.com/v2';
export const NUSMODS_BASE = 'https://nusmods.com';

const DAY_ORDER = Object.freeze([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]);

const DAY_ALIASES = new Map(DAY_ORDER.flatMap((day) => [
  [day.toLowerCase(), day],
  [day.slice(0, 3).toLowerCase(), day],
]));

function nullableText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

export function defaultAcadYear(date = new Date()) {
  const year = date.getFullYear();
  const startYear = date.getMonth() >= 6 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

export function parseAcadYear(value = defaultAcadYear()) {
  const acadYear = String(value).trim();
  const match = /^(\d{4})-(\d{4})$/.exec(acadYear);
  if (!match || Number(match[2]) !== Number(match[1]) + 1) {
    throw new ArgumentError('acad-year must use consecutive years, for example 2026-2027');
  }
  return acadYear;
}

export function parseLimit(value = 20) {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ArgumentError('limit must be an integer from 1 to 100');
  }
  return limit;
}

export function parseSemester(value, { allowAll = false } = {}) {
  const semester = Number(value);
  if (!Number.isInteger(semester)) {
    throw new ArgumentError(`semester must be ${allowAll ? '0 (all) or ' : ''}an integer from 1 to 4`);
  }
  if (allowAll && semester === 0) return 0;
  if (semester < 1 || semester > 4) {
    throw new ArgumentError(`semester must be ${allowAll ? '0 (all) or ' : ''}an integer from 1 to 4`);
  }
  return semester;
}

export function parseModuleCode(value) {
  const code = String(value ?? '').trim().toUpperCase();
  if (!code) throw new ArgumentError('module code is required');
  if (!/^[A-Z]{1,8}[A-Z0-9-]{1,15}$/.test(code)) {
    throw new ArgumentError('module code must look like CS1010S');
  }
  return code;
}

export function parseSearchQuery(value) {
  const query = String(value ?? '').trim();
  if (!query) throw new ArgumentError('query is required');
  return query;
}

export function parseDay(value = 'all') {
  const raw = String(value).trim().toLowerCase();
  if (raw === 'all') return null;
  const day = DAY_ALIASES.get(raw);
  if (!day) throw new ArgumentError('day must be all or a weekday name such as Monday or Mon');
  return day;
}

export function parseOptionalFilter(value = 'all') {
  const filter = String(value).trim();
  return filter.toLowerCase() === 'all' ? null : filter.toLowerCase();
}

export async function fetchNusmodsJson(path, label, { notFoundHint } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}/${path}`);
  } catch (error) {
    throw new CommandExecutionError(`Unable to fetch ${label}: ${error?.message || error}`);
  }

  if (response.status === 404 && notFoundHint) {
    throw new EmptyResultError(label, notFoundHint);
  }
  if (!response.ok) {
    throw new CommandExecutionError(`Unable to fetch ${label}: HTTP ${response.status}`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new CommandExecutionError(`${label} returned invalid JSON: ${error?.message || error}`);
  }
}

export function moduleUrl(moduleCode) {
  return `${NUSMODS_BASE}/courses/${encodeURIComponent(moduleCode)}`;
}

export function rankModule(module, query) {
  const needle = query.toLowerCase();
  const code = String(module.moduleCode ?? '').toLowerCase();
  const title = String(module.title ?? '').toLowerCase();
  if (code === needle) return 0;
  if (code.startsWith(needle)) return 1;
  if (code.includes(needle)) return 2;
  if (title.startsWith(needle)) return 3;
  if (title.includes(needle)) return 4;
  return Number.POSITIVE_INFINITY;
}

export function searchModuleRows(modules, query, semester, limit) {
  return modules
    .map((module) => ({ module, score: rankModule(module, query) }))
    .filter(({ module, score }) => Number.isFinite(score)
      && (semester === 0 || module.semesters?.includes(semester)))
    .sort((left, right) => left.score - right.score
      || String(left.module.moduleCode).localeCompare(String(right.module.moduleCode)))
    .slice(0, limit)
    .map(({ module }, index) => ({
      rank: index + 1,
      moduleCode: String(module.moduleCode ?? '').trim(),
      title: nullableText(module.title),
      semesters: Array.isArray(module.semesters) ? module.semesters.join(', ') : null,
      url: moduleUrl(module.moduleCode),
    }));
}

function moduleUnits(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const units = Number(value);
  return Number.isFinite(units) ? units : nullableText(value);
}

function semesterNumbers(data) {
  if (!Array.isArray(data)) return null;
  const values = data
    .map((semester) => Number(semester?.semester))
    .filter((semester) => Number.isInteger(semester))
    .sort((a, b) => a - b);
  return values.length ? values.join(', ') : null;
}

function workloadText(value) {
  if (Array.isArray(value)) return value.join(', ');
  return nullableText(value);
}

export function toModuleRow(module) {
  const moduleCode = String(module.moduleCode ?? '').trim().toUpperCase();
  return {
    moduleCode,
    title: nullableText(module.title),
    units: moduleUnits(module.moduleCredit),
    department: nullableText(module.department),
    faculty: nullableText(module.faculty),
    semesters: semesterNumbers(module.semesterData),
    description: nullableText(module.description),
    prerequisite: nullableText(module.prerequisite),
    corequisite: nullableText(module.corequisite),
    preclusion: nullableText(module.preclusion),
    workload: workloadText(module.workload),
    url: moduleUrl(moduleCode),
  };
}

export function compactWeeks(value) {
  if (!Array.isArray(value)) {
    if (value && typeof value === 'object') {
      const start = Number(value.start);
      const end = Number(value.end);
      if (Number.isFinite(start) && Number.isFinite(end)) return `${start}-${end}`;
      return JSON.stringify(value);
    }
    return nullableText(value);
  }

  const weeks = [...new Set(value.map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
  if (!weeks.length) return null;
  const ranges = [];
  let start = weeks[0];
  let end = weeks[0];
  for (const week of weeks.slice(1)) {
    if (week === end + 1) {
      end = week;
    } else {
      ranges.push(start === end ? String(start) : `${start}-${end}`);
      start = week;
      end = week;
    }
  }
  ranges.push(start === end ? String(start) : `${start}-${end}`);
  return ranges.join(', ');
}

export function timetableRows(module, semester, filters = {}) {
  const semesterData = module.semesterData?.find((item) => Number(item.semester) === semester);
  const timetable = Array.isArray(semesterData?.timetable) ? semesterData.timetable : [];
  const lessonType = parseOptionalFilter(filters.lessonType);
  const classNo = parseOptionalFilter(filters.classNo);
  const day = parseDay(filters.day);
  const moduleCode = String(module.moduleCode ?? '').trim().toUpperCase();

  return timetable
    .filter((lesson) => !lessonType || String(lesson.lessonType ?? '').toLowerCase() === lessonType)
    .filter((lesson) => !classNo || String(lesson.classNo ?? '').toLowerCase() === classNo)
    .filter((lesson) => !day || lesson.day === day)
    .sort((left, right) => DAY_ORDER.indexOf(left.day) - DAY_ORDER.indexOf(right.day)
      || String(left.startTime).localeCompare(String(right.startTime))
      || String(left.lessonType).localeCompare(String(right.lessonType))
      || String(left.classNo).localeCompare(String(right.classNo)))
    .map((lesson) => ({
      moduleCode,
      semester,
      classNo: nullableText(lesson.classNo),
      lessonType: nullableText(lesson.lessonType),
      day: nullableText(lesson.day),
      startTime: nullableText(lesson.startTime),
      endTime: nullableText(lesson.endTime),
      venue: nullableText(lesson.venue),
      weeks: compactWeeks(lesson.weeks),
      size: lesson.size !== null && lesson.size !== undefined && String(lesson.size).trim() !== ''
        && Number.isFinite(Number(lesson.size)) ? Number(lesson.size) : null,
      url: moduleUrl(moduleCode),
    }));
}
