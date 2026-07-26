"""Generate promptsets/rewrites-v1/promptset.yaml from the extracted pairs."""
import json
from pathlib import Path

import yaml

SC = Path("/tmp/claude-0/-home-user-web-app-testing/"
          "17c8f8d7-33d5-57e6-95ef-c9affec2685e/scratchpad")
OUT = Path("/home/user/web_app_testing/promptsets/rewrites-v1/promptset.yaml")

pairs = json.loads((SC / "pairs.json").read_text(encoding="utf-8"))

TITLES = {
    "sneaker-store-landing": "Sneaker Store Landing",
    "image-to-3d-cad": "Image to 3D CAD",
    "tornado-simulation": "Tornado Simulation",
    "vampire-slayer-rpg": "Vampire Slayer RPG",
    "personal-tax-tool": "Personal Tax Tool",
    "bitcoin-wallet": "Bitcoin Wallet",
}

prompts = []
for p in pairs:
    pid = p["id"]
    title = TITLES.get(pid, pid.replace("-", " ").title())
    original = p["original"]
    spec = p["design_instructions"].strip()

    # "before" arm: exactly what the person typed, untouched.
    prompts.append({
        "id": f"{pid}-before",
        "title": f"{title} — as typed",
        "pair": pid,
        "variant": "before",
        "notes": p["archetype"],
        "prompt": original,
    })

    # "after" arm: the artifact states the original wording is never edited —
    # the DESIGN_INSTRUCTIONS block is appended beneath it.
    after = f"{original}\n\n<DESIGN_INSTRUCTIONS>\n{spec}\n</DESIGN_INSTRUCTIONS>\n"
    prompts.append({
        "id": f"{pid}-after",
        "title": f"{title} — as rewritten",
        "pair": pid,
        "variant": "after",
        "notes": p["direction"],
        "prompt": after,
    })

doc = {
    "id": "rewrites-v1",
    "name": "Prompt rewrites — before & after",
    "description": (
        "Six prompts from the web_prompt_rewrites_pipeline artifact, each run "
        "twice: once exactly as a person typed it, and once with the appended "
        "<DESIGN_INSTRUCTIONS> block. Same model, same harness, same system "
        "prompt — the only variable is the prompt itself."
    ),
    "defaults": {
        "model": "claude-sonnet-5",
        "effort": "high",
        # The rewritten specs carry explicit "done when" checklists and far more
        # surface area, so they need more room than the baseline promptset.
        "max_iterations": 90,
        "max_total_output_tokens": 700000,
        "wall_clock_seconds": 5400,
        "web_search": True,
    },
    "prompts": prompts,
}


class Literal(str):
    pass


def literal_representer(dumper, data):
    return dumper.represent_scalar("tag:yaml.org,2002:str", str(data), style="|")


yaml.add_representer(Literal, literal_representer)

# Multi-line prompts render as block literals so the YAML stays readable.
for entry in doc["prompts"]:
    if "\n" in entry["prompt"]:
        entry["prompt"] = Literal(entry["prompt"])

header = """# Generated from the "Prompt rewrites — before & after" artifact.
#
# Each of the six tasks appears twice:
#   <task>-before   the prompt exactly as a person typed it
#   <task>-after    the same wording with the <DESIGN_INSTRUCTIONS> block
#                   appended beneath it (the original is never edited)
#
# Prompts sharing a `pair` are rendered side by side in the run report.
# Regenerate with the script in the run notes; edit by hand at your own risk —
# the point of this set is that the text matches the artifact verbatim.

"""

OUT.parent.mkdir(parents=True, exist_ok=True)
body = yaml.dump(doc, sort_keys=False, allow_unicode=True, width=100)
OUT.write_text(header + body, encoding="utf-8")
print(f"wrote {OUT}  ({OUT.stat().st_size:,} bytes, {len(prompts)} prompts)")
