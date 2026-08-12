---
name: damnus-nusmods
description: Search NUS modules, inspect module requirements and workload, and find class timetable slots through the DamNUS OpenCLI plugin. Use when a student asks about NUS course availability, module details, prerequisites, or lecture, tutorial, and lab schedules.
---

# NUSMods module search

Choose the narrowest command that answers the request.

## Discover modules

Search by module code or words in the title:

```bash
opencli nusmods search "machine learning" --semester 1 --limit 20 -f json
```

Use `--semester 0` to search all semesters. If the academic year matters, set `--acadYear 2026-2027` explicitly.

## Inspect a module

Fetch description, units, department, offered semesters, requirements, preclusions, and workload:

```bash
opencli nusmods module CS1010S --acadYear 2026-2027 -f json
```

## Inspect class slots

List a module's classes in one semester:

```bash
opencli nusmods timetable CS1010S --semester 1 -f json
```

Narrow results only when useful:

- `--lessonType Tutorial`
- `--classNo 32`
- `--day Tue`
- `--acadYear 2026-2027`

## Answering the user

Search broadly before comparing modules, then fetch details for the serious candidates. Use timetable results only when schedule fit matters.

Separate API facts from recommendations. State the academic year and semester used. Do not infer that a student satisfies prerequisites or that a class has vacancies; the command does not expose enrollment eligibility or live seat availability. NUSMods data is refreshed daily, so direct the user to the returned NUSMods URL for a final check when timing matters.
