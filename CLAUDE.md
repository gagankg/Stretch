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
