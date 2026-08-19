import { createIcons, icons } from 'lucide';

export function refreshIcons() {
  createIcons({ icons, attrs: { 'stroke-width': 1.8 } });
}

export function icon(name, size = 18) {
  return `<i data-lucide="${name}" width="${size}" height="${size}"></i>`;
}
