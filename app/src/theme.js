import { Platform } from 'react-native';

// Paleta exacta del BrandBook "Los Tres García"
export const C = {
  sage: '#bec7a8',
  olive: '#546548',
  sand: '#d3be91',
  mauve: '#8a4c5f',
  wine: '#5e192c',
  ink: '#20151d',
  white: '#ffffff',
  cream: '#f7f4ee', // fondo alterno de secciones (estilo apple.com)
  line: '#e4ddd2',
  muted: '#5c4b53', // texto secundario sobre claro, contraste ≥ 7:1
};

// Oswald = tipografía del logo; Montserrat = texto (recomendación de ui-ux-pro-max para marcas premium)
export const F = {
  display: 'Oswald_700Bold',
  displayMd: 'Oswald_500Medium',
  body: 'Montserrat_400Regular',
  bodyMd: 'Montserrat_500Medium',
  bodySb: 'Montserrat_600SemiBold',
};

export const R = { sm: 10, md: 18, lg: 28, pill: 999 };
export const MAXW = 1120;
export const web = Platform.OS === 'web';

// Web: foco visible para teclado, transiciones suaves y respeto a prefers-reduced-motion
export function injectWebCss() {
  if (!web || document.getElementById('ltg-css')) return;
  const el = document.createElement('style');
  el.id = 'ltg-css';
  el.textContent = `
    html,body{background:${C.ink};-webkit-font-smoothing:antialiased}
    [role=button],[role=link],input{outline:none}
    [role=button]:focus-visible,[role=link]:focus-visible,input:focus-visible{outline:3px solid ${C.sand};outline-offset:3px}
    @media (prefers-reduced-motion:no-preference){
      [role=button],[role=link],input{transition:background-color .2s ease,color .2s ease,border-color .2s ease,opacity .2s ease}
    }`;
  document.head.appendChild(el);
}
