import { Strategy } from '@jackwener/opencli/registry';
import { CommandExecutionError, EmptyResultError } from '@jackwener/opencli/errors';
import {
  CANVAS_BASE,
  canvasJson,
  listActiveCourses,
  parseLimit,
  parseOptionalCourseRef,
  resolveCourse,
  stripHtml,
} from './utils.js';

export async function getAnnouncements(page, args) {
  const limit = parseLimit(args.limit);
  const courseReference = parseOptionalCourseRef(args.course);
  const courses = courseReference
    ? [await resolveCourse(page, courseReference)]
    : await listActiveCourses(page);
  if (!courses.length) throw new EmptyResultError('canvas announcements', 'No active courses were found.');

  const params = new URLSearchParams({ per_page: String(limit), latest_only: 'false' });
  for (const course of courses) params.append('context_codes[]', `course_${course.id}`);
  const announcements = await canvasJson(
    page,
    `/api/v1/announcements?${params}`,
    'canvas announcements',
  );
  if (!Array.isArray(announcements)) {
    throw new CommandExecutionError('canvas announcements returned an unexpected response shape');
  }
  if (!announcements.length) {
    throw new EmptyResultError('canvas announcements', 'No announcements matched the selected courses.');
  }

  const courseMap = new Map(courses.map((course) => [String(course.id), course]));
  return announcements.slice(0, limit).map((announcement) => {
    const courseId = String(announcement.context_code ?? '').replace(/^course_/, '');
    const course = courseMap.get(courseId);
    return {
      announcementId: String(announcement.id),
      courseId,
      courseCode: course?.course_code ? String(course.course_code) : null,
      courseName: course?.name ? String(course.name) : null,
      title: announcement.title ? String(announcement.title).trim() : null,
      author: announcement.author?.display_name ? String(announcement.author.display_name).trim() : null,
      postedAt: announcement.posted_at ?? null,
      message: stripHtml(announcement.message),
      url: announcement.html_url
        ? new URL(announcement.html_url, CANVAS_BASE).href
        : `${CANVAS_BASE}/courses/${courseId}/announcements`,
    };
  });
}

export const announcementsDefinition = {
  site: 'canvas',
  name: 'announcements',
  aliases: ['notices'],
  access: 'read',
  description: 'List NUS Canvas announcements across active courses or one selected course',
  example: 'opencli canvas announcements BMS5502S --limit 20 -f json',
  domain: 'canvas.nus.edu.sg',
  strategy: Strategy.COOKIE,
  browser: true,
  siteSession: 'persistent',
  navigateBefore: false,
  args: [
    { name: 'course', positional: true, required: false, default: '', help: 'Optional Canvas course ID or course code' },
    { name: 'limit', type: 'int', default: 20, help: 'Maximum rows (1-100)' },
  ],
  columns: [
    'announcementId', 'courseId', 'courseCode', 'courseName', 'title',
    'author', 'postedAt', 'message', 'url',
  ],
  func: getAnnouncements,
};
