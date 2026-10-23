"""Build portfolio assets from the SideHustle repos into deb_portfolio/public/projects.

Run with the AirLyrics spike venv (has Pillow and the bridge renderer):
  ~/Downloads/SideHustle/AirLyrics/spike/.venv/bin/python scripts/build-project-assets.py [ado|airlyrics|led ...]
"""
import os
import shutil
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFilter

SH = os.path.expanduser("~/Downloads/SideHustle")
OUT = os.path.join(SH, "deb_portfolio/public/projects")
SPIKE = os.path.join(SH, "AirLyrics/spike")
sys.path.insert(0, SPIKE)
import logging  # noqa: E402

logging.disable(logging.CRITICAL)
import render  # noqa: E402
from render import Theme  # noqa: E402

BG = (11, 11, 14)


def out(slug, name):
    d = os.path.join(OUT, slug)
    os.makedirs(d, exist_ok=True)
    return os.path.join(d, name)


def save_jpg(im, path, width=None, q=84):
    im = im.convert("RGB")
    if width and im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(path, "JPEG", quality=q, optimize=True, progressive=True)
    print("wrote", os.path.relpath(path, SH), im.size)


def cover_square(im, size):
    s = min(im.size)
    l, t = (im.width - s) // 2, (im.height - s) // 2
    return im.crop((l, t, l + s, t + s)).resize((size, size), Image.LANCZOS)


# ---------- LED panel look ----------
def led(frame32, size=1000, pad=0.06, unlit=(24, 24, 30), bg=BG):
    """Draw a 32x32 RGB frame as a panel of round LEDs with a soft glow."""
    inner = int(size * (1 - 2 * pad))
    cell = inner / 32
    off = (size - inner) / 2
    dots = Image.new("RGB", (size, size), bg)
    lit = Image.new("RGB", (size, size), (0, 0, 0))
    dd, dl = ImageDraw.Draw(dots), ImageDraw.Draw(lit)
    px = frame32.convert("RGB").load()
    r = cell * 0.40
    for y in range(32):
        for x in range(32):
            cx, cy = off + (x + 0.5) * cell, off + (y + 0.5) * cell
            c = px[x, y]
            on = max(c) > 12
            box = (cx - r, cy - r, cx + r, cy + r)
            dd.ellipse(box, fill=c if on else unlit)
            if on:
                dl.ellipse(box, fill=c)
    glow = lit.filter(ImageFilter.GaussianBlur(cell * 0.9))
    out_im = Image.blend(dots, Image.composite(dots, glow, Image.new("L", (size, size), 0)), 0)
    # additive glow
    from PIL import ImageChops

    out_im = ImageChops.add(dots, glow.point(lambda v: int(v * 0.55)))
    # rounded panel frame
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=int(size * 0.04), fill=255)
    framed = Image.new("RGB", (size, size), (6, 6, 8))
    framed.paste(out_im, (0, 0), mask)
    return framed


