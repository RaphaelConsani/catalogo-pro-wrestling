// iPhone/iPad (inclui iPad que se apresenta como Mac, com tela de toque).
export const ehIOS = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
