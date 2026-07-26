"""Loading and validating a versioned promptset."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

# 1-50 chars, lowercase alphanumeric + internal hyphens. The optional tail group
# keeps single-character ids valid while still forbidding a leading or trailing
# hyphen.
SLUG_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$")


class PromptsetError(Exception):
    pass


@dataclass
class Prompt:
    id: str
    prompt: str
    title: str = ""
    notes: str = ""

    def __post_init__(self) -> None:
        if not SLUG_RE.match(self.id):
            raise PromptsetError(
                f"prompt id {self.id!r} must be lowercase alphanumeric with hyphens "
                "(it becomes a directory name and a URL segment)"
            )
        if not self.prompt.strip():
            raise PromptsetError(f"prompt {self.id!r} has an empty prompt body")
        if not self.title:
            self.title = self.id.replace("-", " ").title()


@dataclass
class Promptset:
    id: str
    path: Path
    prompts: list[Prompt]
    name: str = ""
    description: str = ""
    system_prompt: str = ""
    defaults: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def load(cls, path: str | Path) -> "Promptset":
        """Load `promptset.yaml` from a directory, or a YAML file directly."""
        p = Path(path)
        if p.is_dir():
            candidates = [p / "promptset.yaml", p / "promptset.yml"]
            found = next((c for c in candidates if c.exists()), None)
            if not found:
                raise PromptsetError(f"no promptset.yaml in {p}")
            p = found
        if not p.exists():
            raise PromptsetError(f"{p} does not exist")

        raw = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
        if not isinstance(raw, dict):
            raise PromptsetError(f"{p} must contain a YAML mapping at the top level")

        entries = raw.get("prompts")
        if not entries:
            raise PromptsetError(f"{p} has no `prompts:` list")

        prompts: list[Prompt] = []
        seen: set[str] = set()
        for i, entry in enumerate(entries):
            if not isinstance(entry, dict):
                raise PromptsetError(f"prompts[{i}] in {p} must be a mapping")
            pid = str(entry.get("id", "")).strip()
            if not pid:
                raise PromptsetError(f"prompts[{i}] in {p} is missing `id`")
            if pid in seen:
                raise PromptsetError(f"duplicate prompt id {pid!r} in {p}")
            seen.add(pid)
            prompts.append(
                Prompt(
                    id=pid,
                    prompt=str(entry.get("prompt", "")),
                    title=str(entry.get("title", "")),
                    notes=str(entry.get("notes", "")),
                )
            )

        # A promptset may ship its own system prompt to version the SI alongside
        # the prompts; otherwise the pipeline default is used.
        system_prompt = ""
        declared_si = raw.get("system_prompt_file")
        si_path = p.parent / declared_si if declared_si else p.parent / "system_prompt.md"
        if si_path.exists():
            system_prompt = si_path.read_text(encoding="utf-8")
        elif declared_si:
            raise PromptsetError(f"system_prompt_file {si_path} does not exist")

        pset_id = str(raw.get("id") or raw.get("version") or p.parent.name)
        if not SLUG_RE.match(pset_id):
            raise PromptsetError(
                f"promptset id {pset_id!r} must be lowercase alphanumeric with hyphens"
            )

        return cls(
            id=pset_id,
            path=p,
            prompts=prompts,
            name=str(raw.get("name", pset_id)),
            description=str(raw.get("description", "")),
            system_prompt=system_prompt,
            defaults=raw.get("defaults") or {},
        )
