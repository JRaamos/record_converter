import styled, { createGlobalStyle, keyframes } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  :root { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; color: #24352f; background: #fafbf9; font-synthesis: none; }
  * { box-sizing: border-box; }
  body { margin: 0; } button, input, select, textarea { font: inherit; }
  button { cursor: pointer; } button:disabled { cursor: not-allowed; opacity: .48; }
  button, input, select, textarea { outline-offset: 4px; }
  :focus-visible { outline: 2px solid #237d61; }
  h1,h2,h3,p { margin-top: 0; } h1 { font-size: 30px; font-weight: 650; letter-spacing: -1px; margin-bottom: 9px; }
  h2 { font-size: 19px; letter-spacing: -.35px; } h3 { font-size: 14px; }
  p { line-height: 1.6; } input,select,textarea { min-width: 0; }
  ::selection { background: #d1e9df; }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
`;
const appear = keyframes`from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); }`;
const slide = keyframes`from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); }`;
export const Layout = styled.div`display: grid; grid-template-columns: 236px minmax(0, 1fr); min-height: 100vh; @media(max-width: 900px){grid-template-columns: 190px minmax(0,1fr);} @media(max-width: 650px){display:block;}`;
export const Sidebar = styled.aside`background:#f1f4f0; border-right:1px solid #e1e6df; padding:32px 20px 20px; display:flex; flex-direction:column; gap:36px; position:sticky; top:0; height:100vh; @media(max-width:650px){position:static;height:auto;padding:18px;gap:18px;}`;
export const Brand = styled.div`display:flex; gap:12px; align-items:center; font-size:16px; font-weight:700; line-height:1.25; letter-spacing:-.4px; span small{display:block;font-size:10px;letter-spacing:1.7px;color:#7a8780;font-weight:600;margin-top:6px;text-transform:uppercase;}`;
export const BrandIcon = styled.div`width:39px;height:43px;border-radius:11px;background:#1d654f;color:#fff;display:grid;place-items:center;flex-shrink:0;`;
export const Nav = styled.nav`display:flex;flex-direction:column;gap:7px;@media(max-width:650px){flex-direction:row;}`;
export const NavButton = styled.button`border:0;text-align:left;background:${p=>p.$active?'#e1eae1':'transparent'};color:${p=>p.$active?'#185c45':'#768078'};padding:13px 12px;border-radius:7px;display:flex;align-items:center;gap:12px;font-size:13px;font-weight:600;transition:background .16s,color .16s;&:hover:not(:disabled){background:#e5ebe3;} span{display:inline-grid;place-items:center;border:1px solid ${p=>p.$active?'#b8ccbb':'#d4dcd2'};width:23px;height:23px;border-radius:50%;font-size:11px;}`;
export const LocalNote = styled.div`margin-top:auto;padding:18px 12px 0;border-top:1px solid #dce4d9;font-size:11px;color:#738076;line-height:1.6;strong{display:flex;align-items:center;gap:7px;color:#4c6558;font-size:12px;margin-bottom:6px;}@media(max-width:650px){display:none;}`;
export const Main = styled.main`min-width:0;`;
export const Topbar = styled.header`height:74px;border-bottom:1px solid #e7eae3;padding:0 38px;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#7d897f;>span:last-child{color:#47725b;display:flex;align-items:center;gap:7px;}@media(max-width:900px){padding:0 22px;}`;
export const Content = styled.div`max-width:1320px;margin:0 auto;padding:38px 38px 24px;animation:${appear} .22s ease-out;@media(max-width:900px){padding:28px 22px;} `;
export const Eyebrow = styled.div`font-size:10px;text-transform:uppercase;letter-spacing:1.8px;font-weight:700;color:#6c8172;margin-bottom:13px;`;
export const Muted = styled.p`font-size:13px;color:#778277;line-height:1.65;`;
export const Row = styled.div`display:flex;align-items:center;gap:12px;flex-wrap:wrap;`;
export const Spread = styled(Row)`justify-content:space-between;`;
export const Button = styled.button`border:1px solid ${p=>p.$primary?'#22694f':'#dce2d8'};background:${p=>p.$primary?'#22694f':'#fff'};color:${p=>p.$primary?'#fff':p.$danger?'#a1443a':'#3e5146'};border-radius:7px;padding:11px 16px;font-size:12px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:background .16s,transform .16s;&:hover:not(:disabled){background:${p=>p.$primary?'#18573f':'#f0f4ee'};transform:translateY(-1px);} &:active:not(:disabled){transform:translateY(0);}`;
export const TextButton = styled.button`padding:5px 0;border:0;background:none;color:${p=>p.$danger?'#a1443a':'#277255'};font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:6px;&:hover{text-decoration:underline;}`;
export const Dropzone = styled.section`border:1.5px dashed ${p=>p.$drag?'#277255':'#c9d5c6'};background:${p=>p.$drag?'#e9f2e8':'#f5f8f2'};padding:40px 20px;text-align:center;border-radius:10px;margin:30px 0 26px;transition:background .2s,border-color .2s;h2{font-size:18px;margin:18px 0 8px;}p{font-size:12px;color:#7a8679;margin-bottom:22px;} ${Row}{justify-content:center;}`;
export const DocumentMark = styled.div`margin:auto;width:64px;height:68px;position:relative;display:grid;place-items:center;color:#3d7758;svg{width:36px;height:36px;} &::before{content:'';position:absolute;inset:0;background:#e4eddc;border-radius:13px;transform:rotate(-8deg);z-index:0;}svg{position:relative;}`;
export const Panel = styled.section`border-top:1px solid #e4e8df;padding-top:23px;margin-top:24px;`;
export const FileList = styled.div`max-height:230px;overflow:auto;margin-top:14px;`;
export const FileRow = styled.div`display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid #eef0ea;font-size:12px;svg{color:#6a8470;flex-shrink:0;}span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;}small{font-size:10px;color:#8a9388;}button{border:0;background:none;color:#879184;padding:4px;}`;
export const Banner = styled.div`border-left:3px solid ${p=>p.$error?'#be6653':'#84a980'};background:${p=>p.$error?'#fcf1ed':'#eef4ea'};color:${p=>p.$error?'#9c4a39':'#4b6b4c'};font-size:12px;line-height:1.65;padding:12px 15px;margin:18px 0;border-radius:0 5px 5px 0;overflow-wrap:anywhere;`;
export const Footer = styled.footer`margin-top:28px;border-top:1px solid #e3e8de;padding-top:21px;display:flex;justify-content:space-between;align-items:center;gap:16px;small{font-size:11px;color:#859080;line-height:1.5;}`;
export const Stats = styled.div`display:grid;grid-template-columns:repeat(auto-fit,minmax(105px,1fr));margin:28px 0;background:#f3f6ef;border-radius:8px;padding:20px 0;>div{padding:0 22px;border-right:1px solid #dfe6da;} >div:last-child{border:0;}strong{display:block;font-size:27px;font-weight:600;letter-spacing:-.8px;}span{display:block;font-size:10px;color:#798771;margin-top:7px;}`;
export const ProgressTrack = styled.div`height:7px;background:#e5ece0;border-radius:5px;overflow:hidden;margin:20px 0 10px;div{height:100%;width:${p=>p.$percent}%;background:#32795a;transition:width .2s ease-out;}`;
export const Input = styled.input`width:100%;padding:10px 11px;background:#fff;border:1px solid #dce2d8;border-radius:6px;font-size:12px;color:#344c3d;&:disabled{background:#f2f4ee;color:#869180;}`;
export const Select = styled.select`padding:10px 11px;background:#fff;border:1px solid #dce2d8;border-radius:6px;font-size:12px;color:#425741;`;
export const Toolbar = styled(Spread)`margin:26px 0 15px;${Input}{max-width:290px;}`;
export const TableScroll = styled.div`overflow:auto;max-height:55vh;border:1px solid #e2e7dc;border-radius:8px;background:#fff;`;
export const Table = styled.table`width:100%;border-collapse:separate;border-spacing:0;text-align:left;font-size:12px;white-space:nowrap;th{position:sticky;top:0;background:#f3f6ef;padding:13px 14px;color:#72816a;font-size:10px;font-weight:600;z-index:1;border-bottom:1px solid #dfe6d9;}td{padding:14px;border-bottom:1px solid #edf0e8;color:#5c6f54;}tr:last-child td{border-bottom:0;}tbody tr{transition:background .15s;}tbody tr:hover{background:#f8faf5;}input{accent-color:#277255;}td:first-child,th:first-child{padding-right:0;width:35px;}`;
export const Badge = styled.span`display:inline-flex;align-items:center;gap:5px;padding:4px 7px;border-radius:4px;background:${p=>p.$warning?'#fcf1dd':'#edf4e8'};color:${p=>p.$warning?'#966c29':'#53804b'};font-size:10px;font-weight:600;`;
export const Empty = styled.div`padding:58px 20px;text-align:center;color:#7b8973;font-size:13px;svg{margin-bottom:15px;}h2{color:#42573c;margin-bottom:8px;}p{font-size:12px;}`;
export const Overlay = styled.div`position:fixed;inset:0;background:#17301e35;z-index:20;display:flex;justify-content:flex-end;`;
export const Drawer = styled.section`background:#fbfcf9;width:min(630px,95vw);height:100%;box-shadow:-15px 0 70px #1d341522;display:flex;flex-direction:column;animation:${slide} .2s ease-out;header{padding:25px 28px 20px;border-bottom:1px solid #e2e8da;}header h2{margin:0;}header p{font-size:11px;color:#819075;margin:8px 0 0;}footer{padding:18px 28px;border-top:1px solid #e2e8da;background:#f6f8f1;}`;
export const DrawerBody = styled.div`padding:10px 28px 26px;overflow:auto;flex:1;`;
export const FieldGrid = styled.div`display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-top:20px;@media(max-width:500px){grid-template-columns:1fr;}`;
export const Field = styled.label`display:block;font-size:11px;color:#63785a;span{display:block;margin-bottom:7px;font-weight:600;}select{width:100%;}textarea{width:100%;min-height:95px;resize:vertical;border:1px solid #dce2d8;border-radius:6px;padding:10px;font-size:12px;color:#344c3d;}small{display:block;margin-top:5px;color:#89967c;font-size:10px;}`;
export const Conflict = styled.div`margin:15px 0;padding:14px;background:#fff7e8;border:1px solid #eddcba;border-radius:6px;font-size:12px;strong{display:block;margin-bottom:8px;}button{margin:5px 8px 0 0;max-width:100%;white-space:normal;word-break:break-word;text-align:left;}`;
export const DialogBackdrop = styled(Overlay)`justify-content:center;align-items:center;z-index:30;`;
export const Dialog = styled.section`width:440px;max-width:90vw;background:#fff;border-radius:12px;padding:28px;box-shadow:0 20px 80px #17301e22;h2{font-size:20px;}p{font-size:13px;color:#74816b;line-height:1.7;}`;
export const Success = styled.div`text-align:center;padding:40px 0 25px;>div{width:65px;height:65px;display:grid;place-items:center;background:#e6f1de;color:#387340;border-radius:50%;margin:0 auto 22px;}h1{font-size:29px;}p{font-size:13px;color:#77866d;} ${Row}{justify-content:center;}`;
