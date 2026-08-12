# EstudoAI — Design System

## World
**Warm Professional** — papel quente, tipografia sem serifa, um único accent cobre. Gamificação presente em chips/XP, não no layout inteiro.

## Mode by surface
- Landing: Persuade (calmo)
- App shell / questões / dashboard: Operate

## Color (light)
| Token | Hex | Use |
|-------|-----|-----|
| background | `#F7F5F2` | App wash |
| foreground | `#1C1917` | Body |
| card | `#FFFFFF` | Surfaces |
| primary / CTA | `#9A3412` | Actions, brand |
| secondary | `#F0EBE4` | Soft fills |
| muted-foreground | `#57534E` | Secondary text |
| border | `#E5DFD6` | Dividers |
| success | `#3F6F4E` | Correct |
| destructive | `#B42318` | Wrong |
| warning / XP | `#B45309` | XP only |

Dark: charcoal warm (`#1C1917` surfaces), primary `#EA580C` softened for contrast.

## Typography
- Display / brand: **Sora**
- Body: **Source Sans 3**
- Base 16px, line-height 1.5–1.65 for reading (enunciados e explicações)

## Shape & depth
- Radius: 12–16px (not toy 24px everywhere)
- Borders: 1px
- Shadow: soft single layer, low opacity
- No clay/chunky 3D presses as default language

## Motion
150–250ms ease-out; respect reduced-motion.

## Explanation / correction content
Structured blocks: title → paragraphs → lists. No raw markdown dumps. Clear hierarchy for “Resposta correta”, alternativas e dica.

## Anti-patterns
- Rainbow UI / neon gamification
- Comic or kids display fonts
- Thick Duolingo-style 3D chrome as the whole system
- Placeholder-only form labels
