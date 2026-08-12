import { Strategy } from '@jackwener/opencli/registry';
import { EmptyResultError } from '@jackwener/opencli/errors';
import {
  defaultAcadYear,
  fetchNusmodsJson,
  parseAcadYear,
  parseLimit,
  parseSearchQuery,
  parseSemester,
  searchModuleRows,
} from './utils.js';

export async function searchModules(args) {
  const query = parseSearchQuery(args.query);
  const acadYear = parseAcadYear(args.acadYear);
  const semester = parseSemester(args.semester, { allowAll: true });
  const limit = parseLimit(args.limit);
  const modules = await fetchNusmodsJson(`${acadYear}/moduleList.json`, 'nusmods search');
  const rows = searchModuleRows(Array.isArray(modules) ? modules : [], query, semester, limit);
  if (!rows.length) {
    throw new EmptyResultError('nusmods search', `No modules matched "${query}" in ${acadYear}.`);
  }
  return rows;
}

export const searchDefinition = {
  site: 'nusmods',
  name: 'search',
  access: 'read',
  description: 'Search NUS modules by code or title',
  example: 'opencli nusmods search machine --semester 1 --limit 10 -f json',
  domain: 'api.nusmods.com',
  strategy: Strategy.PUBLIC,
  browser: false,
  args: [
    { name: 'query', positional: true, required: true, help: 'Module code or title keyword' },
    { name: 'acadYear', type: 'string', default: defaultAcadYear(), help: 'Academic year, for example 2026-2027' },
    { name: 'semester', type: 'int', default: 0, help: 'Semester 1-4, or 0 for all' },
    { name: 'limit', type: 'int', default: 20, help: 'Maximum rows (1-100)' },
  ],
  columns: ['rank', 'moduleCode', 'title', 'semesters', 'url'],
  func: searchModules,
};
