import { useRef, useState, useEffect } from 'react';
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

  const { landmarks, pinchState, pinchDistance, cameraError, isLoading } =
    useHandTracking(videoRef);

  useGestureSound(pinchState, soundOn);

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
          landmarks={landmarks}
          width={dimensions.width}
          height={dimensions.height}
        />

        <StatusText
          pinchState={pinchState}
          pinchDistance={pinchDistance}
          showDebug={showDebug}
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
