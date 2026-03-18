import { getMostActive } from './gestureUtils';

const STATUS_TEXT = 'stretch me, pull me';

export default function StatusText({ hands, showDebug, stretchAmount }) {
  const { pinchDistance } = getMostActive(hands);

  // EXPO axis: -100 (thick) to +100 (thin)
  // Stretched far apart → thin (+100), close together → thick (-100)
  const expo = stretchAmount != null
    ? Math.round(stretchAmount * 200 - 100)
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
