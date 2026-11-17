import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Caminhos relativos ("./"): o app funciona em qualquer subpasta,
// como https://<usuário>.github.io/catalogo-pro-wrestling/
//
// No build, gera o sw.js (service worker) com a lista de TODOS os arquivos do app
// (inclusive gráficos e Excel, que carregam sob demanda), pra ele abrir offline.
// A versão do cache muda sempre que algum arquivo muda.
function serviceWorker() {
  let pastaSaida;
  return {
    name: 'service-worker',
    apply: 'build',
    configResolved(c) {
      pastaSaida = join(c.root, c.build.outDir);
    },
    generateBundle(_, bundle) {
      // Arquivos do bundle + os da pasta public (ícones, manifesto).
      const doBundle = Object.keys(bundle);
      const pub = [];
      const varrer = (dir) => {
        for (const nome of readdirSync(dir)) {
          const caminho = join(dir, nome);
          if (statSync(caminho).isDirectory()) varrer(caminho);
          else if (!nome.startsWith('.')) pub.push(relative('public', caminho).split('\\').join('/'));
        }
      };
      varrer('public');
      const arquivos = [...new Set(['./', ...doBundle.map((f) => `./${f}`), ...pub.map((f) => `./${f}`)])].sort();
      const hash = createHash('sha256');
      for (const [nome, item] of Object.entries(bundle).sort(([a], [b]) => a.localeCompare(b))) {
        hash.update(nome);
        hash.update(item.type === 'chunk' ? item.code : item.source);
      }
      for (const f of pub) hash.update(readFileSync(join('public', f)));
      const versao = hash.digest('hex').slice(0, 12);
      const modelo = readFileSync('src/sw-modelo.js', 'utf8');
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: modelo.replace('__VERSAO__', versao).replace('__ARQUIVOS__', JSON.stringify(arquivos, null, 2)),
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [serviceWorker()],
  build: {
    // Gráficos (ECharts) e Excel (SheetJS) passam de 500 kB, mas só carregam sob demanda.
    chunkSizeWarningLimit: 700,
  },
});
