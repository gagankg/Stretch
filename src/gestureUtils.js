import { GESTURE_STATES } from './useHandTracking';

const STATE_PRIORITY = {
  [GESTURE_STATES.HOLDING]: 3,
  [GESTURE_STATES.PINCHING]: 2,
  [GESTURE_STATES.RELEASING]: 1,
  [GESTURE_STATES.IDLE]: 0,
};

export function getMostActiveState(hands) {
  let best = GESTURE_STATES.IDLE;
  for (const hand of hands) {
    if ((STATE_PRIORITY[hand.pinchState] || 0) > (STATE_PRIORITY[best] || 0)) {
      best = hand.pinchState;
    }
  }
  return best;
}

export function getMostActive(hands) {
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
