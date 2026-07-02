const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

async function main() {
  const svgPath = path.join(__dirname, '..', 'public', 'assets', 'avatar-boi.svg');
  const svg = fs.readFileSync(svgPath, 'utf8');
  const dataUrl = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');

  for (const size of [192, 512]) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const image = await loadImage(dataUrl);
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(image, 0, 0, size, size);

    const outputPath = path.join(__dirname, '..', 'public', 'assets', `logo${size}.png`);
    fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
    console.log(`wrote ${outputPath}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});