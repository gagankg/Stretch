import { GESTURE_STATES } from './useHandTracking';

const STATUS_MAP = {
  [GESTURE_STATES.IDLE]: 'stretch me, pull me',
  [GESTURE_STATES.PINCHING]: 'pinching...',
  [GESTURE_STATES.HOLDING]: 'holding',
  [GESTURE_STATES.RELEASING]: 'released',
};

export default function StatusText({ pinchState, pinchDistance, showDebug }) {
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
