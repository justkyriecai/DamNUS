import { cli } from '@jackwener/opencli/registry';
import { jobsDefinition } from './cli/nsws/jobs.js';

export const jobsCommand = cli(jobsDefinition);
