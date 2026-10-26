"""Rebuild the original geometric app icon (requires Pillow for development only)."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent.parent / 'assets'
root.mkdir(exist_ok=True)
size = 1024
image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)
draw.rounded_rectangle((24, 24, 1000, 1000), radius=220, fill='#176b50')
draw.rounded_rectangle((258, 184, 724, 822), radius=48, fill='#ffffff')
draw.polygon([(578, 184), (724, 330), (578, 330)], fill='#c6e4d8')
draw.polygon([(578, 184), (724, 184), (724, 330)], fill='#176b50')
for y, end in [(390, 600), (475, 565), (560, 500)]:
    draw.rounded_rectangle((345, y, end, y + 30), radius=15, fill='#a1c8b9')
draw.rounded_rectangle((520, 620, 835, 730), radius=48, fill='#176b50')
draw.line([(575, 675), (770, 675)], fill='#ffffff', width=25)
draw.line([(712, 619), (772, 675), (712, 731)], fill='#ffffff', width=25, joint='curve')
image.resize((512, 512), Image.Resampling.LANCZOS).save(root / 'icon.png')
image.save(root / 'icon.ico', format='ICO', sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
(root / 'icon.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
<rect x="24" y="24" width="976" height="976" rx="220" fill="#176b50"/>
<path d="M306 184h272l146 146v444q0 48-48 48H306q-48 0-48-48V232q0-48 48-48" fill="#fff"/>
<path d="M578 184v146h146" fill="#c6e4d8"/>
<path d="M360 405h225m-225 85h190m-190 85h125" stroke="#a1c8b9" stroke-width="30" stroke-linecap="round"/>
<rect x="520" y="620" width="315" height="110" rx="48" fill="#176b50"/>
<path d="M575 675h195m-58-56 60 56-60 56" fill="none" stroke="#fff" stroke-width="25" stroke-linecap="round" stroke-linejoin="round"/>
</svg>\n''', encoding='utf-8')
print('Created icon.svg, icon.png and Windows multi-resolution icon.ico.')
