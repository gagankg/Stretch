import { useRef, useState, useEffect, useMemo } from 'react';
import useHandTracking from './useHandTracking';
import gestureSvg from './assets/gesture.svg';
import GestureOverlay from './GestureOverlay';
import StatusText from './StatusText';
export default function App() {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [cameraStarted, setCameraStarted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const [dimensions, setDimensions] = useState({ width: 1280, height: 720 });

  const { hands, cameraError, isLoading } = useHandTracking(videoRef, cameraStarted);

  // Compute stretch ratio (0 = close, 1 = far apart) when both hands pinch
  const stretchAmount = useMemo(() => {
    if (!hands || hands.length < 2) return null;
    const t0 = hands[0].landmarks[4];
    const i0 = hands[0].landmarks[8];
    const t1 = hands[1].landmarks[4];
    const i1 = hands[1].landmarks[8];
    const x1 = (t0.x + i0.x) / 2;
    const y1 = (t0.y + i0.y) / 2;
    const x2 = (t1.x + i1.x) / 2;
    const y2 = (t1.y + i1.y) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.min(Math.sqrt(dx * dx + dy * dy) / 0.8, 1);
  }, [hands]);

  // Vignette: darken edges with stretch, matching lightsaber pinch thresholds
  const bothPinchingRef = useRef(false);
  const vignetteOpacity = useMemo(() => {
    if (!hands || hands.length < 2) {
      bothPinchingRef.current = false;
      return 0;
    }
    const PINCH_ON = 0.3;
    const PINCH_OFF = 0.4;
    const threshold = bothPinchingRef.current ? PINCH_OFF : PINCH_ON;
    const allPinching = hands.every(h => h.pinchDistance < threshold);
    bothPinchingRef.current = allPinching;
    if (!allPinching) return 0;
    return stretchAmount || 0;
  }, [hands, stretchAmount]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return (
    <div className="app">
      <div className="camera-container" ref={containerRef}>
        <video ref={videoRef} autoPlay playsInline muted />

        <div
          className="vignette-overlay"
          style={{ opacity: vignetteOpacity }}
        />

        <GestureOverlay
          hands={hands}
          width={dimensions.width}
          height={dimensions.height}
        />

        <StatusText
          hands={hands}
          showDebug={false}
          stretchAmount={stretchAmount}
        />

        {!cameraStarted && !cameraError && (
          <div className="start-screen">
            <img src={gestureSvg} alt="Pinch gesture illustration" className="start-gesture-img" />
            <h2>stretch</h2>
            <p>Hand gesture tracking using your camera</p>
            <button className="start-btn" onClick={() => setCameraStarted(true)}>
              Start Camera
            </button>
          </div>
        )}

        {cameraStarted && isLoading && (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading hand tracking...</p>
          </div>
        )}

        {cameraError && (
          <div className="error-state">
            <div className="error-icon">!</div>
            <h3>Camera Error</h3>
            <p>{cameraError}</p>
          </div>
        )}
      </div>

      <div className="controls">
        <button className="icon-btn" onClick={() => setShowHelp(true)} aria-label="Help">
          ?
        </button>
      </div>

      {showHelp && (
        <div className="help-overlay" onClick={() => setShowHelp(false)}>
          <div className="help-content" onClick={(e) => e.stopPropagation()}>
            <h2>stretch</h2>
            <img src={gestureSvg} alt="Pinch gesture illustration" className="help-gesture-img" />
            <p>Stretch is a game where you stretch a line to connect two points.</p>
            <p>Try pinching your index finger and thumb together on both hands to start.</p>
            <p>Have fun.</p>
            <button className="help-close" onClick={() => setShowHelp(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
