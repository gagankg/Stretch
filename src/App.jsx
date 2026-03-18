import { useRef, useState, useEffect, useMemo } from 'react';
import useHandTracking from './useHandTracking';
import useGestureSound from './useGestureSound';
import GestureOverlay from './GestureOverlay';
import StatusText from './StatusText';
export default function App() {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [soundOn, setSoundOn] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1280, height: 720 });

  const { hands, cameraError, isLoading } = useHandTracking(videoRef);

  useGestureSound(hands, soundOn);

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

        <GestureOverlay
          hands={hands}
          width={dimensions.width}
          height={dimensions.height}
        />

        <StatusText
          hands={hands}
          showDebug={showDebug}
          stretchAmount={stretchAmount}
        />

        {isLoading && (
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
        <button
          className={`sound-toggle ${soundOn ? '' : 'off'}`}
          onClick={() => setSoundOn((s) => !s)}
        >
          Sound: {soundOn ? 'ON' : 'OFF'}
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="help-btn"
            onClick={() => setShowDebug((d) => !d)}
            style={{ fontSize: '12px', fontFamily: 'monospace' }}
          >
            d
          </button>
          <button className="help-btn" onClick={() => setShowHelp(true)}>
            ?
          </button>
        </div>
      </div>

      {showHelp && (
        <div className="help-overlay" onClick={() => setShowHelp(false)}>
          <div className="help-content" onClick={(e) => e.stopPropagation()}>
            <h2>stretch</h2>
            <p>Pinch your thumb and index finger together in front of the camera.</p>
            <div className="gesture-list">
              <div className="gesture-item">
                <span className="gesture-icon">V</span>
                <span>Open hand — idle</span>
              </div>
              <div className="gesture-item">
                <span className="gesture-icon">O</span>
                <span>Pinch — thumb meets index finger</span>
              </div>
              <div className="gesture-item">
                <span className="gesture-icon">*</span>
                <span>Hold — sustained pinch for 500ms</span>
              </div>
              <div className="gesture-item">
                <span className="gesture-icon">~</span>
                <span>Release — fingers separating</span>
              </div>
            </div>
            <p>Toggle sound for audio feedback on gestures.</p>
            <button className="help-close" onClick={() => setShowHelp(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
