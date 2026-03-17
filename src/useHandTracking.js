import { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

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
  const handLandmarkerRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);

  const processLandmarks = useCallback((hand) => {
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
  }, []);

  const clearHand = useCallback(() => {
    setLandmarks(null);
    setPinchDistance(null);

    if (stateRef.current !== GESTURE_STATES.IDLE) {
      clearTimeout(holdTimerRef.current);
      clearTimeout(releaseTimerRef.current);
      stateRef.current = GESTURE_STATES.IDLE;
      setPinchState(GESTURE_STATES.IDLE);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        if (cancelled) return;

        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5,
        });

        if (cancelled) {
          handLandmarker.close();
          return;
        }

        handLandmarkerRef.current = handLandmarker;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          handLandmarker.close();
          return;
        }

        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();

        setIsLoading(false);

        let lastTime = -1;
        function detect() {
          if (cancelled) return;

          if (video.readyState >= 2 && video.currentTime !== lastTime) {
            lastTime = video.currentTime;
            const results = handLandmarker.detectForVideo(video, performance.now());

            if (results.landmarks && results.landmarks.length > 0) {
              processLandmarks(results.landmarks[0]);
            } else {
              clearHand();
            }
          }

          rafRef.current = requestAnimationFrame(detect);
        }

        detect();
      } catch (err) {
        if (cancelled) return;
        setCameraError(
          err.name === 'NotAllowedError'
            ? 'Camera access denied. Please allow camera permissions and reload.'
            : `Failed to initialize: ${err.message}`
        );
        setIsLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
      clearTimeout(holdTimerRef.current);
      clearTimeout(releaseTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
    };
  }, [videoRef, processLandmarks, clearHand]);

  return { landmarks, pinchState, pinchDistance, cameraError, isLoading };
}

export { GESTURE_STATES };
