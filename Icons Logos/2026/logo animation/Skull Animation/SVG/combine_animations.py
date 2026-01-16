#!/usr/bin/env python3
"""
Combine flame and skull animations into one composite animation.
The flame will be positioned on top of the skull's candle.
"""
import re
from pathlib import Path
from io import BytesIO
import math

import cairosvg
from PIL import Image

SVG_DIR = Path(__file__).parent

def svg_to_image_raw(svg_path: Path) -> Image.Image:
    """Convert SVG to PIL Image at native size with transparency."""
    png_data = cairosvg.svg2png(
        url=str(svg_path),
        background_color="transparent"
    )
    img = Image.open(BytesIO(png_data))
    return img.convert('RGBA')

def make_pure_black(img: Image.Image) -> Image.Image:
    """Convert all non-transparent pixels to pure black."""
    img = img.convert('RGBA')
    pixels = img.load()
    width, height = img.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a > 0:  # If not fully transparent
                pixels[x, y] = (0, 0, 0, a)
    return img

def get_content_bounds(img: Image.Image) -> tuple:
    """Get bounding box of non-transparent content."""
    pixels = img.load()
    width, height = img.size

    min_x, min_y = width, height
    max_x, max_y = 0, 0

    for y in range(height):
        for x in range(width):
            if pixels[x, y][3] > 0:  # Has alpha
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)

    if max_x < min_x:  # Empty image
        return None
    return (min_x, min_y, max_x + 1, max_y + 1)

def center_in_frame(img: Image.Image, frame_size: tuple, align_bottom: bool = False) -> Image.Image:
    """Center image in a frame of given size. If align_bottom, align to bottom edge."""
    frame = Image.new('RGBA', frame_size, (0, 0, 0, 0))

    # Get actual content bounds
    bounds = get_content_bounds(img)
    if bounds is None:
        return frame  # Empty image

    # Crop to content
    content = img.crop(bounds)
    content_w, content_h = content.size

    # Calculate position - center horizontally
    x = (frame_size[0] - content_w) // 2

    if align_bottom:
        # Align to bottom of frame
        y = frame_size[1] - content_h
    else:
        # Center vertically
        y = (frame_size[1] - content_h) // 2

    frame.paste(content, (x, y), content)
    return frame

def natural_sort_key(path: Path) -> tuple:
    """Sort key for natural sorting of filenames."""
    name = path.stem
    match = re.search(r'(\d+)', name)
    if match:
        return (name[:match.start()], int(match.group(1)))
    return (name, 0)

def create_combined_animation():
    print("Creating combined skull + flame animation...")

    # Get flame SVGs (Assets 2-12)
    flame_files = sorted(
        [f for f in SVG_DIR.glob("Asset*.svg")
         if re.search(r'Asset\s*(\d+)', f.name) and
         int(re.search(r'Asset\s*(\d+)', f.name).group(1)) <= 12],
        key=natural_sort_key
    )

    # Get skull SVGs (Assets 14-21)
    skull_files = sorted(
        [f for f in SVG_DIR.glob("Asset*.svg")
         if re.search(r'Asset\s*(\d+)', f.name) and
         int(re.search(r'Asset\s*(\d+)', f.name).group(1)) > 12],
        key=natural_sort_key
    )

    print(f"  Flame files: {[f.name for f in flame_files]}")
    print(f"  Skull files: {[f.name for f in skull_files]}")

    # Target sizes for consistent frames
    flame_frame_size = (40, 60)   # Frame to hold centered flames
    skull_frame_size = (180, 220)  # Frame to hold skulls aligned at bottom

    # Load and process flame frames
    flame_frames = []
    for ff in flame_files:
        img = svg_to_image_raw(ff)
        img = make_pure_black(img)

        # Check if empty
        if get_content_bounds(img) is None:
            print(f"    Skipping empty frame: {ff.name}")
            continue

        # Center in frame, align bottom so flame base stays fixed
        img = center_in_frame(img, flame_frame_size, align_bottom=True)
        flame_frames.append(img)

    print(f"  Loaded {len(flame_frames)} valid flame frames")

    # Load and process skull frames
    skull_frames = []
    for sf in skull_files:
        img = svg_to_image_raw(sf)
        img = make_pure_black(img)

        # Align at bottom so skull stays fixed, candle melts from top
        img = center_in_frame(img, skull_frame_size, align_bottom=True)
        skull_frames.append(img)

    print(f"  Loaded {len(skull_frames)} skull frames")

    # Calculate number of frames (LCM for seamless loop)
    def lcm(a, b):
        return abs(a * b) // math.gcd(a, b)
    num_frames = lcm(len(skull_frames), len(flame_frames))
    print(f"  Combined animation will have {num_frames} frames")

    # Canvas settings - tight fit
    canvas_width = 200
    canvas_height = 260

    # Position skull at bottom center of canvas
    skull_x = (canvas_width - skull_frame_size[0]) // 2
    skull_y = canvas_height - skull_frame_size[1]

    # Position flame on top of the candle (left side of skull head)
    flame_x = skull_x + 42
    flame_y = skull_y + 5  # Sitting on the skull's candle

    print(f"  Skull pos: ({skull_x}, {skull_y})")
    print(f"  Flame pos: ({flame_x}, {flame_y})")

    # Create combined frames
    combined_frames = []
    for i in range(num_frames):
        canvas = Image.new('RGBA', (canvas_width, canvas_height), (255, 255, 255, 255))

        skull_idx = i % len(skull_frames)
        flame_idx = i % len(flame_frames)

        # Paste skull first
        canvas.paste(skull_frames[skull_idx], (skull_x, skull_y), skull_frames[skull_idx])

        # Paste flame on top
        canvas.paste(flame_frames[flame_idx], (flame_x, flame_y), flame_frames[flame_idx])

        combined_frames.append(canvas)

    # Convert to RGB for GIF
    gif_frames = [frame.convert('RGB') for frame in combined_frames]

    # Save
    output_path = SVG_DIR / "skull_flame_combined.gif"
    gif_frames[0].save(
        output_path,
        save_all=True,
        append_images=gif_frames[1:],
        duration=100,
        loop=0
    )

    print(f"\nSaved: {output_path}")
    print(f"  Size: {canvas_width}x{canvas_height}")
    print(f"  Frames: {num_frames}")

if __name__ == "__main__":
    create_combined_animation()
