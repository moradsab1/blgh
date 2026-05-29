import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

let _reduceMotionCache: boolean | null = null;

export const useReduceMotion = (): boolean => {
  const [reduceMotion, setReduceMotion] = useState<boolean>(_reduceMotionCache ?? false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) {
        _reduceMotionCache = value;
        setReduceMotion(value);
      }
    });

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      if (mounted) {
        _reduceMotionCache = value;
        setReduceMotion(value);
      }
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduceMotion;
};

export const getReduceMotion = (): boolean => _reduceMotionCache ?? false;
