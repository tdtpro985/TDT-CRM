# Victory Splash Animation — Design Spec
**Date:** 2026-06-04  
**Feature:** "Pipeline Secured" — Deal Secured victory animation for Closed Won  
**Approach:** Option B — React overlay component mounted via `createRoot`

---

## Overview

A multi-stage, full-viewport victory animation that fires on `Closed Won` deal stage confirmation (after API 200 OK). The sequence runs for ~4 seconds then fades out, returning the user to the dashboard. It is skippable at any point via ESC or backdrop click.

This replaces the existing "Confetti" animation when the admin selects "Pipeline Secured" as the Won animation style. The JoJo ("To Be Continued") animation is restricted to Closed Lost only.

---

## Architecture

### New Files

| File | Purpose |
|---|---|
| `frontend/src/components/VictorySplash.jsx` | Self-contained React component; owns stage machine, audio refs, keyboard listeners, and cleanup |
| `frontend/src/styles/victory-splash.css` | All clip-path polygons, keyframes, blueprint grid texture, typography |

### Modified Files

| File | Change |
|---|---|
| `frontend/src/celebration.js` | Add `triggerVictorySplash(dealMeta, onDismiss)`, `dismissActiveVictorySplash()`; mirrors JoJo pattern using `createRoot` |
| `frontend/src/hooks/useCRMData.js` | Import new functions; add `'victory'` branch in `playCelebrationAnimation`; pass `{ name, value }` from deal snapshot; call `dismissActiveVictorySplash()` in `stopAllCelebration()` |
| `frontend/src/views/AdminCelebrationMusicView.jsx` | Add `{ value: 'victory', label: 'Pipeline Secured' }` to Won options; remove `jojo` from Won options |

### Trigger Call Site (`useCRMData.js`)

```js
// In updateDealStage(), after API 200 OK, nextStage === 'Closed Won':
if (animationRef.current.won === 'victory') {
  triggerVictorySplash(
    { name: snapshot.name, value: snapshot.value },
    () => { /* audio cleanup already handled inside component */ }
  )
}
```

No admin-configured audio is used for this animation — both audio tracks are hardcoded to the component.

---

## Stage Machine

```
idle → slash → wireframe-cut → victory-splash → outro → [unmount]
```

| Stage | Offset | Duration | Trigger |
|---|---|---|---|
| `slash` | 0ms | 500ms | Component mounts |
| `wireframe-cut` | 500ms | 1000ms | `setTimeout(500)` |
| `victory-splash` | 1500ms | 2000ms | `setTimeout(1500)` |
| `outro` | 3500ms | 600ms | `setTimeout(3500)` |
| unmount | 4100ms | — | After outro fade completes |

All `setTimeout` IDs are collected in a ref array and cleared together on skip/dismiss.

---

## Audio

| Track | File | Start offset |
|---|---|---|
| Slash SFX | `frontend/src/assets/sounds/slash.mp3` | 0ms (on mount) |
| Background track | `frontend/src/assets/sounds/last-surprise.mp3` | 500ms (wireframe-cut stage) |

Both audio instances are stored in `useRef` inside `VictorySplash.jsx`. On dismiss/skip:
- Both are `.pause()`-ed and `currentTime` reset to `0`
- Refs are nulled

---

## Component: `VictorySplash.jsx`

### Props
```ts
{
  dealName: string,   // deal.name from snapshot
  dealValue: number,  // deal.value from snapshot (raw PHP number)
  onDismiss: () => void
}
```

### Internal State
```ts
stage: 'slash' | 'wireframe-cut' | 'victory-splash' | 'outro'
```

### Lifecycle
1. **Mount:** Set stage to `slash`, play `slash.mp3`, register ESC keydown listener
2. **500ms:** Advance to `wireframe-cut`, play `last-surprise.mp3`
3. **1500ms:** Advance to `victory-splash`
4. **3500ms:** Advance to `outro` (CSS opacity → 0)
5. **4100ms:** Call `onDismiss()`, `root.unmount()`, remove container from DOM

### Skip Logic (ESC or backdrop click)
1. Pause both audio streams, reset `currentTime = 0`
2. Clear all pending `setTimeout` IDs
3. Remove ESC keydown listener
4. Call `onDismiss()`
5. `root.unmount()` + container `remove()`

