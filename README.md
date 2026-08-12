# DamNUS

DamNUS v0.1 is an [OpenCLI](https://github.com/jackwener/opencli) plugin for finding NUS Student Work Scheme (NSWS) TA and RA opportunities from the command line.

## Set up

1. Install Node.js 21 or newer and OpenCLI:

   ```bash
   npm install -g @jackwener/opencli
   opencli --version
   ```

2. Install the [OpenCLI Chrome extension](https://chromewebstore.google.com/detail/opencli/ildkmabpimmkaediidaifkhjpohdnifk), keep Chrome running, and check the browser bridge:

   ```bash
   opencli doctor
   ```

3. Clone and register this repository as a local OpenCLI plugin:

   ```bash
   git clone https://github.com/KehaoC/DamNUS.git
   cd DamNUS
   opencli plugin install "file://$(pwd)"
   ```

   After the first release, you can install directly from GitHub instead:

   ```bash
   opencli plugin install github:KehaoC/DamNUS
   ```

4. Register the two v0.1 skills with Codex (the commands fail safely if either name already exists):

   ```bash
   mkdir -p ~/.codex/skills
   ln -s "$(pwd)/skill/damnus" ~/.codex/skills/damnus
   ln -s "$(pwd)/skill/damnus-nsws-jobs" ~/.codex/skills/damnus-nsws-jobs
   ```

   Restart Codex after adding the symlinks. Invoke the router as `$damnus` or the job workflow directly as `$damnus-nsws-jobs`.

5. Open [NSWS](https://inetapps.nus.edu.sg/nsws/app/student/dashboard) in Chrome and sign in as an NUS student. DamNUS reads the authenticated browser session; it does not store your NUS password or token.

6. Confirm that the command is registered:

   ```bash
   opencli nsws jobs --help
   ```

## Find TA and RA jobs

The command format is platform first, function second, then filters:

```bash
opencli nsws jobs [filters]
```

TA and RA roles are included by default:

```bash
opencli nsws jobs --limit 20
```

Common searches:

```bash
# Teaching roles for undergraduates
opencli nsws jobs --role ta --applicant undergrad -f table

# Research assistant roles containing "AI"
opencli nsws jobs --role ra --query AI -f json

# TA/RA roles paying at least S$20/hour
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

For agent workflows, use `-f json`. Each row includes the job reference, title, role, applicant type, hourly rate, payment type, department, closing date, skills, description, and a direct NSWS URL.

## Skills

- `skill/damnus` is the top-level router.
- `skill/damnus-nsws-jobs` finds TA/RA roles, compares fit, and recommends which jobs to apply for.

No NUSMods or EduRec commands are included in v0.1. They will be added only after their concrete workflows are defined.

## Development

Local plugin installs are symlinked, so source edits are immediately available:

```bash
npm test
opencli validate nsws/jobs
opencli nsws jobs --limit 3 -f json
```

The NSWS endpoint and authentication strategy are documented in [`docs/nsws-strategy.md`](docs/nsws-strategy.md).

## Privacy

DamNUS performs read-only job searches. It never writes browser credentials to disk, never prints the NSWS bearer token, and never submits an application automatically.
