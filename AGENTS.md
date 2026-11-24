# Reverie Companion Repository Guide

## Start Here

- `src/App.tsx` owns authentication, top-level navigation, URL state, and feature routing.
- `src/CharacterSheet.tsx` owns character loading and sheet orchestration.
- `src/PartyDetail.tsx` owns party orchestration and shared-character state.
- `src/components/sheet/gameplay/`, `narrative/`, and `progression/` contain active sheet cards.
- `src/components/sheet/modals/` contains active sheet modals.
- `src/utils/` contains pure character, item, dice, NPC, and realtime helpers.
- `src/data/` contains rules and glossary data.
- `src/theme/` contains theme definitions and dynamic theme resolution.

## Active Implementation Rule

Prefer files under `gameplay/`, `narrative/`, `progression/`, and `sheet/modals/`. Do not create or revive top-level sheet variants such as `sheet/StatsCard.tsx` or `sheet/Modals.tsx`; these were legacy duplicates.

## Common Changes

- Character migration or save behavior: `src/utils/characterSync.ts`
- Inventory stacking, transfer, and delivery: `src/utils/itemTransfer.ts`
- Dice sessions and logs: `src/utils/diceRoller.ts`
- Combat calculations: `src/utils/combatMath.ts`
- NPC persistence: `src/utils/npcStorage.ts`
- Shared skill/attribute constants: `src/constants/reverie.ts`
- Compendium lookups: `src/CompendiumContext.tsx`

## Validation

Use these commands before finishing:

```bash
npm run test
npm run lint
npm run build
```

## LLM Context Guidance

- Read the smallest module that owns the behavior before changing larger orchestrators.
- Extract pure logic into `src/utils/` instead of increasing `CharacterSheet.tsx` or `PartyDetail.tsx`.
- Avoid broad `any` types in new code.
- Keep feature logic separated from presentational JSX.
