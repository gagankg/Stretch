import { useEffect, useRef } from 'react';
import { COLORS } from './colors';
import { GESTURE_STATES } from './useHandTracking';

const PINCH_ON = 0.3;
const PINCH_OFF = 0.4;

// MediaPipe bone connections (finger chains from wrist)
const BONE_CONNECTIONS = [
  [0,1,2,3,4],     // thumb
  [0,5,6,7,8],     // index
  [0,9,10,11,12],  // middle
  [0,13,14,15,16], // ring
  [0,17,18,19,20], // pinky
];

const FINGERTIPS = [4, 8, 12, 16, 20];

function drawHand(ctx, landmarks, width, height, isPinching) {
  // Draw bone connections (subtle skeletal lines)
  ctx.save();
  ctx.strokeStyle = COLORS.boneConnection;
  ctx.lineWidth = 0.5;
  ctx.lineCap = 'round';
  for (const chain of BONE_CONNECTIONS) {
    ctx.beginPath();
    for (let j = 0; j < chain.length; j++) {
      const lm = landmarks[chain[j]];
      const x = (1 - lm.x) * width;
      const y = lm.y * height;
      if (j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();

  // Draw all landmarks with numbered labels
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];
    const x = (1 - lm.x) * width;
    const y = lm.y * height;

    // Neon green dot
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, 2 * Math.PI);
    ctx.fillStyle = '#39ff14';
    ctx.fill();

    // Numbered label
    ctx.font = '9px monospace';
    ctx.fillStyle = '#39ff14';
    ctx.fillText(i, x + 5, y - 5);
  }

  // Draw fingertip highlights
  for (const i of FINGERTIPS) {
    const lm = landmarks[i];
    const x = (1 - lm.x) * width;
    const y = lm.y * height;

    const isThumbOrIndex = (i === 4 || i === 8);
    const highlight = isThumbOrIndex && isPinching;

    if (highlight) {
      // Violet glow halo
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, 2 * Math.PI);
      ctx.fillStyle = COLORS.landmarkGlow;
      ctx.fill();

      // Pinch dot
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = COLORS.landmarkPinch;
      ctx.fill();
    } else {
      // Subtle fingertip dot
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.fillStyle = COLORS.landmarkTip;
      ctx.fill();
    }
  }
}

export default function GestureOverlay({ hands, width, height }) {
  const canvasRef = useRef(null);
  const highlightRef = useRef([false, false]);
  const beamStartRef = useRef(null); // timestamp when beam first appeared

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    if (!hands || hands.length === 0) return;

    hands.forEach((hand, idx) => {
      const thumb = hand.landmarks[4];
      const index = hand.landmarks[8];
      const wrist = hand.landmarks[0];
      const middleBase = hand.landmarks[9];
      const dx = thumb.x - index.x;
      const dy = thumb.y - index.y;
      const dz = (thumb.z || 0) - (index.z || 0);
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const sx = wrist.x - middleBase.x;
      const sy = wrist.y - middleBase.y;
      const sz = (wrist.z || 0) - (middleBase.z || 0);
      const handScale = Math.sqrt(sx * sx + sy * sy + sz * sz);
      const normalized = handScale > 0 ? dist / handScale : dist;

      const wasHighlighted = highlightRef.current[idx];
      const isPinching = wasHighlighted ? normalized < PINCH_OFF : normalized < PINCH_ON;
      highlightRef.current[idx] = isPinching;

      drawHand(ctx, hand.landmarks, width, height, isPinching);
    });

    // Draw beam between hands when both are pinching
    const bothPinching = hands.length >= 2 && highlightRef.current[0] && highlightRef.current[1];

    if (bothPinching) {
      // Track beam start time for ignition effect
      if (!beamStartRef.current) beamStartRef.current = Date.now();

      const thumb0 = hands[0].landmarks[4];
      const index0 = hands[0].landmarks[8];
      const thumb1 = hands[1].landmarks[4];
      const index1 = hands[1].landmarks[8];

      const x1 = (1 - (thumb0.x + index0.x) / 2) * width;
      const y1 = ((thumb0.y + index0.y) / 2) * height;
      const x2 = (1 - (thumb1.x + index1.x) / 2) * width;
      const y2 = ((thumb1.y + index1.y) / 2) * height;

      // Stretch factor
      const lineDx = x2 - x1;
      const lineDy = y2 - y1;
      const pixelDist = Math.sqrt(lineDx * lineDx + lineDy * lineDy);
      const maxDist = width * 0.5;
      const t = Math.min(pixelDist / maxDist, 1);
      const scale = 1 - t; // 1 when close, 0 when far

      // Ignition: fade in over 150ms
      const beamAge = Date.now() - beamStartRef.current;
      const ignition = Math.min(beamAge / 150, 1);

      // Detect HOLDING state from either hand
      const isHolding = hands.some(h => h.pinchState === GESTURE_STATES.HOLDING);

      ctx.save();
      ctx.lineCap = 'round';
      ctx.globalAlpha = ignition;

      // Layer 1 — Outer glow (wide, soft)
      // Glow intensifies as beam stretches (energy concentrating)
      const outerGlow = isHolding ? COLORS.holdGlow : COLORS.beamOuter;
      ctx.strokeStyle = outerGlow;
      ctx.lineWidth = scale * 36 + 6;
      ctx.shadowBlur = (1 - scale * 0.5) * 50 + 10; // intensifies when stretched
      ctx.shadowColor = COLORS.primary;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Layer 2 — Mid glow
      ctx.strokeStyle = COLORS.beamMid;
      ctx.lineWidth = scale * 18 + 3;
      ctx.shadowBlur = (1 - scale * 0.5) * 25 + 5;
      ctx.shadowColor = COLORS.primaryMid;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Layer 3 — Core beam (pulsing)
      const holdPulse = isHolding ? Math.sin(Date.now() / 1500) * 0.4 : 0;
      const pulse = (scale * 10.5 + 1.5) + Math.sin(Date.now() / 80) * 0.6 + holdPulse;
      ctx.strokeStyle = isHolding ? COLORS.holdCore : COLORS.beamCore;
      ctx.lineWidth = pulse;
      ctx.shadowBlur = (1 - scale * 0.5) * 12 + 3;
      ctx.shadowColor = COLORS.beamCoreShadow;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Beam endpoint accents
      const endpointRadius = isHolding ? 3 + Math.sin(Date.now() / 750) * 1 : 3;
      for (const [ex, ey] of [[x1, y1], [x2, y2]]) {
        // Glow ring
        ctx.beginPath();
        ctx.arc(ex, ey, 10, 0, 2 * Math.PI);
        ctx.fillStyle = COLORS.endpointGlow;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(ex, ey, endpointRadius, 0, 2 * Math.PI);
        ctx.fillStyle = isHolding ? COLORS.holdCore : COLORS.endpointFill;
        ctx.fill();
      }

      ctx.restore();
    } else {
      beamStartRef.current = null;
    }
  }, [hands, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}
