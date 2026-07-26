# rewrites-v1 — before & after

Twelve prompts: the six tasks from the *"Prompt rewrites — before & after"*
artifact, each run twice.

| id suffix | what it is |
|---|---|
| `-before` | the prompt exactly as a person typed it (6–10 words) |
| `-after`  | that same wording with the `<DESIGN_INSTRUCTIONS>` block appended beneath it (1,577–1,943 words) |

The artifact's contract is that **the original wording is never edited** — the
spec is appended, not substituted. `selftest.py` asserts this for all six pairs.

Prompts sharing a `pair` are rendered side by side in the run report, each with
its own screenshot, live link, and a dropdown holding the full prompt text.

## Running it

```bash
export ANTHROPIC_API_KEY=sk-ant-...
./scripts/run_promptset.sh promptsets/rewrites-v1 --parallel 3
./scripts/deploy_vercel.sh
```

Twelve apps, several of them large. Budget roughly **$6–12** and 1–3 hours of
wall clock at `--parallel 3`. To sanity-check one pair first:

```bash
./scripts/run_promptset.sh promptsets/rewrites-v1 \
  --only tornado-simulation-before tornado-simulation-after
```

## Fairness notes

Both arms get the identical harness: same model (`claude-sonnet-5`), same
effort, same system prompt, same tools, same template. The only variable is the
prompt text.

The template carries Tailwind v4, three/@react-three/fiber/drei, zustand, and
lucide-react preinstalled because the rewritten specs name them explicitly.
Without that the "after" arm would be measuring the template's limits rather
than the rewrite's value. The "before" arm has the same packages available and
is free to ignore them.

## Provenance

`_extract_from_artifact.py` parses the saved artifact HTML into `pairs.json`;
`_build_promptset.py` turns that into `promptset.yaml`. Both are kept for
auditability — the promptset is the artifact of record, and hand-editing it
defeats the purpose of the comparison.
