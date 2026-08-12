# Canvas adapter strategy

Strategy: `COOKIE_API`

Contract: authenticated Canvas REST API

Evidence:

- NUS Canvas exposes the standard Canvas endpoints under `https://canvas.nus.edu.sg/api/v1`.
- Authenticated replay returned HTTP 200 JSON for active courses, course details, announcements, course files, folders, and file metadata.
- A real file download followed the URL returned by file metadata and produced a byte-for-byte complete DOCX.
- The endpoint shapes match Instructure's official [Courses](https://developerdocs.instructure.com/services/canvas/courses), [Announcements](https://developerdocs.instructure.com/services/canvas/resources/announcements), and [Files](https://developerdocs.instructure.com/services/canvas/file.all_resources/files) API documentation.

The adapter reads the current NUS Canvas cookies from the persistent OpenCLI Chrome tab and replays read-only requests from Node. This keeps HttpOnly authentication data in memory and avoids storing passwords, cookies, or API tokens. Downloads use the authenticated file URL because its redirect cannot reliably be fetched from page JavaScript under browser CORS rules.

The command surface is deliberately small: list active courses, inspect a course, read announcements, browse files, and download one file. Course references accept either a numeric Canvas ID or an exact active course code. File references accept a numeric file ID or Canvas file URL.

Missing or expired authentication becomes `AuthRequiredError`; malformed arguments use `ArgumentError`; unavailable resources and empty results use `EmptyResultError`; HTTP, JSON, and filesystem failures use `CommandExecutionError`. Downloads create the requested directory, verify the returned byte count when Canvas supplies one, remove partial files after failures, and never overwrite an existing file.
