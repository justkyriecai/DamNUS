import { Strategy } from '@jackwener/opencli/registry';
import { EmptyResultError } from '@jackwener/opencli/errors';
import { listActiveCourses, parseLimit, toCourseRow } from './utils.js';

export async function getCourses(page, args) {
  const limit = parseLimit(args.limit);
  const courses = await listActiveCourses(page, { includeNonAcademic: Boolean(args.includeNonAcademic) });
  const rows = courses.slice(0, limit).map(toCourseRow);
  if (!rows.length) throw new EmptyResultError('canvas courses', 'No active Canvas courses were found.');
  return rows;
}

export const coursesDefinition = {
  site: 'canvas',
  name: 'courses',
  access: 'read',
  description: 'List active NUS Canvas courses; excludes non-academic courses by default',
  example: 'opencli canvas courses --limit 20 -f json',
  domain: 'canvas.nus.edu.sg',
  strategy: Strategy.COOKIE,
  browser: true,
  siteSession: 'persistent',
  navigateBefore: false,
  args: [
    { name: 'includeNonAcademic', type: 'bool', default: false, help: 'Include non-academic Canvas courses' },
    { name: 'limit', type: 'int', default: 20, help: 'Maximum rows (1-100)' },
  ],
  columns: ['courseId', 'courseCode', 'name', 'term', 'startAt', 'endAt', 'status', 'url'],
  func: getCourses,
};
