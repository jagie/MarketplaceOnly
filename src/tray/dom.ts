type Child = Node | string;

/**
 * Builds an element from plain values. The tray is built this way rather
 * than with innerHTML, so no string is ever parsed as HTML (which store
 * reviewers rightly flag) and text is always inserted as text.
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | boolean> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value === true) element.setAttribute(name, '');
    else if (value !== false) element.setAttribute(name, value);
  }
  element.append(...children);
  return element;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** A decorative icon: hidden from screen readers, never focusable. */
export function svgIcon(viewBox: string, shapes: Array<[string, Record<string, string>]>, size?: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  if (size) {
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
  }
  for (const [tag, attributes] of shapes) {
    const shape = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attributes)) shape.setAttribute(name, value);
    svg.append(shape);
  }
  return svg;
}
