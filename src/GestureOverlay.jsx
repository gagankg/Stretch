import { useEffect, useRef } from 'react';

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    if (!hands || hands.length === 0) return;

    hands.forEach((hand) => {
      const isPinching = hand.pinchState === 'PINCHING' || hand.pinchState === 'HOLDING';
      drawHand(ctx, hand.landmarks, width, height, isPinching);
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
