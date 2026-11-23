import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { Button, Container, Faded, H, Icon, IMG, Logo, NavBar, P, TextLink } from '../components';
import model from '../model.json';
import { CountUp, InView, Reveal } from '../motion';
import { C, F, R, web } from '../theme';
import Demo from './Demo';

// Página de inicio inspirada en apple.com: secciones a todo lo ancho, titulares centrados y mosaicos 2×2.
// Cada sección aparece al hacer scroll (máx. 1–2 animaciones por vista; se desactivan con "reducir movimiento").

const NAV_H = 72;

// Fuera del componente para que no se vuelvan a montar (y parpadeen las fotos) en cada render
function Section({ i, seen, onY, children }) {
  return (
    <View onLayout={e => onY(i, e.nativeEvent.layout.y)}>
      <InView.Provider value={seen.has(i)}>{children}</InView.Provider>
    </View>
  );
}

function Tile({ wide, bg, img, title, titleColor, text, textColor, children }) {
  return (
    <Faded source={img} color={bg} opacity={img ? 0.86 : 1} style={{ flexBasis: wide ? '48%' : '100%', flexGrow: 1, borderRadius: R.lg, padding: wide ? 48 : 28, minHeight: wide ? 420 : 300, alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ alignItems: 'center' }}>
        <H size={wide ? 44 : 34} color={titleColor} style={{ textAlign: 'center' }}>{title}</H>
        <P size={17} color={textColor} style={{ textAlign: 'center', marginTop: 8, maxWidth: 380 }}>{text}</P>
      </View>
      {children}
    </Faded>
  );
}

const Chip = ({ label, bg, fg }) => (
  <View style={{ backgroundColor: bg, borderRadius: R.pill, paddingHorizontal: 16, paddingVertical: 8 }}>
    <Text style={{ fontFamily: F.bodySb, color: fg, fontSize: 14 }}>{label}</Text>
  </View>
);

const FAQ = [
  ['¿Qué necesito para usarla?', 'Un análisis químico básico de laboratorio con 11 mediciones: acidez fija y volátil, ácido cítrico, azúcar residual, cloruros, SO₂ libre y total, densidad, pH, sulfatos y alcohol. Cualquier laboratorio enológico las entrega.'],
  ['¿Qué tan precisa es?', `En vinos que el modelo nunca vio, la calificación se equivoca en promedio ±${model.metrics.mae.toFixed(2)} puntos, e identifica si es tinto o blanco con ${(model.metrics.acc * 100).toFixed(1)}% de acierto.`],
  ['¿Qué gano como productor?', 'Por cada vino recibes qué variables ajustar, cuántos puntos podría subir la calidad y qué procesos del viñedo y la bodega aplicar, además de un reporte PDF para compartir con tu equipo.'],
  ['¿Sustituye a un enólogo o a una cata?', 'No. Es una estimación estadística que te ayuda a priorizar; la decisión final siempre es de tu enólogo y de la cata.'],
  ['¿Dónde se guardan mis vinos?', 'Por ahora tus vinos guardados se quedan en tu propio dispositivo.'],
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: C.line }}>
      <Pressable onPress={() => setOpen(o => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }}
        style={({ hovered }) => ({ flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 64, paddingVertical: 12, cursor: web ? 'pointer' : undefined, opacity: hovered ? 0.8 : 1 })}>
        <Text style={{ flex: 1, fontFamily: F.bodySb, fontSize: 18, color: C.ink }}>{q}</Text>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}><Icon name="down" color={C.wine} /></View>
      </Pressable>
      {open && <P size={16} color={C.muted} style={{ paddingBottom: 20, maxWidth: 760 }}>{a}</P>}
    </View>
  );
}

