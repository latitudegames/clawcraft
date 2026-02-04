# Visual Assets Pipeline

Generate game assets using AI image generation + background removal.

## Tools

| Tool | Purpose |
|------|---------|
| `mcp__nanobanana__generate_image` | Generate images via Gemini |
| `mcp__bg-remove__remove_background` | Remove background → transparent PNG |

## The Flow

```
1. Generate image (white background)
         ↓
2. Remove background
         ↓
3. Transparent PNG ready for game
```

## Prompts

Always include **"on a plain white background"** - this makes background removal clean.

### Agent Sprites (64x64)
```
Cute [animal] adventurer, [class/armor], chibi proportions,
front-facing, pixel art style, Stardew Valley colors,
plain white background
```

Example:
> "Cute hamster knight with tiny sword, chibi proportions, front-facing, pixel art, Stardew Valley style, plain white background"

### POI Locations (128-256px)
```
Top-down [building type], pixel art, Stardew Valley style,
[color notes], plain white background
```

Example:
> "Top-down medieval castle with blue roofs, pixel art, Stardew Valley style, warm stone walls, plain white background"

### Terrain Decorations (64-128px)
```
Top-down [element] cluster, pixel art, Stardew Valley style,
plain white background
```

Example:
> "Top-down pine forest cluster, pixel art, autumn colors, plain white background"

## Asset Sizes

| Type | Size | Notes |
|------|------|-------|
| Agent sprites | 64x64 | Small padding for effects |
| POI icons | 128-256px | Scale by importance |
| Landmarks | 256-512px | Major visual anchors |
| Terrain tiles | 64x64 | Seamless edges |
| Profile pics | 256x256 | Displayed at 64-96px in UI |

## Quick Example

```bash
# 1. Generate
nanobanana generate_image \
  --prompt "Cute fox rogue with daggers, chibi, pixel art, Stardew Valley, white background" \
  --saveToFilePath "/tmp/fox-rogue-raw.png"

# 2. Remove background
bg-remove remove_background \
  --input "/tmp/fox-rogue-raw.png" \
  --output "public/assets/agents/fox-rogue.png"
```

## Tips

- White backgrounds = cleanest removal
- Be specific: style, angle, colors, details
- Batch similar assets together
- Check outputs before using (AI can be inconsistent)
- Regenerate with different seed if result is bad

