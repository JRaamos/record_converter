const paths = {
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></>,
  folder: <path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>,
  arrow: <><path d="M4 12h16M14 6l6 6-6 6"/></>,
  upload: <><path d="M12 16V3M7 8l5-5 5 5M4 15v5h16v-5"/></>,
  download: <><path d="M12 3v13M7 11l5 5 5-5M4 16v5h16v-5"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  shield: <><path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z"/><path d="m8 12 3 3 5-6"/></>,
  table: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></>,
  edit: <><path d="m16 3 5 5L9 20l-6 1 1-6Z"/><path d="m13 6 5 5"/></>,
  merge: <><path d="m7 3 5 5 5-5M12 8v13M7 16l5 5 5-5"/></>,
  alert: <><path d="m12 3 10 18H2Z"/><path d="M12 9v5M12 17h.01"/></>,
};
export default function Icon({ name = 'file', size = 18, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.file}</svg>;
}
