---
name: taste
description: UI/UX design aesthetics, visual excellence, typography, color taste, micro-animations, and modern web design standards for Antigravity applications.
---

# UI/UX Design Taste & Aesthetic Standards (Antigravity Taste Skill)

This skill enforces world-class UI/UX design taste, visual craftsmanship, and modern web aesthetics across all application interfaces built in Antigravity.

## Core Design Principles

### 1. Visual Excellence & Wow Factor
- **First Impression**: Every interface must feel premium, state-of-the-art, and polished.
- **Glassmorphism & Depth**: Use subtle translucent backgrounds (`backdrop-blur-md`, `bg-white/80` or `bg-slate-950/80`), soft borders (`border-white/10` or `border-slate-200/80`), and layered elevation shadows.
- **Color Harmony**: Avoid raw browser defaults (e.g. plain `#ff0000` or `#0000ff`). Use curated HSL/OKLCH color palettes (e.g., Emerald/Teal, Indigo/Violet, Slate/Zinc neutrals, Amber/Rose accents).

### 2. Modern Typography & Type Hierarchy
- **Font Selection**: Prefer modern sans-serif typefaces such as *Inter*, *Plus Jakarta Sans*, *Outfit*, or *Roboto*.
- **Hierarchy**:
  - Titles: Bold/Black (`font-extrabold` or `font-black`), tight tracking (`tracking-tight`).
  - Subtitles: Medium/Semibold (`font-semibold`), subtle contrast.
  - Body & Captions: Clean, readable line height (`leading-relaxed`), medium contrast (`text-slate-600` / `text-slate-400`).

### 3. Interactive Micro-Animations & Motion
- **Transitions**: Smooth duration and easing (`transition-all duration-200 ease-out`).
- **Interactive Feedback**: Hover elevations (`hover:-translate-y-0.5 hover:shadow-lg`), active click feedback (`active:scale-95`), focus rings (`focus:ring-2 focus:ring-emerald-500/20`).
- **State Progression**: Animated spinners for loading, smooth slide-ins for drawers/modals, pulse animations for live status indicators (`animate-pulse`).

### 4. Layout & Spacing Craftsmanship
- **Border Radius**: Generous, modern rounding (`rounded-2xl` for cards/containers, `rounded-xl` for inputs/buttons, `rounded-full` for badges).
- **Padding & Grid Systems**: Ample whitespace, consistent gap scales (`gap-4`, `gap-6`), responsive layout grids (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`).
- **No Empty Placeholders**: Use real icons (Lucide/Heroicons) and generated media assets instead of blank boxes or plain text placeholders.

### 5. Component Consistency
- **Status Badges**: Pill-shaped badges with soft background tints and contrasting text (`bg-emerald-50 text-emerald-700 border border-emerald-200`).
- **Empty & Loading States**: Rich illustrated empty states with contextual actions, skeleton shimmer loaders (`animate-pulse bg-slate-200`).