export default function Landing({ go }) {
  const { width, height } = useWindowDimensions();
  const wide = width >= 900;
  const scroll = useRef(null);
  const ys = useRef({});
  const scrollY = useRef(0);
  const [seen, setSeen] = useState(() => new Set([0]));

  // Marca como vistas las secciones cuya parte superior ya entró al 85% de la pantalla
  const check = useCallback(y => {
    scrollY.current = y;
    const newly = Object.entries(ys.current).filter(([, top]) => top < y + height * 0.85).map(([i]) => +i);
    setSeen(s => (newly.every(i => s.has(i)) ? s : new Set([...s, ...newly])));
  }, [height]);
  const onY = useCallback((i, y) => { ys.current[i] = y; check(scrollY.current); }, [check]);
  const goTo = i => scroll.current?.scrollTo({ y: Math.max(0, (ys.current[i] ?? 0) - NAV_H), animated: true });

  return (
    <ScrollView ref={scroll} stickyHeaderIndices={[0]} style={{ backgroundColor: C.white }}
      onScroll={e => check(e.nativeEvent.contentOffset.y)} scrollEventThrottle={32}>
      <NavBar onLogo={() => scroll.current?.scrollTo({ y: 0, animated: true })}>
        {wide && <TextLink label="Pruébalo" color={C.white} size={14} onPress={() => goTo(1)} />}
        {wide && <TextLink label="Cómo funciona" color={C.white} size={14} onPress={() => goTo(5)} />}
        {wide && <TextLink label="Preguntas" color={C.white} size={14} onPress={() => goTo(7)} />}
        <Button small kind="outline" tone="white" label="Sign in" onPress={() => go('signin')} />
        <Button small tone="sand" label="Sign up" onPress={() => go('signup')} />
      </NavBar>

      {/* 0 · Hero */}
      <Section seen={seen} onY={onY} i={0}>
        <Faded source={IMG.vineyardGold} color={C.ink} opacity={0.8} style={{ paddingTop: wide ? 96 : 64, paddingBottom: wide ? 80 : 56, minHeight: wide ? height - NAV_H : undefined, justifyContent: 'center' }}>
          <Container style={{ alignItems: 'center' }}>
            <Reveal><Logo variant="ink" width={Math.min(wide ? 560 : 340, width - 40)} /></Reveal>
            <Reveal delay={150} style={{ alignItems: 'center' }}>
              <H size={wide ? 64 : 40} color={C.white} style={{ textAlign: 'center', marginTop: 40 }}>Conoce tu vino antes de descorcharlo.</H>
              <P size={wide ? 22 : 18} color={C.sand} style={{ textAlign: 'center', marginTop: 16, maxWidth: 640 }}>
                Calidad, tipo, perfil de sabor y cómo mejorarlo, a partir del análisis químico de laboratorio.
              </P>
              <View style={{ flexDirection: 'row', gap: 20, marginTop: 32, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                <Button tone="sand" label="Empezar" onPress={() => go('signup')} />
                <TextLink label="Pruébalo sin registrarte" color={C.sand} onPress={() => goTo(1)} />
              </View>
            </Reveal>
            <Pressable onPress={() => goTo(1)} accessibilityRole="button" accessibilityLabel="Ir a la demo"
              style={{ marginTop: wide ? 56 : 40, alignItems: 'center', minHeight: 44, cursor: web ? 'pointer' : undefined }}>
              <Text style={{ fontFamily: F.bodyMd, color: C.sage, fontSize: 13, letterSpacing: 1 }}>DESCUBRE MÁS</Text>
              <Icon name="down" color={C.sage} />
            </Pressable>
          </Container>
        </Faded>
      </Section>

      {/* 1 · Demo interactiva */}
      <Section seen={seen} onY={onY} i={1}><Demo go={go} /></Section>

      {/* 2 · Calidad */}
      <Section seen={seen} onY={onY} i={2}>
        <Faded source={IMG.barrels} color={C.wine} opacity={0.86} style={{ paddingVertical: wide ? 96 : 64 }}>
          <Container style={{ flexDirection: wide ? 'row' : 'column', alignItems: 'center', gap: 40 }}>
            <Reveal style={{ flex: wide ? 1 : undefined, alignItems: wide ? 'flex-start' : 'center' }}>
              <H size={wide ? 56 : 38} color={C.white} style={{ textAlign: wide ? 'left' : 'center' }}>Calidad.{'\n'}Predicha.</H>
              <P color="#f3e7ea" style={{ marginTop: 16, maxWidth: 460, textAlign: wide ? 'left' : 'center' }}>
                Una calificación del 0 al 10 calculada con 11 mediciones, y en qué lugar queda frente a {model.metrics.n.toLocaleString('es-MX')} vinos reales.
              </P>
              <TextLink label="Probar ahora" color={C.sand} onPress={() => goTo(1)} />
            </Reveal>
            <Reveal delay={200} style={{ flex: wide ? 1 : undefined, alignItems: 'center' }}>
              <CountUp to={7.4} decimals={1} style={{ fontFamily: F.display, fontSize: wide ? 180 : 120, lineHeight: wide ? 190 : 130, color: C.sand }} />
              <Text style={{ fontFamily: F.displayMd, fontSize: 22, color: C.white, letterSpacing: 4 }}>/ 10 · PREMIUM</Text>
            </Reveal>
          </Container>
        </Faded>
      </Section>

      {/* 3 · Mosaicos */}
      <Section seen={seen} onY={onY} i={3}>
        <Reveal style={{ padding: 12, gap: 12, flexDirection: 'row', flexWrap: 'wrap', backgroundColor: C.white }}>
          <Tile wide={wide} bg={C.olive} title="Tinto o blanco." titleColor={C.white} textColor="#eef0e6" text="El modelo identifica el tipo de vino sólo con su química.">
            <CountUp to={model.metrics.acc * 100} decimals={1} suffix="%" style={{ fontFamily: F.display, fontSize: 96, color: C.sand, marginTop: 24 }} />
            <Text style={{ fontFamily: F.bodyMd, color: C.white, fontSize: 15 }}>de acierto en vinos nunca vistos</Text>
          </Tile>
          <Tile wide={wide} bg={C.sage} title="Perfil de sabor." titleColor={C.wine} textColor={C.ink} text="Dulzor, acidez y cuerpo deducidos con reglas enológicas.">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 24 }}>
              <Chip label="Seco" bg={C.wine} fg={C.white} />
              <Chip label="Acidez media" bg={C.white} fg={C.ink} />
              <Chip label="Cuerpo robusto" bg={C.olive} fg={C.white} />
              <Chip label="Frescura cítrica" bg={C.ink} fg={C.sand} />
            </View>
          </Tile>
          <Tile wide={wide} bg={C.cream} img={IMG.bottles} title="Maridaje." titleColor={C.ink} textColor={C.muted} text="Sugerencias según el tipo, el cuerpo y el dulzor de cada vino.">
            <View style={{ gap: 8, marginTop: 24, alignItems: 'center' }}>
              {['Carnes rojas y quesos curados', 'Pescados y mariscos', 'Postres y quesos azules'].map(t => (
                <Text key={t} style={{ fontFamily: F.bodyMd, fontSize: 16, color: C.wine }}>{t}</Text>
              ))}
            </View>
          </Tile>
          <Tile wide={wide} bg={C.sand} title="Reportes en PDF." titleColor={C.ink} textColor={C.ink} text="Descarga cada predicción y guías de química, cata y producción.">
            <View style={{ marginTop: 24, backgroundColor: C.white, borderRadius: R.md, padding: 20, width: 200, gap: 8 }}>
              <View style={{ height: 10, width: '60%', backgroundColor: C.wine, borderRadius: 4 }} />
              <View style={{ height: 8, width: '90%', backgroundColor: C.line, borderRadius: 4 }} />
              <View style={{ height: 8, width: '75%', backgroundColor: C.line, borderRadius: 4 }} />
              <Text style={{ fontFamily: F.display, fontSize: 36, color: C.wine }}>7.4</Text>
            </View>
          </Tile>
        </Reveal>
      </Section>

      {/* 4 · Para el productor */}
      <Section seen={seen} onY={onY} i={4}>
        <Faded source={IMG.vineyardAerial} color={C.olive} opacity={0.88} style={{ paddingVertical: wide ? 96 : 64 }}>
          <Container style={{ flexDirection: wide ? 'row' : 'column', gap: 40, alignItems: 'center' }}>
            <Reveal style={{ flex: wide ? 1 : undefined, alignItems: wide ? 'flex-start' : 'center' }}>
              <Text style={{ fontFamily: F.bodySb, fontSize: 13, letterSpacing: 1.5, color: C.sand }}>PARA EL PRODUCTOR</Text>
              <H size={wide ? 52 : 36} color={C.white} style={{ marginTop: 8, textAlign: wide ? 'left' : 'center' }}>Mejora tu vino,{'\n'}del viñedo a la botella.</H>
              <P color="#eef0e6" style={{ marginTop: 16, maxWidth: 480, textAlign: wide ? 'left' : 'center' }}>
                Cada predicción te dice qué variable ajustar, cuánto podría subir la calidad y con qué procesos lograrlo. Simula los cambios antes de hacerlos.
              </P>
              <TextLink label="Ver mis recomendaciones" color={C.sand} onPress={() => go('signup')} />
            </Reveal>
            <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%', gap: 12 }}>
              {[
                ['Subir alcohol', '+0.45', 'Cosechar con mayor madurez y aclarear racimos'],
                ['Bajar acidez volátil', '+0.42', 'Uva sana, higiene y barricas siempre llenas'],
                ['Subir sulfatos', '+0.14', 'Ajustar metabisulfito dentro del límite legal'],
              ].map(([t, g, d], k) => (
                <Reveal key={t} delay={120 * (k + 1)}>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: R.md, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 28, color: C.olive, minWidth: 70 }}>{g}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: F.bodySb, fontSize: 16, color: C.ink }}>{t}</Text>
                      <Text style={{ fontFamily: F.body, fontSize: 14, color: C.muted, marginTop: 2 }}>{d}</Text>
                    </View>
                  </View>
                </Reveal>
              ))}
            </View>
          </Container>
        </Faded>
      </Section>

      {/* 5 · Cómo funciona */}
      <Section seen={seen} onY={onY} i={5}>
        <View style={{ backgroundColor: C.white, paddingVertical: wide ? 96 : 64 }}>
          <Container style={{ alignItems: 'center' }}>
            <Reveal><H size={wide ? 52 : 36} style={{ textAlign: 'center' }}>Cómo funciona.</H></Reveal>
            <View style={{ flexDirection: wide ? 'row' : 'column', gap: 40, marginTop: 48, width: '100%' }}>
              {[
                ['01', 'Crea tu cuenta', 'Regístrate en segundos con tu correo.'],
                ['02', 'Captura el análisis', 'Ingresa las 11 mediciones del laboratorio y mira la calificación en tiempo real.'],
                ['03', 'Mejora y comparte', 'Simula los ajustes, guarda tus vinos y descarga el reporte en PDF.'],
              ].map(([n, t, d], k) => (
                <Reveal key={n} delay={120 * k} style={{ flex: 1, alignItems: wide ? 'flex-start' : 'center' }}>
                  <Text style={{ fontFamily: F.display, fontSize: 48, color: C.mauve }}>{n}</Text>
                  <Text style={{ fontFamily: F.displayMd, fontSize: 24, color: C.ink, marginTop: 4 }}>{t}</Text>
                  <P size={16} color={C.muted} style={{ marginTop: 6, textAlign: wide ? 'left' : 'center' }}>{d}</P>
                </Reveal>
              ))}
            </View>
          </Container>
        </View>
      </Section>

      {/* 6 · Cifras */}
      <Section seen={seen} onY={onY} i={6}>
        <Faded source={IMG.bottles} color={C.ink} opacity={0.86} style={{ paddingVertical: 72 }}>
          <Container style={{ flexDirection: wide ? 'row' : 'column', justifyContent: 'space-around', gap: 32 }}>
            {[
              [<CountUp key="n" to={model.metrics.n} style={st.stat} />, 'vinos analizados'],
              [<CountUp key="e" to={model.metrics.mae} decimals={2} prefix="±" style={st.stat} />, 'puntos de error medio'],
              [<CountUp key="v" to={11} style={st.stat} />, 'variables químicas'],
            ].map(([v, l]) => (
              <View key={l} style={{ alignItems: 'center' }}>
                {v}
                <Text style={{ fontFamily: F.bodyMd, fontSize: 15, color: C.sage }}>{l}</Text>
              </View>
            ))}
          </Container>
        </Faded>
      </Section>

      {/* 7 · Preguntas frecuentes */}
      <Section seen={seen} onY={onY} i={7}>
        <View style={{ backgroundColor: C.cream, paddingVertical: wide ? 96 : 64 }}>
          <Container style={{ maxWidth: 860 }}>
            <Reveal><H size={wide ? 52 : 36} style={{ textAlign: 'center', marginBottom: 32 }}>Preguntas frecuentes.</H></Reveal>
            <Reveal delay={150}>{FAQ.map(([q, a]) => <FaqItem key={q} q={q} a={a} />)}</Reveal>
          </Container>
        </View>
      </Section>

      {/* 8 · CTA final */}
      <Section seen={seen} onY={onY} i={8}>
        <Faded source={IMG.vineyardSun} color={C.sage} opacity={0.84} style={{ paddingVertical: wide ? 96 : 64 }}>
          <Container style={{ alignItems: 'center' }}>
            <Reveal style={{ alignItems: 'center' }}>
              <Logo variant="sage" width={Math.min(420, width - 40)} />
              <H size={wide ? 44 : 32} color={C.ink} style={{ textAlign: 'center', marginTop: 32 }}>Tu próxima cosecha, mejor entendida.</H>
              <View style={{ flexDirection: 'row', gap: 20, marginTop: 28, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                <Button tone="wine" label="Crear cuenta" onPress={() => go('signup')} />
                <TextLink label="Probar la demo" color={C.wine} onPress={() => goTo(1)} />
              </View>
            </Reveal>
          </Container>
        </Faded>
      </Section>

      <View style={{ backgroundColor: C.ink, paddingVertical: 32 }}>
        <Container style={{ flexDirection: wide ? 'row' : 'column', alignItems: 'center', gap: 24 }}>
          <Logo variant="wine" width={140} />
          <Text style={{ flex: wide ? 1 : undefined, fontFamily: F.body, fontSize: 13, color: C.sage, lineHeight: 20, textAlign: wide ? 'left' : 'center' }}>
            © {new Date().getFullYear()} Los Tres García Vineyard. Las predicciones son estimaciones estadísticas y no sustituyen una cata profesional.
          </Text>
        </Container>
      </View>
    </ScrollView>
  );
}

const st = { stat: { fontFamily: F.display, fontSize: 56, color: C.sand } };
