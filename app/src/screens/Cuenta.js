import { Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Button, Card, Container, IMG, Kicker, P, TabHeader } from '../components';
import { confirm } from '../dialogs';
import { TabScroll } from '../mobile-ui';
import { useSession } from '../session';
import { C, F } from '../theme';
import { useWines } from '../wines';

function Row({ label, value, first }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, minHeight: 52, borderTopWidth: first ? 0 : 1, borderTopColor: C.line }}>
      <Text style={{ fontFamily: F.bodyMd, fontSize: 14, color: C.muted }}>{label}</Text>
      <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.bodySb, fontSize: 15, color: C.ink }}>{value}</Text>
    </View>
  );
}

// Pestaña Cuenta (celular): datos de la sesión y "Cerrar sesión" (en web está en la barra del dashboard)
export default function Cuenta() {
  const { user, signOut } = useSession();
  const { history, best } = useWines();

  const onSignOut = async () => {
    if (await confirm({ title: 'Cerrar sesión', message: '¿Quieres cerrar tu sesión en este dispositivo?', ok: 'Cerrar sesión' })) signOut();
  };

  return (
    <TabScroll header={<TabHeader source={IMG.vineyardGold} kicker="Cuenta" title={user.name} />}>
      <Container style={{ marginTop: -20, gap: 24 }}>
        <Card style={{ padding: 20 }}>
          <Kicker>TUS DATOS</Kicker>
          <Row first label="Correo" value={user.email} />
          <Row label="Vinos guardados" value={String(history.length)} />
          <Row label="Mejor calificación" value={best ? best.quality.toFixed(1) : '—'} />
        </Card>
        <Card style={{ padding: 20 }}>
          <Kicker>ACERCA DE</Kicker>
          <P size={14} color={C.muted} style={{ marginBottom: 8 }}>Tu cuenta y tus vinos se guardan sólo en este dispositivo.</P>
          <Row label="Versión" value={Constants.expoConfig?.version ?? '—'} />
        </Card>
        <Button kind="outline" tone="wine" icon="logout" label="Cerrar sesión" onPress={onSignOut} />
      </Container>
    </TabScroll>
  );
}
