import { cli } from '@jackwener/opencli/registry';
import { searchDefinition } from './cli/nusmods/search.js';
import { moduleDefinition } from './cli/nusmods/module.js';
import { timetableDefinition } from './cli/nusmods/timetable.js';

export const searchCommand = cli(searchDefinition);
export const moduleCommand = cli(moduleDefinition);
export const timetableCommand = cli(timetableDefinition);
