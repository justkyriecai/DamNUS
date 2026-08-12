import { Strategy } from '@jackwener/opencli/registry';
import { EmptyResultError } from '@jackwener/opencli/errors';
import {
  defaultAcadYear,
  fetchNusmodsJson,
  parseAcadYear,
  parseModuleCode,
  parseSemester,
  timetableRows,
} from './utils.js';

export async function getTimetable(args) {
  const moduleCode = parseModuleCode(args.code);
  const acadYear = parseAcadYear(args.acadYear);
  const semester = parseSemester(args.semester);
  const module = await fetchNusmodsJson(
    `${acadYear}/modules/${encodeURIComponent(moduleCode)}.json`,
    'nusmods timetable',
    { notFoundHint: `Module ${moduleCode} was not found in ${acadYear}.` },
  );
  const rows = timetableRows(module, semester, args);
  if (!rows.length) {
    throw new EmptyResultError(
      'nusmods timetable',
      `No ${moduleCode} lessons matched the selected semester and filters.`,
    );
  }
  return rows;
}

export const timetableDefinition = {
  site: 'nusmods',
  name: 'timetable',
  aliases: ['classes'],
  access: 'read',
  description: 'List class slots for an NUS module and semester',
  example: 'opencli nusmods timetable CS1010S --semester 1 --lessonType Tutorial -f json',
  domain: 'api.nusmods.com',
  strategy: Strategy.PUBLIC,
  browser: false,
  args: [
    { name: 'code', positional: true, required: true, help: 'Module code, for example CS1010S' },
    { name: 'acadYear', type: 'string', default: defaultAcadYear(), help: 'Academic year, for example 2026-2027' },
    { name: 'semester', type: 'int', default: 1, help: 'Semester (1-4)' },
    { name: 'lessonType', type: 'string', default: 'all', help: 'Lesson type, or all' },
    { name: 'classNo', type: 'string', default: 'all', help: 'Class number, or all' },
    { name: 'day', type: 'string', default: 'all', help: 'Weekday name or 3-letter abbreviation, or all' },
  ],
  columns: [
    'moduleCode', 'semester', 'classNo', 'lessonType', 'day', 'startTime',
    'endTime', 'venue', 'weeks', 'size', 'url',
  ],
  func: getTimetable,
};
