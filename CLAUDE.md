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
MediaPipe Hands is loaded via CDN (not npm). The `index.html` includes script tags for `@mediapipe/hands` and `@mediapipe/camera_utils`. The model runs client-side in the browser — no backend.

### Key Files
- `src/useHandTracking.js` — Custom hook that initializes MediaPipe Hands, manages the camera feed, and exposes `landmarks`, `pinchState`, and `pinchDistance`. This is the core logic layer.
- `src/GestureOverlay.jsx` — Canvas component absolutely positioned over the video. Draws 21 hand landmarks (green dots), highlights thumb tip (landmark 4) and index tip (landmark 8) in red, and draws bone connections.
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
- MediaPipe loaded from CDN, not bundled
- Camera permission errors show a user-friendly error state
- Must work on Chrome desktop and mobile Safari
