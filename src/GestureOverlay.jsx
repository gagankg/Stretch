import { useEffect, useRef } from 'react';

const PINCH_ON = 0.3;
const PINCH_OFF = 0.4;

function drawHand(ctx, landmarks, width, height, isPinching) {
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];
    const x = (1 - lm.x) * width;
    const y = lm.y * height;

    const isFingerTip = (i === 4 || i === 8);
    const highlight = isFingerTip && isPinching;

    if (highlight) {
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(x, y, highlight ? 4 : 2.5, 0, 2 * Math.PI);
    ctx.fillStyle = highlight ? '#3B82F6' : '#39ff14';
    ctx.fill();

    // Number label
    ctx.font = '11px monospace';
    ctx.fillStyle = highlight ? '#3B82F6' : '#39ff14';
    ctx.fillText(i, x + 8, y + 4);
  }
}

export default function GestureOverlay({ hands, width, height }) {
  const canvasRef = useRef(null);
  const highlightRef = useRef([false, false]);

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

    // Draw blue line between hands when both are pinching
    if (hands.length >= 2 && highlightRef.current[0] && highlightRef.current[1]) {
      const thumb0 = hands[0].landmarks[4];
      const index0 = hands[0].landmarks[8];
      const thumb1 = hands[1].landmarks[4];
      const index1 = hands[1].landmarks[8];

      // Midpoint of each hand's pinch
      const x1 = (1 - (thumb0.x + index0.x) / 2) * width;
      const y1 = ((thumb0.y + index0.y) / 2) * height;
      const x2 = (1 - (thumb1.x + index1.x) / 2) * width;
      const y2 = ((thumb1.y + index1.y) / 2) * height;

      // Stretch factor: 0 = close, 1 = far apart
      const lineDx = x2 - x1;
      const lineDy = y2 - y1;
      const pixelDist = Math.sqrt(lineDx * lineDx + lineDy * lineDy);
      const maxDist = Math.sqrt(width * width + height * height);
      const t = Math.min(pixelDist / maxDist, 1);
      const scale = 1 - t; // 1 when close, 0 when far

      ctx.save();
      ctx.lineCap = 'round';

      // Layer 1 — Outer glow (wide, soft)
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)';
      ctx.lineWidth = scale * 20 + 4;
      ctx.shadowBlur = scale * 30 + 10;
      ctx.shadowColor = '#3B82F6';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Layer 2 — Mid glow (medium)
      ctx.strokeStyle = 'rgba(99, 165, 255, 0.4)';
      ctx.lineWidth = scale * 10 + 2;
      ctx.shadowBlur = scale * 15 + 5;
      ctx.shadowColor = '#60A5FA';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Layer 3 — Core beam (sharp, bright, pulsing)
      const pulse = (scale * 1.5 + 1) + Math.sin(Date.now() / 80) * 0.6;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = pulse;
      ctx.shadowBlur = scale * 8 + 2;
      ctx.shadowColor = '#93C5FD';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.restore();
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
