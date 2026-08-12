import { Strategy } from '@jackwener/opencli/registry';
import { canvasJson, downloadFile, parseFileId } from './utils.js';

export async function downloadCanvasFile(page, args) {
  const fileId = parseFileId(args.file);
  const metadata = await canvasJson(page, `/api/v1/files/${fileId}`, 'canvas download');
  const result = await downloadFile(page, metadata, args.output);
  return [{
    fileId: String(metadata.id),
    name: metadata.display_name ? String(metadata.display_name).trim() : null,
    contentType: metadata['content-type'] ? String(metadata['content-type']) : null,
    sizeBytes: result.size,
    status: 'downloaded',
    path: result.destination,
    url: metadata.url,
  }];
}

export const downloadDefinition = {
  site: 'canvas',
  name: 'download',
  access: 'read',
  description: 'Download one NUS Canvas course file without overwriting an existing file',
  example: 'opencli canvas download 9626980 --output ./canvas-downloads -f json',
  domain: 'canvas.nus.edu.sg',
  strategy: Strategy.COOKIE,
  browser: true,
  siteSession: 'persistent',
  navigateBefore: false,
  args: [
    { name: 'file', positional: true, required: true, help: 'Canvas file ID or Canvas file URL' },
    { name: 'output', type: 'string', default: './canvas-downloads', help: 'Destination directory; existing files are never overwritten' },
  ],
  columns: ['fileId', 'name', 'contentType', 'sizeBytes', 'status', 'path', 'url'],
  func: downloadCanvasFile,
};
