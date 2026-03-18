import { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker, ImageSegmenter } from '@mediapipe/tasks-vision';

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

function createHandState() {
  return {
    state: GESTURE_STATES.IDLE,
    holdTimer: null,
    releaseTimer: null,
  };
}

export default function useHandTracking(videoRef) {
  const [hands, setHands] = useState([]);
  const [cameraError, setCameraError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const handStatesRef = useRef([createHandState(), createHandState()]);
  const handLandmarkerRef = useRef(null);
  const imageSegmenterRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const segMaskCanvasRef = useRef(null);
  const maskImageDataRef = useRef(null);

  const processResults = useCallback((results) => {
    const detected = results.landmarks || [];
    const states = handStatesRef.current;

    const newHands = detected.map((hand, idx) => {
      const hs = states[idx];

      const thumbTip = hand[4];
      const indexTip = hand[8];
      const wrist = hand[0];
      const middleBase = hand[9];

      const dist = euclidean(thumbTip, indexTip);
      const handScale = euclidean(wrist, middleBase);
      const normalized = handScale > 0 ? dist / handScale : dist;

      const prev = hs.state;

      if (normalized < PINCH_THRESHOLD) {
        if (prev === GESTURE_STATES.IDLE || prev === GESTURE_STATES.RELEASING) {
          hs.state = GESTURE_STATES.PINCHING;

          clearTimeout(hs.releaseTimer);
          clearTimeout(hs.holdTimer);

          hs.holdTimer = setTimeout(() => {
            if (hs.state === GESTURE_STATES.PINCHING) {
              hs.state = GESTURE_STATES.HOLDING;
              // Force a re-render by updating hands
              setHands((prev) => prev.map((h, i) =>
                i === idx ? { ...h, pinchState: GESTURE_STATES.HOLDING } : h
              ));
            }
          }, HOLD_DELAY);
        }
      } else if (normalized > RELEASE_THRESHOLD) {
        if (prev === GESTURE_STATES.PINCHING || prev === GESTURE_STATES.HOLDING) {
          hs.state = GESTURE_STATES.RELEASING;

          clearTimeout(hs.holdTimer);
          clearTimeout(hs.releaseTimer);

          hs.releaseTimer = setTimeout(() => {
            if (hs.state === GESTURE_STATES.RELEASING) {
              hs.state = GESTURE_STATES.IDLE;
              setHands((prev) => prev.map((h, i) =>
                i === idx ? { ...h, pinchState: GESTURE_STATES.IDLE } : h
              ));
            }
          }, 400);
        }
      }

      return {
        landmarks: hand,
        pinchState: hs.state,
        pinchDistance: normalized,
      };
    });

    // Clear timers for hands that disappeared
    for (let i = detected.length; i < 2; i++) {
      const hs = states[i];
      if (hs.state !== GESTURE_STATES.IDLE) {
        clearTimeout(hs.holdTimer);
        clearTimeout(hs.releaseTimer);
        hs.state = GESTURE_STATES.IDLE;
      }
    }

    setHands(newHands);
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
          numHands: 2,
          minHandDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5,
        });

        if (cancelled) {
          handLandmarker.close();
          return;
        }

        const imageSegmenter = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          outputCategoryMask: false,
          outputConfidenceMasks: true,
        });

        if (cancelled) {
          handLandmarker.close();
          imageSegmenter.close();
          return;
        }

        handLandmarkerRef.current = handLandmarker;
        imageSegmenterRef.current = imageSegmenter;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          handLandmarker.close();
          imageSegmenter.close();
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
            const now = performance.now();
            const results = handLandmarker.detectForVideo(video, now);
            processResults(results);

            // Run selfie segmentation and render mask to offscreen canvas
            const segResults = imageSegmenter.segmentForVideo(video, now);
            if (segResults.confidenceMasks?.length > 0) {
              const mask = segResults.confidenceMasks[0];
              const maskData = mask.getAsFloat32Array();
              const w = mask.width;
              const h = mask.height;
              if (!segMaskCanvasRef.current) {
                segMaskCanvasRef.current = document.createElement('canvas');
              }
              const mc = segMaskCanvasRef.current;
              if (mc.width !== w || mc.height !== h) {
                mc.width = w;
                mc.height = h;
                maskImageDataRef.current = null;
              }
              const mctx = mc.getContext('2d');
              if (!maskImageDataRef.current) {
                maskImageDataRef.current = mctx.createImageData(w, h);
              }
              const imgData = maskImageDataRef.current;
              for (let i = 0; i < maskData.length; i++) {
                imgData.data[i * 4 + 3] = (1 - maskData[i]) * 255;
              }
              mctx.putImageData(imgData, 0, 0);
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
      const states = handStatesRef.current;
      for (const hs of states) {
        clearTimeout(hs.holdTimer);
        clearTimeout(hs.releaseTimer);
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
      if (imageSegmenterRef.current) {
        imageSegmenterRef.current.close();
        imageSegmenterRef.current = null;
      }
    };
  }, [videoRef, processResults]);

  return { hands, cameraError, isLoading, segMaskCanvasRef };
}

export { GESTURE_STATES };
