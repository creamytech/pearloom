/* global React */
// Pearloom dashboard — the in-house line-icon set. No icon font, no
// CDN: a small family of 24×24, fill:none, 1.75px round-cap strokes,
// the calmer cousin of Feather the brand specifies (motifs.tsx). Each
// entry is the inner markup of an <svg>; <Icon name size/> wraps it.
(() => {
const P = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/><path d="M9.5 21v-6h5v6"/>',
  layout: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M9 9v11"/>',
  link: '<path d="M9 12h6"/><path d="M10.5 7.5H8a4.5 4.5 0 0 0 0 9h2.5"/><path d="M13.5 7.5H16a4.5 4.5 0 0 1 0 9h-2.5"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 6.1"/><path d="M17.5 14.6A5.5 5.5 0 0 1 20.5 20"/>',
  inbox: '<path d="M3 13.5 5.2 5a2 2 0 0 1 1.9-1.4h9.8A2 2 0 0 1 18.8 5L21 13.5"/><path d="M3 13.5h5l1.5 2.5h5L16 13.5h5V19a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19Z"/>',
  message: '<path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3.5V16H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/><path d="M8 9.5h8"/><path d="M8 12.5h5"/>',
  gift: '<rect x="3.5" y="9" width="17" height="4" rx="1"/><path d="M5 13v6.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V13"/><path d="M12 9v11.5"/><path d="M12 9S10.8 4.5 8.5 4.5a2 2 0 0 0 0 4.5Z"/><path d="M12 9s1.2-4.5 3.5-4.5a2 2 0 0 1 0 4.5Z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  grid: '<circle cx="7" cy="7" r="3"/><circle cx="17" cy="7" r="3"/><circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="3"/>',
  sparkles: '<path d="M12 3.5c.5 3.4 1.6 4.5 5 5-3.4.5-4.5 1.6-5 5-.5-3.4-1.6-4.5-5-5 3.4-.5 4.5-1.6 5-5Z"/><path d="M18.5 13.5c.3 1.6.8 2.1 2.4 2.4-1.6.3-2.1.8-2.4 2.4-.3-1.6-.8-2.1-2.4-2.4 1.6-.3 2.1-.8 2.4-2.4Z"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M4.5 17.5 9 13l3 2.5L15.5 11l4.5 5"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15 9-2 5-4 2 2-5Z"/>',
  bars: '<path d="M4 20V11"/><path d="M9.3 20V5"/><path d="M14.6 20v-6.5"/><path d="M20 20V8"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 1.5 6.5 1.5 6.5h-15S6 14 6 9Z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  chevron: '<polyline points="6 9 12 15 18 9"/>',
  arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  send: '<path d="M21 3 3 10.5l7 2.5 2.5 7L21 3Z"/><path d="M10 13 21 3"/>',
  play: '<path d="M7 5.5v13l11-6.5Z"/>',
  music: '<path d="M9 18V6l11-2.5v12"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="15.5" r="3"/>',
  pin: '<path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><circle cx="12" cy="15" r="1.2"/>',
  heart: '<path d="M12 20S4 14.5 4 9a4.2 4.2 0 0 1 8-1.6A4.2 4.2 0 0 1 20 9c0 5.5-8 11-8 11Z"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M21.5 12h-2.4M4.9 12H2.5M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3 5.6 5.6"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4 6.3 6.3 0 0 0 20 14.5Z"/>',
  ticket: '<path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2.5a2 2 0 0 0 0 4V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.5a2 2 0 0 0 0-4Z"/><path d="M13 5v14"/>',
  table: '<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="1.5"/><path d="M12 5.5V3M12 21v-2.5M18.5 12H21M3 12h2.5"/>',
};
function Icon({ name, size = 18, color = 'currentColor', strokeWidth = 1.75, style }) {
  return React.createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round',
    style, 'aria-hidden': true, 'data-icon': name,
    dangerouslySetInnerHTML: { __html: P[name] || '' },
  });
}
window.Icon = Icon;
window.ICON_NAMES = Object.keys(P);
})();
