---
name: ui-ux-pro-max
description: Enterprise-grade UI/UX Pro Max design system guidelines, micro-interactions, responsive ergonomics, accessibility, and high-conversion web UI standards.
---

# UI/UX Pro Max Enterprise Design System Guidelines

This skill provides comprehensive, high-conversion UI/UX standards, micro-interactions, ergonomics, and accessibility guidelines for building enterprise-grade applications in Antigravity.

## Core System Architecture

### 1. Typography & Hierarchy
- **Primary Typeface**: Sans-serif stack (*Inter*, *Plus Jakarta Sans*, *Outfit*).
- **Scale**:
  - Display / Hero: `text-3xl sm:text-4xl font-extrabold tracking-tight`
  - Section Titles: `text-xl sm:text-2xl font-bold tracking-tight text-slate-900`
  - Subtitles / Labels: `text-xs uppercase font-bold tracking-wider text-slate-500`
  - Body Text: `text-sm text-slate-600 leading-relaxed`
  - Micro Captions: `text-[11px] font-semibold text-slate-400`

### 2. Color System & Contrast Standards (WCAG AA Compliant)
- **Primary Accent**: Emerald / Teal (`emerald-600`, `emerald-700`, `teal-600`) for success, compliance, and primary CTAs.
- **Secondary Accents**:
  - Alert / Urgency: Amber (`amber-500`, `amber-600`) for warnings, pending review.
  - Overdue / Critical: Rose / Red (`red-600`, `rose-600`) for critical items.
  - Neutral Base: Slate / Zinc (`slate-950` for dark headers/modals, `slate-50` for backgrounds).
- **Gradients**: Linear 145deg or radial background glows (`bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950`).

### 3. Glassmorphism & Depth Elevation
- **Card Shells**: Rounded 2xl borders (`rounded-2xl` or `rounded-[1.75rem]`), crisp borders (`border border-slate-200/80` or `border-white/10`).
- **Backdrop Filters**: Translucent overlays (`backdrop-blur-md` or `backdrop-blur-xl bg-white/90`).
- **Elevation Shadows**: Layered soft shadows (`shadow-sm hover:shadow-xl transition-all duration-200`).

### 4. Interactive Micro-Interactions
- **Button Physics**: Scale feedback (`active:scale-95`), hover elevation (`hover:-translate-y-0.5`).
- **Loading & Skeleton Shimmer**: Pulse shimmer states (`animate-pulse bg-slate-200`).
- **Pill Indicators**: Glowing status dots (`size-2 rounded-full bg-emerald-400 animate-pulse`).

### 5. Ergonomics & Touch Target Safety
- **Touch Target Size**: Minimum 44px height for touch inputs and buttons on mobile/tablet screens (`min-h-[44px]` or `min-h-[48px]`).
- **Floating Glass Nav**: Bottom navigation styled as a floating pill bar (`rounded-full shadow-2xl backdrop-blur-xl`).
- **Form Ergonomics**: Floating field labels, inline error messages, instant clear buttons.
