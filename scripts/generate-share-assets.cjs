// Gera assets de compartilhamento (Open Graph) e ícones de PWA
// a partir do logo existente (public/assets/logo512.png), sem
// depender do avatar-boi.svg original (removido do repositório).
//
// Saidas:
//  - public/assets/og-image.png      (1200x630, para og:image / twitter:image)
//  - public/assets/logo192-maskable.png (192x192, safe-zone para ícone adaptativo Android)
//  - public/assets/logo512-maskable.png (512x512, idem)
//  - public/favicon-32.png
//  - public/favicon-16.png
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, 'public', 'assets');

const BRAND_FROM = '#1a73e8';
const BRAND_TO = '#0f3d80';

async function generateOgImage(logo) {
  const width = 1200;
  const height = 630;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fundo em degradê (mesma paleta do design system do app)
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, BRAND_FROM);
  gradient.addColorStop(1, BRAND_TO);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Logo circular com fundo branco, a esquerda
  const logoSize = 260;
  const logoX = 96;
  const logoY = height / 2 - logoSize / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 14, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(logoX, logoY, logoSize, logoSize);
  ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
  ctx.restore();

  // Textos
  const textX = logoX + logoSize + 64;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'alphabetic';

  ctx.font = 'bold 72px "Segoe UI", Arial, sans-serif';
  ctx.fillText('Fim de Boi Fujão', textX, height / 2 - 12);

  ctx.font = '600 34px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.fillText('Monitoramento inteligente da sua fazenda', textX, height / 2 + 46);

  // Badge inferior
  ctx.font = '600 24px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('Gado  •  Pastos  •  Geofencing  •  Rastreabilidade', textX, height / 2 + 100);

  const outputPath = path.join(ASSETS, 'og-image.png');
  fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
  console.log(`wrote ${outputPath}`);
}

async function generateMaskableIcon(logo, size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Fundo solido (sem cantos arredondados - o SO aplica a mascara dele)
  ctx.fillStyle = BRAND_FROM;
  ctx.fillRect(0, 0, size, size);

  // Logo ocupando ~65% da area (dentro da safe-zone de icones adaptativos)
  const logoSize = Math.round(size * 0.65);
  const offset = (size - logoSize) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, logoSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(offset, offset, logoSize, logoSize);
  ctx.drawImage(logo, offset, offset, logoSize, logoSize);
  ctx.restore();

  const outputPath = path.join(ASSETS, `logo${size}-maskable.png`);
  fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
  console.log(`wrote ${outputPath}`);
}

async function generateFavicon(logo, size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(logo, 0, 0, size, size);

  const outputPath = path.join(ROOT, 'public', `favicon-${size}.png`);
  fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
  console.log(`wrote ${outputPath}`);
}

async function main() {
  const logo = await loadImage(path.join(ASSETS, 'logo512.png'));

  await generateOgImage(logo);
  await generateMaskableIcon(logo, 192);
  await generateMaskableIcon(logo, 512);
  await generateFavicon(logo, 32);
  await generateFavicon(logo, 16);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
