import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// Só os módulos usados entram no build (o ECharts completo é bem pesado).
echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

// Cores lidas do tema na hora de desenhar (acompanham a cor de destaque escolhida).
export function coresTema() {
  const css = getComputedStyle(document.documentElement);
  const v = (n) => css.getPropertyValue(n).trim();
  return {
    neon: `rgb(${v('--neon-rgb')})`,
    neonFraco: `rgb(${v('--neon-rgb')} / 0.25)`,
    ouro: v('--ouro'),
    texto: v('--texto'),
    textoSuave: v('--texto-suave'),
    textoFraco: v('--texto-fraco'),
    borda: v('--borda'),
    superficie: v('--superficie-2'),
    fonte: 'Barlow, system-ui, sans-serif',
  };
}

export function baseGrafico(c) {
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: c.fonte, color: c.textoSuave },
    grid: { left: 8, right: 8, top: 16, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: c.superficie,
      borderColor: c.borda,
      textStyle: { color: c.texto, fontFamily: c.fonte },
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(255,255,255,0.04)' } },
    },
  };
}

export const eixoCategorias = (c, dados) => ({
  type: 'category',
  data: dados,
  axisLine: { lineStyle: { color: c.borda } },
  axisTick: { show: false },
  axisLabel: { color: c.textoSuave },
});

export const eixoValores = (c, extra = {}) => ({
  type: 'value',
  splitLine: { lineStyle: { color: c.borda, type: 'dashed' } },
  axisLabel: { color: c.textoFraco },
  ...extra,
});

// Cria o gráfico e cuida do redimensionamento; libera a memória quando a tela sai.
export function montarGrafico(el, opcoes) {
  const grafico = echarts.init(el, null, { renderer: 'canvas' });
  grafico.setOption(opcoes);
  const aoRedimensionar = () => {
    if (!el.isConnected) {
      window.removeEventListener('resize', aoRedimensionar);
      grafico.dispose();
      return;
    }
    grafico.resize();
  };
  window.addEventListener('resize', aoRedimensionar);
  return grafico;
}
