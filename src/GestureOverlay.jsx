import { useEffect, useRef } from 'react';

function drawHand(ctx, landmarks, width, height) {
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];
    const x = (1 - lm.x) * width;
    const y = lm.y * height;

    // Green dot
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#39ff14';
    ctx.fill();

    // Number label
    ctx.font = '11px monospace';
    ctx.fillStyle = '#39ff14';
    ctx.fillText(i, x + 8, y + 4);
  }
}

export default function GestureOverlay({ hands, width, height }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    if (!hands || hands.length === 0) return;

    hands.forEach((hand) => {
      drawHand(ctx, hand.landmarks, width, height);

      if (hand.pinchState === 'PINCHING' || hand.pinchState === 'HOLDING') {
        const thumb = hand.landmarks[4];
        const index = hand.landmarks[8];
        const x1 = (1 - thumb.x) * width;
        const y1 = thumb.y * height;
        const x2 = (1 - index.x) * width;
        const y2 = index.y * height;

        ctx.save();
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#3B82F6';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
      }
    });
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
