import { NativeTabs } from 'expo-router/native-tabs';
import { useSession } from '@/session';
import { C, F } from '@/theme';
import { WinesProvider } from '@/wines';

// Pestañas del celular (la web no las monta: ver el guard en src/app/_layout.js).
// Atrás recorre las pestañas visitadas y luego sale; en Android la barra pone sola el área segura de abajo.
export default function AppTabs() {
  const { user } = useSession();
  // Al cerrar sesión el guard quita estas pantallas; mientras tanto no se pinta nada que lea `user`
  if (!user) return null;
  return (
    <WinesProvider email={user.email}>
      <NativeTabs
        backBehavior="history"
        labelVisibilityMode="labeled"
        backgroundColor={C.ink}
        tintColor={C.sand}
        indicatorColor={C.sand}
        rippleColor="rgba(211,190,145,0.24)"
        iconColor={{ default: C.sage, selected: C.ink }}
        labelStyle={{
          default: { fontFamily: F.bodyMd, fontSize: 12, color: C.sage },
          selected: { fontFamily: F.bodySb, fontSize: 12, color: C.sand },
        }}
      >
        <NativeTabs.Trigger name="analizar">
          <NativeTabs.Trigger.Icon sf="flask" md="science" />
          <NativeTabs.Trigger.Label>Analizar</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="mis-vinos">
          <NativeTabs.Trigger.Icon sf="wineglass" md="wine_bar" />
          <NativeTabs.Trigger.Label>Mis vinos</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="guias">
          <NativeTabs.Trigger.Icon sf="doc.text" md="description" />
          <NativeTabs.Trigger.Label>Guías</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="cuenta">
          <NativeTabs.Trigger.Icon sf="person.crop.circle" md="person" />
          <NativeTabs.Trigger.Label>Cuenta</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </WinesProvider>
  );
}
