# Reverie Core 0.11.0 — Segmented Content

Content extracted and segmented from **Reverie Core 0.11.0**, covering the
**Prelude through Chapter VI. Disciplines (pages 1–177)**. Chapter VII. Aspects
and everything after it are intentionally excluded.

The split serves the two stated webapp use cases:

1. **Rules review** — browsable, human-readable Markdown, one file per logical
   rules section (`rules/`).
2. **Modular tooltips** — granular, structured JSON keyed by stable IDs, one
   entry per atomic game concept (`tooltips.json` + `data/`), ready to drop into
   character-sheet tooltips.

---

## Folder layout

```
reverie-segments/
├── manifest.json        Navigation tree + file map + counts (START HERE)
├── tooltips.json        Flat { id: entry } map of every tooltip-sized chunk
├── data/                Structured source-of-truth JSON (typed, parsed fields)
│   ├── attributes.json      4 attributes (GRT/REF/INT/PSY)
│   ├── skills.json          12 core + 12 special skills
│   ├── status-effects.json  17 status effects & conditions
│   ├── base-actions.json    7 universal combat actions
│   ├── classes.json         20 classes, grouped abilities (features + 2 paths)
│   └── disciplines.json     10 disciplines, 20 abilities each
└── rules/               Human-readable Markdown for rules review
    ├── 00-front-matter.md
    ├── 01-introduction/
    ├── 02-playing-the-game/
    ├── 03-survival-and-combat/
    ├── 04-characters-in-depth/
    ├── 05-classes/          one file per class
    └── 06-disciplines/      one file per discipline
```

---

## `tooltips.json` — the tooltip library

A flat object mapping a **stable ID** to an entry. Every entry has:

| field      | meaning                                               |
|------------|-------------------------------------------------------|
| `id`       | stable key (use this from the character sheet)        |
| `title`    | display name                                          |
| `category` | one of the categories below                           |
| `text`     | the tooltip body (effect / definition), plain text    |
| `page`     | source page in the PDF (for reference)                |

Ability entries additionally carry structured fields:
`action_type`, `requires`, `cost`, `acc`, `dmg`, `eva`, `weapons`, and for
class abilities `parent` (class id), `group` (`"Class Features"` or path name).

### ID conventions

| category             | count | ID pattern                              | example                               |
|----------------------|-------|-----------------------------------------|---------------------------------------|
| `attribute`          | 4     | `attr-<name>`                           | `attr-grit`                           |
| `core-skill`         | 12    | `skill-<name>`                          | `skill-athletics`                     |
| `special-skill`      | 12    | `skill-<name>`                          | `skill-carry`                         |
| `status-effect`      | 17    | `status-<name>`                         | `status-bleeding`                     |
| `base-action`        | 7     | `action-<name>`                         | `action-dodge`                        |
| `class`              | 20    | `class-<class>`                         | `class-berserker`                     |
| `class-ability`      | 180   | `class-<class>-<ability>`               | `class-berserker-breakthrough`        |
| `discipline`         | 10    | `discipline-<disc>`                     | `discipline-warfare`                  |
| `discipline-ability` | 200   | `discipline-<disc>-<ability>`           | `discipline-warfare-piercing-jab`     |

So a character sheet can request a tooltip directly by composing the ID, e.g.
hovering the "Dodge" action → look up `action-dodge`; hovering a Berserker's
"Breakthrough" → `class-berserker-breakthrough`.

---

## `data/` — structured source of truth

Use these when you need typed fields rather than display text. `classes.json`
keeps ability grouping:

```jsonc
{
  "id": "berserker",
  "name": "Berserker",
  "tags": ["Champion", "Risky", "Brutal"],
  "recommended_disciplines": "Warfare",
  "recommended_special_skills": "Stance, Carry, Authority, Discipline",
  "pages": [58, 61],
  "groups": [
    { "name": "Class Features", "desc": "", "abilities": [ /* ... */ ] },
    { "name": "Revenant", "desc": "An unstoppable offensive path ...", "abilities": [ /* ... */ ] },
    { "name": "Ravager",  "desc": "A bleed-focused path ...",          "abilities": [ /* ... */ ] }
  ]
}
```

Each ability object:

```jsonc
{
  "name": "Breakthrough",
  "marker": ">>>",          // action-economy glyph as printed
  "type": "Melee Attack",
  "requires": "Berserker Rank 1",
  "weapons": null,
  "cost": "4 SN",
  "acc": "+2 ACC", "dmg": "+1 DMG", "eva": null,
  "effect": "If this attack kills or incapacitates your target, ..."
}
```

---

## `manifest.json` — navigation

`manifest.rules` is the chapter → section tree for the rules-review browser;
each section lists its `title`, `pages`, and `file`. `manifest.files` maps the
data files, and `manifest.tooltip_categories` / `manifest.counts` summarize the
library.

---

## Notes

- Rules text is preserved **verbatim** from the PDF (including the source's own
  spellings). Letter-spaced display headers were normalized.
- Disciplines use a two-column print layout; it was de-columned so each ability
  reads as one unit.
- Scope stops at the end of Chapter VI (page 177), as requested.
