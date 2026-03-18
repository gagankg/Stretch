import { useRef, useEffect, useCallback } from 'react';
import { GESTURE_STATES } from './useHandTracking';
import { getMostActiveState } from './gestureUtils';

export default function useGestureSound(hands, enabled) {
  const audioCtxRef = useRef(null);
  const prevStateRef = useRef(GESTURE_STATES.IDLE);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playTone = useCallback((freq, duration, type = 'sine') => {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }, [getAudioCtx]);

  const activeState = getMostActiveState(hands);

  useEffect(() => {
    if (!enabled) {
      prevStateRef.current = activeState;
      return;
    }

    const prev = prevStateRef.current;

    if (activeState === GESTURE_STATES.PINCHING && prev !== GESTURE_STATES.PINCHING) {
      playTone(660, 0.15, 'sine');
    }

    if (activeState === GESTURE_STATES.RELEASING && prev !== GESTURE_STATES.RELEASING) {
      playTone(440, 0.2, 'triangle');
    }

    if (activeState === GESTURE_STATES.HOLDING && prev !== GESTURE_STATES.HOLDING) {
      playTone(880, 0.3, 'sine');
    }

    prevStateRef.current = activeState;
  }, [activeState, enabled, playTone]);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);
}