### `[ Esc to skip ]` Hint
- Position: `fixed`, top-right, `top: 20px`, `right: 24px`
- Font: 0.72rem, `letter-spacing: 0.1em`
- Color: `rgba(255, 255, 255, 0.35)`
- Fades in at 200ms after mount

---

## Visual Design

### Color Palette
| Token | Value | Usage |
|---|---|---|
| Brand Orange | `#F59E0B` | Slash banner A, accent borders, metric value text |
| Deep Charcoal | `#0F172A` | Slash banner B, backdrop, wireframe banner background |
| White | `#FFFFFF` | Deal name text |
| Blueprint Grid | `rgba(99, 179, 237, 0.12)` | Wireframe banner grid lines |

### Stage 1 — Slash Banners
Two `div`s with `position: fixed; inset: 0; z-index: 9998`.

```css
/* Banner A — Orange */
clip-path: polygon(0 0, 100% 0, 85% 100%, 0 100%);
background: #F59E0B;
transform: translateX(-110%);
animation: slash-in-left 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;

/* Banner B — Charcoal */
clip-path: polygon(15% 0, 100% 0, 100% 100%, 0 100%);
background: #0F172A;
transform: translateX(110%);
animation: slash-in-right 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
```

### Stage 2 — Wireframe Cut-In Banner
Full-width horizontal band at vertical center (`top: 50%; transform: translateY(-50%)`).

```css
height: clamp(80px, 14vh, 140px);
background: #0F172A;
background-image:
  repeating-linear-gradient(0deg, rgba(99,179,237,0.12) 0px, transparent 1px, transparent 32px),
  repeating-linear-gradient(90deg, rgba(99,179,237,0.12) 0px, transparent 1px, transparent 32px);
transform: translateX(-100%);
animation: wireframe-slide-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
```

### Stage 3 — Victory Splash
Full-viewport `#0F172A` backdrop. Orange accent borders on top-left and bottom-right corners use angled pseudo-elements with `clip-path: polygon(...)` at 12deg.

**Typography hierarchy:**
```
PIPELINE SECURED
  font-size: clamp(2rem, 5vw, 4rem)
  font-weight: 900
  letter-spacing: 0.25em
  color: #F59E0B
  text-transform: uppercase

⭐ PHP [formatted value]  ·  Deal Secured
  font-size: 1.25rem
  font-weight: 700
  color: #F59E0B

[Deal Name]
  font-size: 1.1rem
  font-weight: 500
  color: #FFFFFF
```

All three text elements rise in via `translateY(20px) → translateY(0)` staggered at 100ms intervals.

### Stage 4 — Outro
```css
transition: opacity 0.6s ease;
opacity: 0;
```
Applied to the root container element when stage advances to `outro`.

---

## `celebration.js` Additions

```js
// Module-level singleton (mirrors _activeJoJo pattern)
let _activeVictorySplash = null

export function triggerVictorySplash(dealMeta, onDismiss = null) {
  if (_activeVictorySplash) { _activeVictorySplash.forceRemove(); _activeVictorySplash = null }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  // dismiss / forceRemove returned and stored in _activeVictorySplash
  root.render(<VictorySplash dealName={dealMeta.name} dealValue={dealMeta.value} ... />)
}

export function dismissActiveVictorySplash() {
  if (_activeVictorySplash) { _activeVictorySplash.dismiss(); _activeVictorySplash = null }
}
```

---

## Admin Panel Changes (`AdminCelebrationMusicView.jsx`)

**Won animation options (after change):**
```js
[
  { value: 'confetti',  label: 'Confetti' },
  { value: 'victory',   label: 'Pipeline Secured' },
  { value: 'none',      label: 'None' },
]
```

**Lost animation options (after change):**
```js
[
  { value: 'jojo',      label: 'To Be Continued' },
  { value: 'confetti',  label: 'Confetti' },
  { value: 'none',      label: 'None' },
]
```

Existing Lost configs using `confetti` continue to work unchanged.

JoJo is no longer available as a Won option.

---

## Cleanup & Guards

- **Route unmount:** `stopAllCelebration()` in `useCRMData.js` calls `dismissActiveVictorySplash()`, which pauses both audio streams and force-removes the overlay
- **Singleton guard:** If `triggerVictorySplash` is called while one is already active (edge case), the previous overlay is `forceRemove()`-ed before mounting the new one
- **Audio safety:** All audio operations wrapped in `.catch(() => {})` to handle autoplay policy rejections silently
