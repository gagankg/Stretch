# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Stretch is a browser-based hand gesture recognition app. It uses the device camera and MediaPipe Hands to track pinch gestures in real time, rendering hand landmarks on a canvas overlay.

## Commands
- `npm run dev` — start Vite dev server (default: http://localhost:5173)
- `npm run build` — production build to `dist/`
- `npm run preview` — preview production build locally

## Architecture

### MediaPipe Integration
Uses `@mediapipe/tasks-vision` (npm) with `HandLandmarker` API. WASM files loaded from CDN at runtime. The model runs client-side in the browser — no backend.

### Key Files
- `src/useHandTracking.js` — Custom hook that initializes MediaPipe Hands, manages the camera feed, and returns a `hands` array (0–2 entries). Each entry has `{ landmarks, pinchState, pinchDistance }`. Per-hand gesture state is tracked independently via refs.
- `src/GestureOverlay.jsx` — Canvas component absolutely positioned over the video. Draws all detected hands with color-coded landmarks (green for first hand, blue for second), highlights thumb/index tips, and draws bone connections.
- `src/StatusText.jsx` — Displays gesture state text at top/bottom of screen.
- `src/useGestureSound.js` — Web Audio API hook that plays tones on pinch/release events.
- `src/App.jsx` — Root component. Initializes camera, composes all layers, manages sound toggle and help overlay.

### Pinch Detection
- Euclidean distance between landmark 4 (thumb tip) and landmark 8 (index finger tip)
- Normalized against hand scale (wrist-to-middle-finger-base distance)
- Hysteresis thresholds: pinching < 0.08, releasing > 0.15
- Four gesture states: IDLE, PINCHING, HOLDING (sustained > 500ms), RELEASING

### Camera & Canvas
- `<video>` element with `autoPlay playsInline muted`, mirrored via CSS `scaleX(-1)`
- `<canvas>` absolutely positioned over video, same dimensions
- Landmarks are drawn mirrored to match the selfie view
- Canvas coordinates: MediaPipe returns normalized [0,1] coords, multiply by canvas width/height

## Conventions
- No backend — everything runs in the browser
- MediaPipe installed via npm (`@mediapipe/tasks-vision`), WASM loaded from CDN at runtime
- Camera permission errors show a user-friendly error state
- Must work on Chrome desktop and mobile Safari

## Design Context

### Users
Creative technologists, designers, and developers browsing a portfolio. They arrive curious, looking for craft and novelty. The job: experience something that feels inventive and well-made in under 30 seconds. Context is desktop or mobile, likely shared via link.

### Brand Personality
**Playful, experimental, raw.** Stretch is a tactile web toy — it should feel like picking up a strange, beautiful instrument for the first time. Not polished-corporate, not pixel-sterile. It should feel like something built in a lab that leaked onto the internet.

### Aesthetic Direction
- **Visual tone**: Dark, neon-accented, lo-fi meets high-fidelity. Think oscilloscope display meets Teenage Engineering product page — bold type, exposed system data, generous negative space.
- **References**: Teenage Engineering (bold product design, playful-yet-precise, unapologetic use of color on dark surfaces), demoscene art, instrument UIs.
- **Anti-references**: Apple-clean minimalism, generic SaaS dashboards, glassmorphism-heavy landing pages, anything that looks like a template.
- **Theme**: Dark mode only. Deep near-black (`#0A0A12`) with violet primary (`#8B5CF6`). Neon green (`#39ff14`) for raw data overlays. Warm whites for beam core.
- **Typography**: "Exposure" variable font for display (leveraging the EXPO axis for stretch-responsive type). Helvetica Neue / system sans for functional text. All lowercase.
- **Surfaces**: Frosted glass sparingly. No card nesting. Borders are near-invisible (`rgba(255,255,255,0.06)`).

### Design Principles
1. **Show the machine** — Expose landmarks, numbers, raw data. The tracking system is the aesthetic, not something to hide behind polish.
2. **Respond to the body** — Every visual element should react to hand position, pinch distance, or stretch amount. Static screens are failures.
3. **Earn every pixel** — No decorative elements that don't serve the interaction. If it's on screen, it should move, inform, or delight.
4. **Tension over comfort** — Prefer unexpected color combinations, asymmetric layouts, and variable font extremes over safe, centered, balanced compositions.
5. **Instant legibility** — Despite the raw aesthetic, the core interaction (pinch + stretch) must be immediately obvious. Clarity at the edges, chaos at the center.
