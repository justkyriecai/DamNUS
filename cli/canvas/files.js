import { Strategy } from '@jackwener/opencli/registry';
import { CommandExecutionError, EmptyResultError } from '@jackwener/opencli/errors';
import {
  CANVAS_BASE,
  canvasJson,
  parseLimit,
  resolveCourse,
} from './utils.js';

export async function getFiles(page, args) {
  const limit = parseLimit(args.limit);
  const course = await resolveCourse(page, args.course);
  const params = new URLSearchParams({ per_page: String(limit), sort: 'updated_at', order: 'desc' });
  const query = String(args.query ?? '').trim();
  if (query) params.set('search_term', query);

  const [files, folders] = await Promise.all([
    canvasJson(page, `/api/v1/courses/${course.id}/files?${params}`, 'canvas files'),
    canvasJson(page, `/api/v1/courses/${course.id}/folders?per_page=100`, 'canvas folders'),
  ]);
  if (!Array.isArray(files) || !Array.isArray(folders)) {
    throw new CommandExecutionError('canvas files returned an unexpected response shape');
  }
  if (!files.length) {
    throw new EmptyResultError('canvas files', `No files matched ${course.course_code ?? course.id}.`);
  }
  const folderMap = new Map(folders.map((folder) => [String(folder.id), folder.full_name ?? folder.name]));
  return files.slice(0, limit).map((file) => ({
    fileId: String(file.id),
    courseId: String(course.id),
    courseCode: course.course_code ? String(course.course_code) : null,
    name: file.display_name ? String(file.display_name).trim() : null,
    contentType: file['content-type'] ? String(file['content-type']) : null,
    sizeBytes: Number.isFinite(Number(file.size)) ? Number(file.size) : null,
    updatedAt: file.updated_at ?? null,
    folder: folderMap.get(String(file.folder_id)) ?? null,
    url: file.html_url
      ? new URL(file.html_url, CANVAS_BASE).href
      : `${CANVAS_BASE}/courses/${course.id}/files/${file.id}`,
  }));
}

export const filesDefinition = {
  site: 'canvas',
  name: 'files',
  access: 'read',
  description: 'List and search files available in an NUS Canvas course',
  example: 'opencli canvas files BMS5502S --query project --limit 20 -f json',
  domain: 'canvas.nus.edu.sg',
  strategy: Strategy.COOKIE,
  browser: true,
  siteSession: 'persistent',
  navigateBefore: false,
  args: [
    { name: 'course', positional: true, required: true, help: 'Canvas course ID or course code' },
    { name: 'query', type: 'string', default: '', help: 'Optional filename search' },
    { name: 'limit', type: 'int', default: 20, help: 'Maximum rows (1-100)' },
  ],
  columns: [
    'fileId', 'courseId', 'courseCode', 'name', 'contentType',
    'sizeBytes', 'updatedAt', 'folder', 'url',
  ],
  func: getFiles,
};
