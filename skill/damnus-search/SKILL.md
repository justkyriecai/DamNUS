---
name: damnus-search
description: Research recommendations, reviews, guides, and lived experiences on Xiaohongshu through OpenCLI, returning a concise synthesis with direct links to the original notes. Use when the user asks to search 小红书, wants Chinese social-platform perspectives, or needs experience-based information about travel, food, shopping, study, careers, or local life.
---

# Xiaohongshu search

Prefer 小红书点点 for a synthesized answer with cited notes:

```bash
opencli xiaohongshu ask "<complete question>" --timeout 90 --source-limit 10 -f json
```

Include the user's location, constraints, budget, dates, or comparison criteria in the question when known. Do not ask the user to repeat context already present in the conversation.

## Source workflow

1. Read `answer` as a platform-generated synthesis, not as verified fact.
2. Match useful claims to relevant items in `sources` using their titles, authors, and quotes.
3. Treat an `ask` source URL as unusable when it is a bare `/explore/<id>` URL, has an empty `xsec_token`, or has not been opened successfully. Do not give these links to the user.
4. Resolve shareable links by searching the original topic or an exact source title:

   ```bash
   opencli xiaohongshu search "<focused keywords>" --limit 10 -f json
   ```

5. Prefer a search result with the same note ID or title as the `ask` source. Use the complete `search_result` URL exactly as returned, including its non-empty `xsec_token`; do not reconstruct it from `note_id` and do not cite `deeplink`.
6. Before citing a candidate, verify that it opens and returns note content:

   ```bash
   opencli xiaohongshu note "<complete search_result URL>" -f json
   ```

7. Omit failed links, deduplicate the rest, and retain the most relevant 3–5 when available. If no candidate passes verification, say that a sourced Xiaohongshu answer is unavailable. Do not provide an uncited synthesis.

If authentication fails, ask the user to sign in through `opencli xiaohongshu login` and retry. If a command fails for another reason, rerun it once with `--trace retain-on-failure`; do not silently replace it with an unrelated search method.

## Response contract

Paraphrase rather than copying 点点's answer. Separate recurring observations from one author's opinion, and flag conflicts between sources.

Every final answer must include at least one verified, clickable Xiaohongshu `search_result` URL containing a non-empty `xsec_token`. Place links next to the supported recommendation when practical, and finish with a compact source list such as:

```markdown
### 小红书原文

- [笔记标题 — 作者](https://www.xiaohongshu.com/search_result/...?xsec_token=...)
```

Never cite `sources_summary` without also linking a verified note. Never output a bare `/explore/<id>` link just because `ask` returned it. Never claim that 点点 searched all of Xiaohongshu. Treat prices, opening hours, immigration rules, medical advice, and other high-stakes or changeable facts as unverified unless checked against an authoritative source.
