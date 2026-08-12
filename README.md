# DamNUS

DamNUS v0.2 is an [OpenCLI](https://github.com/jackwener/opencli) plugin and Skill collection. It searches NUSMods modules and timetables, finds authenticated NSWS TA/RA jobs, and provides sourced Xiaohongshu research through a standalone Skill.

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
   ```

5. For browser-backed NSWS and Xiaohongshu workflows, install the [OpenCLI Chrome extension](https://chromewebstore.google.com/detail/opencli/ildkmabpimmkaediidaifkhjpohdnifk) and run `opencli doctor`. Sign in to [NSWS](https://inetapps.nus.edu.sg/nsws/app/student/dashboard) for job search, or run `opencli xiaohongshu login` for `$damnus-search`. NUSMods commands use a public API and need neither login.

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

`damnus-search` is intentionally standalone rather than part of the NUS router. Its primary command is:

```bash
opencli xiaohongshu ask "<question>" --timeout 90 --source-limit 10 -f json
```

If 点点 returns no usable note URLs, the Skill falls back to `opencli xiaohongshu search` for source links. It does not return an unsourced Xiaohongshu summary.

EduRec is not included yet.

## Development

Local plugin installs are symlinked, so source edits are immediately available:

```bash
npm test
opencli validate nusmods/search
opencli validate nusmods/module
opencli validate nusmods/timetable
opencli validate nsws/jobs
```

Adapter decisions are documented in [`docs/nusmods-strategy.md`](docs/nusmods-strategy.md) and [`docs/nsws-strategy.md`](docs/nsws-strategy.md).

## Privacy

DamNUS does not store browser credentials. NUSMods commands use public data. NSWS commands read the authenticated browser session in memory and never submit an application automatically. The standalone search Skill sends the user's research question to Xiaohongshu 点点 and returns links supplied by Xiaohongshu.
