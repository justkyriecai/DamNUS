---
name: damnus-nsws-jobs
description: Find, filter, compare, and recommend NUS Student Work Scheme TA and RA opportunities through the DamNUS OpenCLI plugin. Use when a student wants campus teaching or research work, asks what NSWS roles fit them, or wants help deciding which NUS jobs to apply for.
---

# NSWS TA/RA job search

Use the authenticated, read-only command:

```bash
opencli nsws jobs --role ta,ra --limit 20 -f json
```

Adjust filters from the user's stated constraints:

- `--role ta|ra|ta,ra|all`
- `--query <keywords>` for topics, modules, skills, or departments
- `--applicant any|undergrad|graduate|graduate-sra`
- `--payment any|timesheet|deliverables`
- `--minRate <SGD>`
- `--limit <1-100>`

If the user has not provided a profile, run a broad TA/RA search first. Ask only for details that materially change fit, such as degree level, subject strengths, technical skills, schedule, and minimum pay.

Rank results using explicit evidence from each row:

1. Eligibility and applicant type.
2. Match between the user's background and `skills`/`description`.
3. Closing date and realistic availability.
4. Pay and payment type.
5. Role-specific upside: teaching exposure for TA roles or research/domain alignment for RA roles.

Return a short ranked shortlist. For each recommendation, include the job reference, why it fits, one concern or requirement to verify, and the direct NSWS URL. Separate facts from inference.

Never claim the user is eligible when the listing does not prove it. Never submit an application automatically. If authentication is required, ask the user to sign in to NSWS in the OpenCLI browser tab and rerun the search.
