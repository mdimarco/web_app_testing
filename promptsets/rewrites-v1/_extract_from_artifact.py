"""Extract the six before/after prompt pairs from the artifact HTML."""
import json, re, sys
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString, Tag

SRC = Path("/root/.claude/projects/-home-user-web-app-testing/"
           "17c8f8d7-33d5-57e6-95ef-c9affec2685e/tool-results/"
           "artifact-5eeebdc4-1785031291-aa18.html")

soup = BeautifulSoup(SRC.read_text(encoding="utf-8"), "html.parser")


def md(node, depth=0):
    """Render the spec div into markdown, preserving structure."""
    out = []
    for el in node.children:
        if isinstance(el, NavigableString):
            t = str(el).strip()
            if t:
                out.append(t)
            continue
        if not isinstance(el, Tag):
            continue
        name = el.name
        if name == "h4":
            out.append(f"\n## {inline(el)}\n")
        elif name == "p":
            out.append(inline(el) + "\n")
        elif name == "ul":
            for li in el.find_all("li", recursive=False):
                out.append(f"- {inline(li)}")
            out.append("")
        elif name == "ol":
            for i, li in enumerate(el.find_all("li", recursive=False), 1):
                out.append(f"{i}. {inline(li)}")
            out.append("")
        else:
            out.append(inline(el))
    return "\n".join(out)


def inline(el):
    """Flatten an element to text, keeping code spans and bold as markdown."""
    parts = []
    for c in el.children:
        if isinstance(c, NavigableString):
            parts.append(str(c))
        elif isinstance(c, Tag):
            if c.name == "code":
                parts.append(f"`{c.get_text()}`")
            elif c.name in ("strong", "b"):
                parts.append(f"**{inline(c)}**")
            elif c.name in ("em", "i"):
                parts.append(f"*{inline(c)}*")
            elif c.name in ("ul", "ol"):
                sub = []
                for li in c.find_all("li", recursive=False):
                    sub.append(f"  - {inline(li)}")
                parts.append("\n" + "\n".join(sub))
            else:
                parts.append(inline(c))
    text = "".join(parts)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    return text.strip()


pairs = []
for sec in soup.select("section.plate"):
    pid = sec.get("id")
    typed = sec.select_one("blockquote.typed")
    spec = sec.select_one("div.spec")
    direction = sec.select_one("p.direction")
    rail = sec.select_one("div.rail")

    archetype = ""
    dl = rail.find("dl") if rail else None
    if dl:
        dts = dl.find_all("dt")
        dds = dl.find_all("dd")
        for dt, dd in zip(dts, dds):
            if dt.get_text(strip=True).lower() == "archetype":
                archetype = dd.get_text(strip=True)

    pairs.append({
        "id": pid,
        "archetype": archetype,
        "direction": direction.get_text(strip=True) if direction else "",
        "original": typed.get_text(strip=True) if typed else "",
        "design_instructions": md(spec) if spec else "",
    })

for p in pairs:
    print(f"--- {p['id']}")
    print(f"    archetype : {p['archetype']}")
    print(f"    direction : {p['direction']}")
    print(f"    original  : {p['original']!r}")
    print(f"    spec words: {len(p['design_instructions'].split())}")
    print(f"    spec chars: {len(p['design_instructions'])}")

out = Path(sys.argv[1])
out.write_text(json.dumps(pairs, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"\nwrote {out} ({len(pairs)} pairs)")
