import { Pressable, ScrollView, Text, View } from 'react-native';
import { s } from '../ui';

// Página de inicio: qué es la app y para qué sirve. Estilos mínimos: el front final lo pone el equipo.
export default function Landing({ go }) {
  return (
    <ScrollView contentContainerStyle={s.page}>
      <View style={s.nav}>
        <Text style={s.h1}>Predictor de Vinos</Text>
        <View style={s.row}>
          <Pressable style={s.btnAlt} onPress={() => go('signin')}><Text>Sign in</Text></Pressable>
          <Pressable style={s.btn} onPress={() => go('signup')}><Text style={s.btnText}>Sign up</Text></Pressable>
        </View>
      </View>

      <Text style={s.h2}>¿Qué es?</Text>
      <Text>Una herramienta que estima la calidad de un vino a partir de su análisis químico de laboratorio
        (acidez, azúcar, sulfitos, alcohol, etc.), entrenada con 6,497 vinos tintos y blancos reales.</Text>

      <Text style={s.h2}>¿Para qué sirve?</Text>
      <Text>• Predecir la calidad (0–10) y la gama del vino.</Text>
      <Text>• Identificar si es tinto o blanco.</Text>
      <Text>• Estimar su perfil de sabor: dulzor, acidez, cuerpo y maridaje recomendado.</Text>
      <Text>• Descargar un reporte PDF de cada predicción y guías informativas.</Text>

      <Text style={s.h2}>¿Cómo funciona?</Text>
      <Text>1. Crea tu cuenta o inicia sesión.  2. Captura los valores del análisis o carga un ejemplo.
        3. Presiona Predecir y descarga el reporte.</Text>

      <Pressable style={[s.btn, { alignSelf: 'flex-start', marginTop: 24 }]} onPress={() => go('signup')}>
        <Text style={s.btnText}>Empezar</Text>
      </Pressable>
    </ScrollView>
  );
}
