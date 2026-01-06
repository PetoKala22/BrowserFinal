// skyStars.ts

export const createStarField = (width: number, height: number, density = 0.0006) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#FFFFFF';

  const count = Math.floor(width * height * density);
  for (let i = 0; i < count; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 1.5; // Tiny stars
    // Bias towards fainter stars for realism
    const alpha = Math.pow(Math.random(), 3) * 0.8 + 0.2; 
    
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
};