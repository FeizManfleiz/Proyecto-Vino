import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Text } from 'react-native';
import { web } from './theme';

// true si el usuario pidió reducir el movimiento (Android o navegador)
export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => web && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (web) return;
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return !!reduced;
}

// La sección padre indica si ya entró en pantalla
export const InView = createContext(true);

// Aparece con fade + desplazamiento hacia arriba cuando su sección entra en pantalla (ease-out, 600 ms)
export function Reveal({ delay = 0, style, children }) {
  const visible = useContext(InView);
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible && !reduced) Animated.timing(v, { toValue: 1, duration: 600, delay, easing: Easing.out(Easing.cubic), useNativeDriver: !web }).start();
  }, [visible, reduced]);
  if (reduced) return <Animated.View style={style}>{children}</Animated.View>;
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

// Número que cuenta desde 0 cuando su sección es visible
export function CountUp({ to, decimals = 0, prefix = '', suffix = '', style, locale = 'es-MX' }) {
  const visible = useContext(InView);
  const reduced = useReducedMotion();
  const [n, setN] = useState(reduced ? to : 0);
  useEffect(() => {
    if (!visible) return;
    if (reduced) return setN(to);
    let raf, t0;
    const step = t => {
      t0 ??= t;
      const k = Math.min(1, (t - t0) / 1400);
      setN(to * (1 - (1 - k) ** 3));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [visible, reduced, to]);
  const txt = n.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return <Text style={style} accessibilityLabel={`${prefix}${to}${suffix}`}>{prefix}{txt}{suffix}</Text>;
}
