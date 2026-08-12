import { Strategy } from '@jackwener/opencli/registry';
import {
  defaultAcadYear,
  fetchNusmodsJson,
  parseAcadYear,
  parseModuleCode,
  toModuleRow,
} from './utils.js';

export async function getModule(args) {
  const moduleCode = parseModuleCode(args.code);
  const acadYear = parseAcadYear(args.acadYear);
  const module = await fetchNusmodsJson(
    `${acadYear}/modules/${encodeURIComponent(moduleCode)}.json`,
    'nusmods module',
    { notFoundHint: `Module ${moduleCode} was not found in ${acadYear}.` },
  );
  return [toModuleRow(module)];
}

export const moduleDefinition = {
  site: 'nusmods',
  name: 'module',
  aliases: ['view', 'detail'],
  access: 'read',
  description: 'Show NUS module details, prerequisites, workload, and offered semesters',
  example: 'opencli nusmods module CS1010S -f json',
  domain: 'api.nusmods.com',
  strategy: Strategy.PUBLIC,
  browser: false,
  args: [
    { name: 'code', positional: true, required: true, help: 'Module code, for example CS1010S' },
    { name: 'acadYear', type: 'string', default: defaultAcadYear(), help: 'Academic year, for example 2026-2027' },
  ],
  columns: [
    'moduleCode', 'title', 'units', 'department', 'faculty', 'semesters',
    'description', 'prerequisite', 'corequisite', 'preclusion', 'workload', 'url',
  ],
  func: getModule,
};
