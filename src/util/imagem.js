// Prepara uma imagem anexada: reduz pra no máximo 800px no lado maior, sem recortar
// (a proporção original é mantida; o enquadramento acontece só na exibição).
// Formato: WebP. Se o navegador não gerar WebP (ex.: Safari), usa PNG quando houver
// transparência e JPEG quando não houver.
export const LADO_MAXIMO = 800;
const QUALIDADE = 0.85;

async function carregar(arquivo) {
  try {
    return await createImageBitmap(arquivo);
  } catch {
    // SVG e alguns formatos não passam pelo createImageBitmap
    const url = URL.createObjectURL(arquivo);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

const gerarBlob = (canvas, tipo, qualidade) =>
  new Promise((r) => canvas.toBlob(r, tipo, qualidade));

function temTransparencia(ctx, w, h) {
  const dados = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < dados.length; i += 4) if (dados[i] < 255) return true;
  return false;
}

export async function prepararImagem(arquivo) {
  if (!arquivo?.type?.startsWith('image/')) throw new Error('O arquivo escolhido não é uma imagem.');
  const fonte = await carregar(arquivo);
  const larguraOrig = fonte.width || fonte.naturalWidth || LADO_MAXIMO;
  const alturaOrig = fonte.height || fonte.naturalHeight || LADO_MAXIMO;
  const escala = Math.min(1, LADO_MAXIMO / Math.max(larguraOrig, alturaOrig));
  const largura = Math.max(1, Math.round(larguraOrig * escala));
  const altura = Math.max(1, Math.round(alturaOrig * escala));

  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(fonte, 0, 0, largura, altura);
  fonte.close?.();

  let blob = await gerarBlob(canvas, 'image/webp', QUALIDADE);
  if (!blob || blob.type !== 'image/webp') {
    blob = temTransparencia(ctx, largura, altura)
      ? await gerarBlob(canvas, 'image/png')
      : await gerarBlob(canvas, 'image/jpeg', QUALIDADE);
  }
  return { blob, largura, altura };
}
