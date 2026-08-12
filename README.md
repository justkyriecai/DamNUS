# DamNUS

DamNUS v0.3 is an [OpenCLI](https://github.com/jackwener/opencli) plugin and Skill collection. It reads courses, announcements, and files from NUS Canvas; searches NUSMods modules and timetables; finds authenticated NSWS TA/RA jobs; and provides sourced Xiaohongshu research through a standalone Skill.

## Set up

1. Install Node.js 21 or newer and OpenCLI:

   ```bash
   npm install -g @jackwener/opencli
   opencli --version
   ```

2. Clone and register this repository as a local OpenCLI plugin:

   ```bash
   git clone https://github.com/KehaoC/DamNUS.git
   cd DamNUS
   opencli plugin install "file://$(pwd)"
   ```

   Released versions can be installed from GitHub instead:

   ```bash
   opencli plugin install github:KehaoC/DamNUS
   ```

3. Register the DamNUS skills with Codex (skip a link if it already exists):

   ```bash
   mkdir -p ~/.codex/skills
   ln -s "$(pwd)/skill/damnus" ~/.codex/skills/damnus
   ln -s "$(pwd)/skill/damnus-nusmods" ~/.codex/skills/damnus-nusmods
   ln -s "$(pwd)/skill/damnus-nsws-jobs" ~/.codex/skills/damnus-nsws-jobs
   ln -s "$(pwd)/skill/damnus-search" ~/.codex/skills/damnus-search
   ```

   Restart Codex after adding the links. Use `$damnus` as the NUS router, invoke `$damnus-nusmods` or `$damnus-nsws-jobs` directly, and use the standalone `$damnus-search` for Xiaohongshu research.

4. Confirm that the commands are registered:

   ```bash
   opencli nusmods search --help
   opencli nusmods module --help
   opencli nusmods timetable --help
   opencli nsws jobs --help
   opencli canvas courses --help
   opencli canvas announcements --help
   opencli canvas files --help
   ```

5. For browser-backed Canvas, NSWS, and Xiaohongshu workflows, install the [OpenCLI Chrome extension](https://chromewebstore.google.com/detail/opencli/ildkmabpimmkaediidaifkhjpohdnifk) and run `opencli doctor`. Sign in to [NUS Canvas](https://canvas.nus.edu.sg/) for course access, sign in to [NSWS](https://inetapps.nus.edu.sg/nsws/app/student/dashboard) for job search, or run `opencli xiaohongshu login` for `$damnus-search`. NUSMods commands use a public API and need neither login.

## Canvas CLI

The command format is platform, function, then arguments:

```bash
opencli canvas courses [--includeNonAcademic] [--limit <number>]
opencli canvas course <course-id-or-code>
opencli canvas announcements [course-id-or-code] [--limit <number>]
opencli canvas files <course-id-or-code> [--query <text>] [--limit <number>]
opencli canvas download <file-id-or-url> [--output <directory>]
```

Examples:

```bash
# List current academic courses
opencli canvas courses -f table

# Inspect one course by code or numeric Canvas ID
opencli canvas course BMS5502S -f json

# Read recent announcements across all current courses, or one course only
opencli canvas announcements --limit 20 -f table
opencli canvas announcements BMS5502S -f json

# Find course files and download one by its fileId
opencli canvas files BMS5502S --query project -f table
opencli canvas download 9626985 --output ./downloads -f json
```

Canvas commands reuse the current Chrome login session in memory. `download` creates the output directory when needed and refuses to overwrite an existing file.

## NUSMods CLI

The command format is platform, function, then arguments:

```bash
opencli nusmods search <query> [filters]
opencli nusmods module <module-code> [filters]
opencli nusmods timetable <module-code> [filters]
```

Examples:

```bash
# Find modules by code or title; semester 0 means all semesters
opencli nusmods search "machine learning" --semester 1 --limit 10 -f json

# Inspect description, prerequisites, preclusions, workload, and offered semesters
opencli nusmods module CS1010S --acadYear 2026-2027 -f json

# List all classes, or narrow by lesson type, class number, and weekday
opencli nusmods timetable CS1010S --semester 1 -f table
opencli nusmods timetable CS1010S --semester 1 --lessonType Tutorial --day Tue -f json
```

The default academic year follows the NUS July-to-June cycle. Override it with `--acadYear YYYY-YYYY`. Search accepts `--semester 0|1|2|3|4` and `--limit 1-100`; timetable accepts `--semester 1|2|3|4`, `--lessonType`, `--classNo`, and `--day`.

## NSWS jobs CLI

TA and RA roles are included by default:

```bash
opencli nsws jobs --limit 20
opencli nsws jobs --role ta --applicant undergrad -f table
opencli nsws jobs --role ra --query AI -f json
opencli nsws jobs --minRate 20 --payment timesheet -f json
```

Available filters:

| Flag | Values | Default |
|---|---|---|
| `--role` | `ta`, `ra`, `ta,ra`, `all` | `ta,ra` |
| `--query` | Keyword matched by NSWS | empty |
| `--applicant` | `any`, `undergrad`, `graduate`, `graduate-sra` | `any` |
| `--payment` | `any`, `timesheet`, `deliverables` | `any` |
| `--minRate` | Minimum hourly rate in SGD | `0` |
| `--limit` | 1–100 rows | `20` |

## Skills

- `skill/damnus` routes requests to the right specialized workflow.
- `skill/damnus-nusmods` discovers modules, inspects requirements, and checks class schedules.
- `skill/damnus-nsws-jobs` finds TA/RA roles, compares fit, and recommends applications.
- `skill/damnus-search` asks Xiaohongshu 点点 first, synthesizes the results, and always links the original notes.

Canvas is intentionally CLI-only in v0.3. A specialized Canvas Skill will be added only after its useful scenarios and decision rules are defined.

`damnus-search` is intentionally standalone rather than part of the NUS router. Its primary command is:

```bash
opencli xiaohongshu ask "<question>" --timeout 90 --source-limit 10 -f json
```

Because 点点 may return bare note URLs that cannot be opened directly, the Skill resolves sources through `opencli xiaohongshu search`, keeps the returned `xsec_token`, and verifies each candidate with `opencli xiaohongshu note` before citing it. It does not return an unsourced or unverified Xiaohongshu summary.

EduRec is not included yet.

## Development

Local plugin installs are symlinked, so source edits are immediately available:

```bash
npm test
opencli validate nusmods/search
opencli validate nusmods/module
opencli validate nusmods/timetable
opencli validate nsws/jobs
opencli validate canvas/courses
opencli validate canvas/course
opencli validate canvas/announcements
opencli validate canvas/files
opencli validate canvas/download
```

Adapter decisions are documented in [`docs/nusmods-strategy.md`](docs/nusmods-strategy.md), [`docs/nsws-strategy.md`](docs/nsws-strategy.md), and [`docs/canvas-strategy.md`](docs/canvas-strategy.md).

## Privacy

DamNUS does not store browser credentials. NUSMods commands use public data. Canvas and NSWS commands read the authenticated browser session in memory; Canvas commands only read course data and download files, while NSWS never submits an application automatically. The standalone search Skill sends the user's research question to Xiaohongshu 点点 and returns links supplied by Xiaohongshu.
