import { useEffect, useRef, useState, useCallback } from 'react';

const PINCH_THRESHOLD = 0.08;
const RELEASE_THRESHOLD = 0.15;
const HOLD_DELAY = 500;

const GESTURE_STATES = {
  IDLE: 'IDLE',
  PINCHING: 'PINCHING',
  HOLDING: 'HOLDING',
  RELEASING: 'RELEASING',
};

function euclidean(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export default function useHandTracking(videoRef) {
  const [landmarks, setLandmarks] = useState(null);
  const [pinchState, setPinchState] = useState(GESTURE_STATES.IDLE);
  const [pinchDistance, setPinchDistance] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const stateRef = useRef(GESTURE_STATES.IDLE);
  const holdTimerRef = useRef(null);
  const releaseTimerRef = useRef(null);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);

  const onResults = useCallback((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const hand = results.multiHandLandmarks[0];
      setLandmarks(hand);

      const thumbTip = hand[4];
      const indexTip = hand[8];
      const wrist = hand[0];
      const middleBase = hand[9];

      const dist = euclidean(thumbTip, indexTip);
      const handScale = euclidean(wrist, middleBase);
      const normalized = handScale > 0 ? dist / handScale : dist;

      setPinchDistance(normalized);

      const prev = stateRef.current;

      if (normalized < PINCH_THRESHOLD) {
        if (prev === GESTURE_STATES.IDLE || prev === GESTURE_STATES.RELEASING) {
          stateRef.current = GESTURE_STATES.PINCHING;
          setPinchState(GESTURE_STATES.PINCHING);

          clearTimeout(releaseTimerRef.current);
          clearTimeout(holdTimerRef.current);

          holdTimerRef.current = setTimeout(() => {
            if (stateRef.current === GESTURE_STATES.PINCHING) {
              stateRef.current = GESTURE_STATES.HOLDING;
              setPinchState(GESTURE_STATES.HOLDING);
            }
          }, HOLD_DELAY);
        }
      } else if (normalized > RELEASE_THRESHOLD) {
        if (prev === GESTURE_STATES.PINCHING || prev === GESTURE_STATES.HOLDING) {
          stateRef.current = GESTURE_STATES.RELEASING;
          setPinchState(GESTURE_STATES.RELEASING);

          clearTimeout(holdTimerRef.current);
          clearTimeout(releaseTimerRef.current);

          releaseTimerRef.current = setTimeout(() => {
            if (stateRef.current === GESTURE_STATES.RELEASING) {
              stateRef.current = GESTURE_STATES.IDLE;
              setPinchState(GESTURE_STATES.IDLE);
            }
          }, 400);
        }
      }
    } else {
      setLandmarks(null);
      setPinchDistance(null);

      if (stateRef.current !== GESTURE_STATES.IDLE) {
        clearTimeout(holdTimerRef.current);
        clearTimeout(releaseTimerRef.current);
        stateRef.current = GESTURE_STATES.IDLE;
        setPinchState(GESTURE_STATES.IDLE);
      }
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const Hands = window.Hands;
    const Camera = window.Camera;

    if (!Hands || !Camera) {
      setCameraError('MediaPipe libraries not loaded. Check your internet connection.');
      setIsLoading(false);
      return;
    }

    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
    });

    hands.onResults(onResults);
    handsRef.current = hands;

    hands.initialize().then(() => {
      setIsLoading(false);

      const camera = new Camera(video, {
        onFrame: async () => {
          if (handsRef.current) {
            await handsRef.current.send({ image: video });
          }
        },
        width: 1280,
        height: 720,
      });

      cameraRef.current = camera;
      camera.start().catch((err) => {
        setCameraError(
          err.name === 'NotAllowedError'
            ? 'Camera access denied. Please allow camera permissions and reload.'
            : `Camera error: ${err.message}`
        );
      });
    }).catch((err) => {
      setCameraError(`Failed to load hand tracking model: ${err.message}`);
      setIsLoading(false);
    });

    return () => {
      clearTimeout(holdTimerRef.current);
      clearTimeout(releaseTimerRef.current);
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (handsRef.current) {
        handsRef.current.close();
        handsRef.current = null;
      }
    };
  }, [videoRef, onResults]);

  return { landmarks, pinchState, pinchDistance, cameraError, isLoading };
}

export { GESTURE_STATES };
