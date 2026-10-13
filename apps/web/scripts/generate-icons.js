// Simple script to generate placeholder PWA icons
// Run with: node generate-icons.js
import { writeFileSync } from 'fs';

// Generate a minimal PNG of the specified size with a solid color
function generatePlaceholderIcon(size, filename) {
  // Simple 1-pixel PNG, scaled up by browsers (not ideal but valid)
  // In production, replace with actual branded icons
  const simpleBluePixel = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  console.log(
    `Generated ${filename} (${size}x${size} - placeholder, replace with real icons)`
  );
  writeFileSync(filename, simpleBluePixel);
}

generatePlaceholderIcon(192, 'icon-192.png');
generatePlaceholderIcon(512, 'icon-512.png');
generatePlaceholderIcon(512, 'icon-512-maskable.png');

console.log(
  '\nNote: These are minimal placeholders. For production, generate proper icons at:'
);
console.log('- icon-192.png: 192x192px');
console.log('- icon-512.png: 512x512px');
console.log('- icon-512-maskable.png: 512x512px with safe zone for masking');
