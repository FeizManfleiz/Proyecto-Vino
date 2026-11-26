import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView as TabSafeArea } from 'react-native-screens/experimental';
import { useReducedMotion } from './motion';
import { C } from './theme';

// Piezas sólo del celular: la web no monta las pestañas (ver src/app/_layout.js).

// Respiro bajo el último contenido de cada pestaña. La barra de pestañas ya queda fuera: en Android NativeTabs
// pone un área segura abajo, y en iOS TabScroll la mide y la deja como inset de abajo.
export const TAB_BOTTOM_SPACE = 48;
// Las tarjetas de cada pestaña suben 20 px sobre la foto del encabezado (marginTop: -20)
const HEADER_OVERLAP = 20;
const ios = Platform.OS === 'ios';
// iOS: vista vacía pegada abajo cuyo alto es el área segura de la pestaña (barra de pestañas + indicador de inicio)
const TAB_BAR_PROBE = { position: 'absolute', left: 0, right: 0, bottom: 0, flex: 0, pointerEvents: 'none' };

const setBarStyle = onCream => StatusBar.setStyle(onCream ? 'dark' : 'light', true);

// ScrollView de una pestaña con su TabHeader arriba.
// - Barra de estado: texto claro sobre la foto oscura y oscuro sobre el fondo crema. Al pasar al crema aparece una
//   franja crema detrás de la hora para que el contenido no choque con ella. Sólo cambia al cruzar el borde.
// - iOS: sin ajuste automático de insets ("never"): el contenido empieza en el borde de arriba, así la foto pasa por
//   debajo de la hora (TabHeader ya suma el área segura), y abajo se deja el alto medido de la barra de pestañas.
//   Antes era "always" con contentInset.top = -top, y eso se rompía al reciclar la ScrollView (p. ej. Cerrar sesión →
//   Iniciar sesión): prepareForRecycle la pasa a "never" con el inset negativo puesto, iOS fija el desplazamiento en
//   `top` y al reusarla no se corrige (contentOffset "no cambió"). En Analizar, que es largo, el encabezado quedaba
//   subido y el logo encima de la hora.
export function TabScroll({ header, children, bottomExtra = 0, scrollRef, onScroll, contentContainerStyle, ...props }) {
  const { top } = useSafeAreaInsets();
  const [tabBar, setTabBar] = useState(0);
  const reduced = useReducedMotion();
  const headerH = useRef(0);
  const onCream = useRef(false);
  const scrim = useRef(new Animated.Value(0)).current;

  const update = y => {
    const cream = headerH.current > 0 && y + top > headerH.current - HEADER_OVERLAP;
    if (cream === onCream.current) return;
    onCream.current = cream;
    setBarStyle(cream);
    if (reduced) scrim.setValue(cream ? 1 : 0);
    else Animated.timing(scrim, { toValue: cream ? 1 : 0, duration: 150, useNativeDriver: true }).start();
  };

  // Las pestañas visitadas siguen montadas: la que recibe el foco vuelve a poner su estilo
  useFocusEffect(useCallback(() => setBarStyle(onCream.current), []));
  // Al cerrar sesión se desmontan, y las pantallas de acceso esperan texto claro
  useEffect(() => () => setBarStyle(false), []);

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[{ paddingBottom: TAB_BOTTOM_SPACE + bottomExtra }, contentContainerStyle]}
        contentInsetAdjustmentBehavior="never"
        contentInset={{ bottom: tabBar }}
        scrollIndicatorInsets={{ top }}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={e => { update(e.nativeEvent.contentOffset.y); onScroll?.(e); }}
        {...props}
      >
        <View onLayout={e => { headerH.current = e.nativeEvent.layout.height; }}>{header}</View>
        {children}
      </ScrollView>
      {ios && (
        <TabSafeArea edges={{ bottom: true }} style={TAB_BAR_PROBE} accessibilityElementsHidden
          onLayout={e => setTabBar(e.nativeEvent.layout.height)} />
      )}
      <Animated.View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: top, pointerEvents: 'none', opacity: scrim,
          backgroundColor: C.cream, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line,
        }}
      />
    </View>
  );
}

// Capa fija abajo de una pestaña, justo encima de la barra de pestañas: la barra de calificación de Analizar y el aviso
// de Mejorar. Los toques pasan a la pantalla salvo sobre su contenido.
// iOS: la pantalla sigue por debajo de la barra de pestañas y el área segura de la pestaña la incluye.
// Android: la pantalla ya termina encima de la barra (y del teclado, por KeyboardAvoid).
const DOCK = { position: 'absolute', left: 0, right: 0, bottom: 0, pointerEvents: 'box-none' };
export function TabDock({ children }) {
  if (Platform.OS === 'ios') return <TabSafeArea edges={{ bottom: true }} insetType="all" style={DOCK}>{children}</TabSafeArea>;
  return <View style={DOCK}>{children}</View>;
}
