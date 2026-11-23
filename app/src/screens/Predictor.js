import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import model from '../model.json';
import { predict } from '../model-core';
import { GUIDES, reportBody, savePdf } from '../pdf';
import { s } from '../ui';

const LABELS = {
  'fixed acidity': 'Acidez fija (g/L)', 'volatile acidity': 'Acidez volátil (g/L)', 'citric acid': 'Ácido cítrico (g/L)',
  'residual sugar': 'Azúcar residual (g/L)', chlorides: 'Cloruros (g/L)', 'free sulfur dioxide': 'SO₂ libre (mg/L)',
  'total sulfur dioxide': 'SO₂ total (mg/L)', density: 'Densidad (g/cm³)', pH: 'pH', sulphates: 'Sulfatos (g/L)', alcohol: 'Alcohol (% vol)',
};
// Ejemplos reales del dataset
const PRESETS = {
  Tinto: [7.4, 0.7, 0, 1.9, 0.076, 11, 34, 0.9978, 3.51, 0.56, 9.4],
  Blanco: [7, 0.27, 0.36, 20.7, 0.045, 45, 170, 1.001, 3, 0.45, 8.8],
  'Tinto premium': [7.3, 0.65, 0, 1.2, 0.065, 15, 21, 0.9946, 3.39, 0.47, 10],
};
const TYPES = [['Auto', undefined], ['Tinto', 1], ['Blanco', 0]];

const notify = msg => (Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Aviso', msg));

export default function Predictor({ user, onSignOut }) {
  const [values, setValues] = useState(PRESETS.Tinto.map(String));
  const [type, setType] = useState(undefined);
  const [result, setResult] = useState(null);
  const wide = useWindowDimensions().width >= 900; // laptop: formulario y resultado lado a lado

  const onPredict = () => {
    const x = values.map(v => Number(String(v).replace(',', '.')));
    const bad = x.findIndex((v, i) => !Number.isFinite(v) || v < 0 || String(values[i]).trim() === '');
    if (bad >= 0) return notify(`Valor inválido en "${LABELS[model.features[bad]]}"`);
    setResult(predict(model, x, type));
  };
  const pdf = (title, body) => savePdf(title, body).catch(e => notify(e.message));

  return (
    <ScrollView contentContainerStyle={s.page}>
      <View style={s.nav}>
        <Text style={s.h1}>Predictor de Vinos</Text>
        <View style={[s.row, { alignItems: 'center' }]}>
          <Text>Hola, {user.name}</Text>
          <Pressable style={s.btnAlt} onPress={onSignOut} accessibilityRole="button"><Text>Cerrar sesión</Text></Pressable>
        </View>
      </View>

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 24, alignItems: 'flex-start' }}>
        <View style={[s.box, { flex: wide ? 3 : undefined, width: wide ? undefined : '100%' }]}>
          <Text style={s.h2}>Cargar ejemplo</Text>
          <View style={s.row}>
            {Object.keys(PRESETS).map(k => (
              <Pressable key={k} style={s.btnAlt} onPress={() => { setValues(PRESETS[k].map(String)); setResult(null); }}>
                <Text>{k}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.h2}>Tipo de vino</Text>
          <View style={s.row}>
            {TYPES.map(([label, v]) => (
              <Pressable key={label} style={[s.btnAlt, type === v && s.chipOn]} onPress={() => setType(v)}
                accessibilityState={{ selected: type === v }}>
                <Text>{label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, marginTop: 8 }}>
            {model.features.map((f, i) => (
              <View key={f} style={{ flexBasis: wide ? '33.33%' : '50%', padding: 6 }}>
                <Text style={s.label}>{LABELS[f]}</Text>
                <TextInput style={s.input} keyboardType="decimal-pad" value={values[i]} accessibilityLabel={LABELS[f]}
                  onChangeText={t => setValues(vs => vs.map((v, j) => (j === i ? t : v)))} onSubmitEditing={onPredict} />
              </View>
            ))}
          </View>
          <Pressable style={s.btn} onPress={onPredict} accessibilityRole="button"><Text style={s.btnText}>Predecir</Text></Pressable>
        </View>

        <View style={{ flex: wide ? 2 : undefined, width: wide ? undefined : '100%', gap: 16 }}>
          <View style={s.box}>
            <Text style={s.h2}>Resultado</Text>
            {!result ? <Text style={s.muted}>Captura los valores y presiona Predecir.</Text> : (
              <>
                <Text style={{ fontSize: 40, fontWeight: '700' }}>{result.quality.toFixed(1)} / 10</Text>
                <Text>Gama {result.tier.name}: {result.tier.desc}</Text>
                <Text>Tipo: {result.isRed ? 'Tinto' : 'Blanco'} ({(result.pRed * 100).toFixed(0)}% prob. tinto)</Text>
                <Text>Dulzor: {result.flavor.dulzor}</Text>
                <Text>Acidez: {result.flavor.acidez}</Text>
                <Text>Cuerpo: {result.flavor.cuerpo}</Text>
                <Text>Notas: {result.flavor.notes.join(', ') || '—'}</Text>
                <Text>Maridaje: {result.flavor.pairing}</Text>
                <Pressable style={s.btn} onPress={() => pdf('Reporte de predicción', reportBody(model, LABELS, values, result))}>
                  <Text style={s.btnText}>Descargar reporte PDF</Text>
                </Pressable>
              </>
            )}
          </View>
          <View style={s.box}>
            <Text style={s.h2}>PDFs informativos</Text>
            {GUIDES.map(g => (
              <Pressable key={g.title} style={s.btnAlt} onPress={() => pdf(g.title, g.body)}><Text>{g.title}</Text></Pressable>
            ))}
          </View>
          <Text style={s.muted}>
            Modelo: {model.metrics.n} vinos · error medio ±{model.metrics.mae.toFixed(2)} pts · tipo {(model.metrics.acc * 100).toFixed(1)}% de acierto
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