def on_stage(panel, w=1920, h=1080, glow_color=(150, 60, 220)):
    """Place a square panel on a dark 16:9 stage with a soft coloured halo."""
    stage = Image.new("RGB", (w, h), BG)
    halo = Image.new("RGB", (w, h), (0, 0, 0))
    ImageDraw.Draw(halo).ellipse((w / 2 - 520, h / 2 - 470, w / 2 + 520, h / 2 + 470), fill=glow_color)
    halo = halo.filter(ImageFilter.GaussianBlur(160)).point(lambda v: int(v * 0.22))
    from PIL import ImageChops

    stage = ImageChops.add(stage, halo)
    s = panel.width
    stage.paste(panel, ((w - s) // 2, (h - s) // 2))
    return stage


LINES = [
    ("lost in the echo tonight", 320),
    ("city lights", 205),
    ("hello world from the notch", 90),
]


def lyric_frame(text, hue):
    return render.render_text(text, font="chunky", theme=Theme(mode="vivid", hue=hue))


def build_led():
    slug = "airlyrics-led"
    frames = [lyric_frame(t, h) for t, h in LINES]
    led(frames[0], 1000).save(out(slug, "disc.png"), optimize=True)
    print("wrote disc.png")
    for i, f in enumerate(frames):
        save_jpg(led(f, 900), out(slug, f"lyric-{i + 1}.jpg"))
    gif = Image.open(os.path.join(SPIKE, "idle_gif_preview/nowplaying_scroll_long.gif"))
    card_frames = []
    for i in range(gif.n_frames):
        gif.seek(i)
        card_frames.append(gif.convert("RGB").copy())
    save_jpg(led(card_frames[0], 900), out(slug, "idle-card.jpg"))

    # Panel film: three lyric lines, then the now-playing idle card loop (x2), at 6 fps.
    tmp = tempfile.mkdtemp()
    seq = []
    for f in frames:
        seq += [f] * 14
    seq += card_frames * 2
    cache = {}
    for i, f in enumerate(seq):
        key = f.tobytes()
        if key not in cache:
            p = os.path.join(tmp, f"u{len(cache):04d}.png")
            on_stage(led(f, 860)).save(p)
            cache[key] = p
        shutil.copy(cache[key], os.path.join(tmp, f"f{i:04d}.png"))
    video = out(slug, "panel.mp4")
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-framerate", "6", "-i", os.path.join(tmp, "f%04d.png"),
         "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "24", "-preset", "slow",
         "-movflags", "+faststart", video],
        check=True,
    )
    print("wrote panel.mp4", os.path.getsize(video) // 1024, "KB")
    save_jpg(on_stage(led(frames[0], 860)), out(slug, "poster.jpg"), 1600)
    shutil.rmtree(tmp)


def build_airlyrics():
    slug = "airlyrics"
    src = os.path.join(SH, "AirLyrics/brag-output/brag.mp4")
    video = out(slug, "film.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-c", "copy", "-movflags", "+faststart", video], check=True)
    print("wrote film.mp4", os.path.getsize(video) // 1024, "KB")

    def frame_at(t):
        p = os.path.join(tempfile.gettempdir(), f"al-{t}.png")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", src, "-frames:v", "1", p], check=True)
        return Image.open(p).convert("RGB")

    save_jpg(frame_at(3), out(slug, "poster.jpg"), 1600)

    # Disc label: the notch + lyric strip at the top, the wordmark at the bottom, centre clear for the hub.
    f1, fw = frame_at(1), frame_at(21.5)
    size = 1200
    disc = Image.new("RGB", (size, size), (12, 12, 15))
    halo = Image.new("RGB", (size, size), (0, 0, 0))
    ImageDraw.Draw(halo).ellipse((150, 650, 1050, 1250), fill=(190, 40, 150))
    from PIL import ImageChops

    disc = ImageChops.add(disc, halo.filter(ImageFilter.GaussianBlur(140)).point(lambda v: int(v * 0.35)))
    strip = f1.crop((800, 0, 1500, 62))  # notch + the lyric beside it
    strip = strip.resize((int(strip.width * 1.2), int(strip.height * 1.2)), Image.LANCZOS)
    disc.paste(strip, ((size - strip.width) // 2, 190))
    mark = fw.crop((660, 440, 1260, 600))  # AirLyrics wordmark
    mark = mark.resize((int(mark.width * 1.1), int(mark.height * 1.1)), Image.LANCZOS)
    mx, my = (size - mark.width) // 2, 840
    region = disc.crop((mx, my, mx + mark.width, my + mark.height))
    disc.paste(ImageChops.lighter(region, mark), (mx, my))
    save_jpg(disc, out(slug, "disc.jpg"), q=88)

    # Real-world photos, cropped to the menu bar so the lyric beside the notch is the subject.
    for name, path, box in [
        ("notch-1.jpg", "screenshot-1.jpeg", (0.0, 0.355, 1.0, 0.50)),
        ("notch-2.jpg", "screenshot-2.jpeg", (0.0, 0.215, 1.0, 0.36)),
    ]:
        im = Image.open(os.path.join(SH, "AirLyrics/screenshots", path)).convert("RGB")
        w, h = im.size
        save_jpg(im.crop((int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h))), out(slug, name), 1800)
    save_jpg(frame_at(20).crop((560, 120, 1360, 600)), out(slug, "settings.jpg"), 1600)


def build_ado():
    slug = "ado-sprint-planner"
    md = os.path.join(SH, "ado-sprint-planner/metadata")
    hero = Image.open(os.path.join(md, "hero-plan-sprint-1.png")).convert("RGB")
    save_jpg(hero, out(slug, "cover.jpg"), 1920)
    save_jpg(hero.crop((530, 160, 1460, 1090)).resize((1000, 1000), Image.LANCZOS), out(slug, "disc.jpg"), q=88)
    for name, src in [
        ("commands.jpg", "azure-devops-planner.png"),
        ("today.jpg", "Todo-3.png"),
        ("my-tickets.jpg", "my-tickets-4.png"),
        ("status.jpg", "status-tracker-7.png"),
        ("quick-note.jpg", "quick-note-6.png"),
    ]:
        save_jpg(Image.open(os.path.join(md, src)), out(slug, name), 1600)


if __name__ == "__main__":
    only = sys.argv[1:] or ["ado", "airlyrics", "led"]
    if "ado" in only:
        build_ado()
    if "airlyrics" in only:
        build_airlyrics()
    if "led" in only:
        build_led()
