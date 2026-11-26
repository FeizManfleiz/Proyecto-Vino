// Lista de la pestaña Mis vinos (sólo celular; la web sigue con HistoryCard de analysis-ui.js).
// Filas de 72 px, ordenar por fecha o calificación, y borrar deslizando a la izquierda o con el ícono, siempre con
// confirmación. Los gestos son de Gesture Handler (ReanimatedSwipeable) y corren en el hilo de UI.
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { Easing, Extrapolation, FadeOut, interpolate, LinearTransition, ReduceMotion, useAnimatedStyle } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Card, Icon, Kicker, P, RIPPLE, RIPPLE_ROUND, Segmented, TIER_STYLE } from './components';
import { loadSort, saveSort } from './history';
import { sortWines } from './mobile-logic';
import { C, F, R } from './theme';
import { wineLabel } from './wines';

const ios = Platform.OS === 'ios';
const ACTION_W = 96; // panel "Borrar" que aparece detrás de la fila
const SORTS = [['Recientes', 'date'], ['Calificación', 'quality']];
// Al borrar, la fila se desvanece y las de abajo suben a cerrar el hueco; al cambiar el orden se reacomodan.
// Con "reducir movimiento" el sistema las quita (ReduceMotion.System).
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const MOVE = LinearTransition.duration(200).easing(EASE_OUT).reduceMotion(ReduceMotion.System);
const LEAVE = FadeOut.duration(150).reduceMotion(ReduceMotion.System);

const saved = w => new Date(w.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

// Panel vino detrás de la fila: el ícono crece y se aclara mientras se desliza
function DeleteAction({ progress }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 1], [0.4, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.get(), [0, 1], [0.85, 1], Extrapolation.CLAMP) }],
  }));
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ width: ACTION_W, backgroundColor: C.wine, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ alignItems: 'center', gap: 4 }, style]}>
        <Icon name="trash" color={C.white} />
        <Text style={{ fontFamily: F.bodySb, fontSize: 13, color: C.white }}>Borrar</Text>
      </Animated.View>
    </View>
  );
}

// Una fila: tocarla abre el vino; deslizarla a la izquierda (o el ícono) pide confirmar el borrado.
// `onDelete` resuelve true si se borró; si se cancela, la fila regresa sola.
function WineRow({ w, first, onOpen, onDelete }) {
  const swipe = useRef(null);
  const [tierBg, tierFg] = TIER_STYLE[w.tier] ?? [C.cream, C.ink];
  const label = wineLabel(w);
  const meta = `${w.isRed ? 'Tinto' : 'Blanco'}${w.vintage ? ` · Cosecha ${w.vintage}` : ''} · ${saved(w)}`;

  // Al soltar pasado el umbral: una vibración y el diálogo, en el mismo momento en que el panel queda abierto
  const onSwiped = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (!(await onDelete(w))) swipe.current?.close();
  };

  return (
    <Animated.View layout={MOVE} exiting={LEAVE} style={{ borderTopWidth: first ? 0 : 1, borderTopColor: C.line }}>
      <ReanimatedSwipeable ref={swipe} renderRightActions={progress => <DeleteAction progress={progress} />}
        overshootRight={false} rightThreshold={ACTION_W / 2} onSwipeableWillOpen={onSwiped}
        childrenContainerStyle={{ backgroundColor: C.white }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => onOpen(w)} android_ripple={RIPPLE}
            accessibilityRole="button" accessibilityLabel={`${label}, calidad ${w.quality.toFixed(1)}, ${meta}`}
            accessibilityHint="Abre el vino en Analizar"
            accessibilityActions={[{ name: 'delete', label: 'Borrar' }]}
            onAccessibilityAction={e => { if (e.nativeEvent.actionName === 'delete') onDelete(w); }}
            style={({ pressed }) => ({
              flex: 1, minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingLeft: 16,
              backgroundColor: ios && pressed ? C.cream : 'transparent',
            })}>
            <View style={{
              width: 56, height: 48, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center',
              backgroundColor: tierBg, borderWidth: 1, borderColor: C.line,
            }}>
              <Text style={{ fontFamily: F.display, fontSize: 20, color: tierFg, fontVariant: ['tabular-nums'] }}>{w.quality.toFixed(1)}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              {/* El año ya va en la línea de abajo ("Cosecha 2021") */}
              <Text numberOfLines={1} style={{ fontFamily: F.bodySb, fontSize: 16, color: C.ink }}>{w.name}</Text>
              <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 13, color: C.muted }}>{meta}</Text>
            </View>
          </Pressable>
          <Pressable onPress={() => onDelete(w)} android_ripple={RIPPLE_ROUND} accessibilityRole="button" accessibilityLabel={`Borrar ${label}`}
            style={({ pressed }) => ({
              width: 48, height: 48, borderRadius: 24, marginHorizontal: 6, alignItems: 'center', justifyContent: 'center',
              backgroundColor: ios && pressed ? C.cream : 'transparent',
            })}>
            <Icon name="trash" size={20} color={C.muted} />
          </Pressable>
        </View>
      </ReanimatedSwipeable>
    </Animated.View>
  );
}

// La tarjeta de Mis vinos: orden arriba (con dos o más vinos) y las filas
export function WineList({ history, onOpen, onDelete, empty, emptyAction }) {
  const [sort, setSort] = useState('date');
  useEffect(() => { loadSort().then(setSort); }, []);
  const choose = by => { setSort(by); saveSort(by); };

  if (history.length === 0) {
    return (
      <Card style={{ padding: 20 }}>
        <Kicker>MIS VINOS</Kicker>
        <P size={15} color={C.muted}>{empty}</P>
        {emptyAction}
      </Card>
    );
  }
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {history.length > 1 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, padding: 16, paddingBottom: 12 }}>
          <Kicker style={{ marginBottom: 0 }}>ORDENAR POR</Kicker>
          <Segmented minHeight={48} label="Ordenar por" options={SORTS} value={sort} onChange={choose} />
        </View>
      )}
      <View style={{ borderTopWidth: history.length > 1 ? 1 : 0, borderTopColor: C.line }}>
        {sortWines(history, sort).map((w, i) => <WineRow key={w.id} w={w} first={i === 0} onOpen={onOpen} onDelete={onDelete} />)}
      </View>
    </Card>
  );
}
