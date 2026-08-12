import { Strategy } from '@jackwener/opencli/registry';
import { canvasJson, courseUrl, resolveCourse, stripHtml } from './utils.js';

export async function getCourse(page, args) {
  const resolved = await resolveCourse(page, args.course);
  const course = await canvasJson(
    page,
    `/api/v1/courses/${resolved.id}?include[]=term&include[]=syllabus_body&include[]=teachers`,
    'canvas course',
  );
  return [{
    courseId: String(course.id),
    courseCode: course.course_code ? String(course.course_code).trim() : null,
    name: course.name ? String(course.name).trim() : null,
    term: course.term?.name ? String(course.term.name).trim() : null,
    status: course.workflow_state ? String(course.workflow_state) : null,
    teachers: Array.isArray(course.teachers)
      ? course.teachers.map((teacher) => teacher.display_name).filter(Boolean).join(', ') || null
      : null,
    description: stripHtml(course.public_description),
    syllabus: stripHtml(course.syllabus_body),
    url: courseUrl(course.id),
  }];
}

export const courseDefinition = {
  site: 'canvas',
  name: 'course',
  aliases: ['info'],
  access: 'read',
  description: 'Show NUS Canvas course information, teachers, and syllabus',
  example: 'opencli canvas course BMS5502S -f json',
  domain: 'canvas.nus.edu.sg',
  strategy: Strategy.COOKIE,
  browser: true,
  siteSession: 'persistent',
  navigateBefore: false,
  args: [
    { name: 'course', positional: true, required: true, help: 'Canvas course ID or course code' },
  ],
  columns: [
    'courseId', 'courseCode', 'name', 'term', 'status', 'teachers',
    'description', 'syllabus', 'url',
  ],
  func: getCourse,
};
