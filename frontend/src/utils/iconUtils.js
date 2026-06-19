import * as Icons from 'lucide-react';

const iconCache = {};

/**
 * Convert a kebab-case icon name to PascalCase (e.g., "arrow-right" -> "ArrowRight").
 */
export function toPascalCase(str) {
  return str.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}

/**
 * Resolve a lucide-react icon component by its kebab-case name.
 * Returns the fallback icon if the name doesn't match any known icon.
 */
export function getIcon(iconName, fallback = Icons.Wrench) {
  if (!iconCache[iconName]) {
    const pascalName = toPascalCase(iconName);
    const Icon = Icons[pascalName];
    iconCache[iconName] = Icon || fallback;
  }
  return iconCache[iconName];
}
