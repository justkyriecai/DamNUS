import { cli } from '@jackwener/opencli/registry';
import { announcementsDefinition } from './cli/canvas/announcements.js';
import { courseDefinition } from './cli/canvas/course.js';
import { coursesDefinition } from './cli/canvas/courses.js';
import { downloadDefinition } from './cli/canvas/download.js';
import { filesDefinition } from './cli/canvas/files.js';

export const coursesCommand = cli(coursesDefinition);
export const courseCommand = cli(courseDefinition);
export const announcementsCommand = cli(announcementsDefinition);
export const filesCommand = cli(filesDefinition);
export const downloadCommand = cli(downloadDefinition);
