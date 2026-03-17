import { GESTURE_STATES } from './useHandTracking';

const STATUS_MAP = {
  [GESTURE_STATES.IDLE]: 'stretch me, pull me',
  [GESTURE_STATES.PINCHING]: 'pinching...',
  [GESTURE_STATES.HOLDING]: 'holding',
  [GESTURE_STATES.RELEASING]: 'released',
};

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

export default function StatusText({ hands, showDebug }) {
  const { pinchState, pinchDistance } = getMostActive(hands);
  const text = STATUS_MAP[pinchState] || '';

  return (
    <>
      <div className="status-text status-top">{text}</div>
      <div className="status-text status-bottom">
        {pinchState === GESTURE_STATES.HOLDING ? '...' : ''}
      </div>
      {showDebug && pinchDistance != null && (
        <div className="debug-label">
          d: {pinchDistance.toFixed(3)}
        </div>
      )}
    </>
  );
}
