import { useEffect, useRef } from 'react';

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // index
  [0, 9], [9, 10], [10, 11], [11, 12],  // middle
  [0, 13], [13, 14], [14, 15], [15, 16],// ring
  [0, 17], [17, 18], [18, 19], [19, 20],// pinky
  [5, 9], [9, 13], [13, 17],            // palm
];

export default function GestureOverlay({ landmarks, width, height }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    if (!landmarks) return;

    // Draw connections
    ctx.strokeStyle = 'rgba(0, 255, 100, 0.4)';
    ctx.lineWidth = 2;

    for (const [i, j] of HAND_CONNECTIONS) {
      const a = landmarks[i];
      const b = landmarks[j];
      // Mirror x for selfie view
      const ax = (1 - a.x) * width;
      const ay = a.y * height;
      const bx = (1 - b.x) * width;
      const by = b.y * height;

      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }

    // Draw landmarks
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      const x = (1 - lm.x) * width;
      const y = lm.y * height;

      const isThumbTip = i === 4;
      const isIndexTip = i === 8;
      const isHighlight = isThumbTip || isIndexTip;

      ctx.beginPath();
      ctx.arc(x, y, isHighlight ? 8 : 4, 0, 2 * Math.PI);
      ctx.fillStyle = isHighlight ? '#ff3b3b' : '#00ff66';
      ctx.fill();

      if (isHighlight) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Draw line between thumb tip and index tip
    const thumb = landmarks[4];
    const index = landmarks[8];
    const tx = (1 - thumb.x) * width;
    const ty = thumb.y * height;
    const ix = (1 - index.x) * width;
    const iy = index.y * height;

    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(ix, iy);
    ctx.strokeStyle = 'rgba(255, 59, 59, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [landmarks, width, height]);

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
