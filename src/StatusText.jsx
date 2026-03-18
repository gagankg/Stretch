import { GESTURE_STATES } from './useHandTracking';

const STATUS_TEXT = 'stretch me, pull me';

const STATE_PRIORITY = {
  [GESTURE_STATES.HOLDING]: 3,
  [GESTURE_STATES.PINCHING]: 2,
  [GESTURE_STATES.RELEASING]: 1,
  [GESTURE_STATES.IDLE]: 0,
};

function getMostActive(hands) {
  let bestState = GESTURE_STATES.IDLE;
  let bestDistance = null;
  for (const hand of hands) {
    if ((STATE_PRIORITY[hand.pinchState] || 0) > (STATE_PRIORITY[bestState] || 0)) {
      bestState = hand.pinchState;
      bestDistance = hand.pinchDistance;
    }
  }
  return { pinchState: bestState, pinchDistance: bestDistance };
}

export default function StatusText({ hands, showDebug, stretchAmount }) {
  const { pinchDistance } = getMostActive(hands);

  // EXPO axis: -100 (thin) to +100 (thick)
  // Stretched far apart → thin (-100), close together → thick (+100)
  const expo = stretchAmount != null
    ? Math.round((1 - stretchAmount) * 200 - 100)
    : 0;

  return (
    <>
      <div className="status-text status-top" style={{ fontVariationSettings: `'EXPO' ${expo}` }}>{STATUS_TEXT}</div>
      {showDebug && pinchDistance != null && (
        <div className="debug-label">
          d: {pinchDistance.toFixed(3)}
        </div>
      )}
    </>
  );
}
