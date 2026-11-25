// Hoja que sube desde abajo (sólo celular). Un Modal de React Native para tapar también la barra de pestañas:
// Atrás de Android llama a onRequestClose, y en iOS el gesto de escape de VoiceOver también la cierra.
// El movimiento corre en el hilo de UI con Reanimated y se arrastra con Gesture Handler (los dos vienen en Expo Go).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, RIPPLE_ROUND } from './components';
import { useReducedMotion } from './motion';
import { C, F, R } from './theme';

const ios = Platform.OS === 'ios';
const EASE_SHEET = Easing.bezier(0.32, 0.72, 0, 1); // curva de las hojas de iOS
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const OFFSCREEN = 10000; // antes de medir la hoja, fuera de la pantalla

// Hasta dónde llegaría el dedo si siguiera frenando: un movimiento rápido y corto también cierra
function project(velocity) {
  'worklet';
  return ((velocity / 1000) * 0.998) / (1 - 0.998);
}
// Más allá del borde, la hoja sigue cada vez menos al dedo
function rubberband(over, size) {
  'worklet';
  return (over * size * 0.55) / (size + 0.55 * Math.abs(over));
}

// visible/onClose los controla la pantalla. `footer` queda fijo abajo; `children` se desplaza si no cabe.
export function Sheet({ visible, onClose, title, closeLabel = 'Cerrar', footer, children }) {
  const reduced = useReducedMotion();
  const { top, bottom } = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const [mounted, setMounted] = useState(false);
  const y = useSharedValue(OFFSCREEN); // desplazamiento hacia abajo de la hoja
  const o = useSharedValue(0); // opacidad: con "reducir movimiento" la hoja sólo aparece y se desvanece
  const h = useSharedValue(0); // alto medido de la hoja
  const start = useSharedValue(0);
  const opening = useRef(false);
  const dragged = useRef(false); // se cerró arrastrando: ya está abajo, no hay que animar otra vez
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const show = height => {
    if (reduced) {
      y.set(0);
      o.set(withTiming(1, { duration: 150 }));
    } else {
      o.set(1);
      if (height != null) y.set(height);
      y.set(withTiming(0, { duration: 300, easing: EASE_SHEET }));
    }
  };

  useEffect(() => {
    if (visible) {
      if (mounted) show(); // se volvió a abrir mientras se cerraba: sigue desde donde va
      else { opening.current = true; setMounted(true); }
      return;
    }
    if (!mounted) return;
    if (dragged.current) { dragged.current = false; setMounted(false); return; }
    const done = finished => { 'worklet'; if (finished) scheduleOnRN(setMounted, false); };
    if (reduced) o.set(withTiming(0, { duration: 150 }, done));
    else y.set(withTiming(h.get() || winH, { duration: 200, easing: EASE_OUT }, done)); // la salida, más rápida que la entrada
  }, [visible]);

  // La primera medida arranca la entrada desde el alto real de la hoja
  const onLayout = e => {
    const height = e.nativeEvent.layout.height;
    h.set(height);
    if (opening.current) { opening.current = false; show(height); }
  };

  const closeFromDrag = useCallback(() => { dragged.current = true; onCloseRef.current(); }, []);
  const pan = usePanGesture(useMemo(() => ({
    activeOffsetY: [-8, 8], // sólo un arrastre vertical claro; los toques pasan al botón de cerrar
    onActivate: () => {
      'worklet';
      start.set(y.get()); // si la hoja venía moviéndose, sigue desde donde se ve
    },
    onUpdate: e => {
      'worklet';
      const next = start.get() + e.translationY;
      y.set(next >= 0 ? next : rubberband(next, h.get()));
    },
    onDeactivate: e => {
      'worklet';
      const size = h.get();
      if (y.get() + project(e.velocityY) > size * 0.4) {
        y.set(withSpring(size, { duration: 300, dampingRatio: 1, velocity: e.velocityY, overshootClamping: true }, finished => {
          if (finished) scheduleOnRN(closeFromDrag);
        }));
      } else {
        y.set(withSpring(0, { duration: 300, dampingRatio: 0.8, velocity: e.velocityY }));
      }
    },
  }), [closeFromDrag]));

  const sheetStyle = useAnimatedStyle(() => ({ opacity: o.get(), transform: [{ translateY: y.get() }] }));
  const backdropStyle = useAnimatedStyle(() => {
    const size = h.get();
    const shown = size > 0 ? 1 - Math.min(1, Math.max(0, y.get() / size)) : 0;
    return { opacity: o.get() * shown };
  });

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(32,21,29,0.5)' }, backdropStyle]}>
          {/* Tocar fuera cierra; los lectores de pantalla usan el botón Cerrar */}
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} importantForAccessibility="no" />
        </Animated.View>
        <Animated.View
          onLayout={onLayout}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
          style={[{
            position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: winH - top - 24, paddingBottom: bottom + 12,
            backgroundColor: C.white, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, boxShadow: '0 -8px 32px rgba(32,21,29,0.22)',
          }, sheetStyle]}>
          <GestureDetector gesture={pan}>
            <View>
              <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.line, marginTop: 8 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 60, paddingLeft: 20, paddingRight: 8 }}>
                <Text accessibilityRole="header" style={{ flex: 1, fontFamily: F.display, fontSize: 24, lineHeight: 30, color: C.ink }}>{title}</Text>
                <Pressable onPress={onClose} android_ripple={RIPPLE_ROUND} accessibilityRole="button" accessibilityLabel={closeLabel}
                  style={({ pressed }) => ({
                    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: ios && pressed ? C.cream : 'transparent',
                  })}>
                  <Icon name="x" color={C.ink} />
                </Pressable>
              </View>
            </View>
          </GestureDetector>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }} bounces={false}>
            {children}
          </ScrollView>
          {footer ? (
            <View style={{ paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line }}>{footer}</View>
          ) : null}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}
