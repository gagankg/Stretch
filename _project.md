# Stretch

## What It Is
A browser-based hand gesture recognition app that uses the device camera and MediaPipe to track pinch gestures in real time.

## Stack
- React + Vite
- MediaPipe Hands (CDN: @mediapipe/hands + @mediapipe/camera_utils)
- Canvas overlay for landmark rendering
- Web Audio API for gesture sounds
- No backend

## Goal
Full-screen camera app that detects and visualizes pinch gestures (thumb tip to index finger tip) with real-time landmark overlay, gesture state tracking (IDLE → PINCHING → HOLDING → RELEASING), and audio feedback.

## Log
2026-03-17 — Initial project scaffold with Vite + React
