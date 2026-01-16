#!/usr/bin/env python3
"""
Create animated GIF from SVG frames.
"""
import os
import re
from pathlib import Path
from io import BytesIO

import cairosvg
from PIL import Image

SVG_DIR = Path(__file__).parent
OUTPUT_DIR = SVG_DIR

def svg_to_png(svg_path: Path, width: int = None, height: int = None) -> Image.Image:
    """Convert SVG to PIL Image."""
    png_data = cairosvg.svg2png(
        url=str(svg_path),
        output_width=width,
        output_height=height
    )
    return Image.open(BytesIO(png_data))

def get_svg_dimensions(svg_path: Path) -> tuple[float, float]:
    """Extract viewBox dimensions from SVG."""
    with open(svg_path, 'r') as f:
        content = f.read()

    match = re.search(r'viewBox="([^"]+)"', content)
    if match:
        parts = match.group(1).split()
        if len(parts) >= 4:
            return float(parts[2]), float(parts[3])
    return 100, 100

def create_gif(
    svg_files: list[Path],
    output_path: Path,
    frame_duration: int = 100,
    target_size: tuple[int, int] = None,
    loop: bool = True,
    background_color: tuple[int, int, int, int] = (255, 255, 255, 0)
):
    """Create animated GIF from SVG files."""

    if not svg_files:
        print("No SVG files provided!")
        return

    print(f"Creating GIF with {len(svg_files)} frames...")

    # Determine target size if not specified
    if target_size is None:
        # Use the largest dimensions from all frames
        max_w, max_h = 0, 0
        for svg in svg_files:
            w, h = get_svg_dimensions(svg)
            max_w = max(max_w, w)
            max_h = max(max_h, h)

        # Scale to reasonable size (max 500px on longest side)
        scale = min(500 / max(max_w, max_h), 1)
        target_size = (int(max_w * scale), int(max_h * scale))

    print(f"Target size: {target_size[0]}x{target_size[1]}")

    frames = []
    for i, svg_path in enumerate(svg_files):
        print(f"  Processing frame {i+1}/{len(svg_files)}: {svg_path.name}")

        # Convert SVG to PNG
        img = svg_to_png(svg_path, width=target_size[0], height=target_size[1])

        # Ensure RGBA mode
        if img.mode != 'RGBA':
            img = img.convert('RGBA')

        # Create background and composite
        bg = Image.new('RGBA', target_size, background_color)

        # Center the image if it's smaller than target
        if img.size != target_size:
            offset = ((target_size[0] - img.size[0]) // 2,
                     (target_size[1] - img.size[1]) // 2)
            bg.paste(img, offset, img)
            img = bg

        frames.append(img)

    # Convert to palette mode for GIF (required for transparency)
    gif_frames = []
    for frame in frames:
        # Convert RGBA to P mode with transparency
        # Create a white background version for GIF
        bg = Image.new('RGB', frame.size, (255, 255, 255))
        bg.paste(frame, mask=frame.split()[3] if frame.mode == 'RGBA' else None)
        gif_frames.append(bg)

    # Save as GIF
    gif_frames[0].save(
        output_path,
        save_all=True,
        append_images=gif_frames[1:],
        duration=frame_duration,
        loop=0 if loop else 1
    )

    print(f"Saved GIF to: {output_path}")
    print(f"  Frames: {len(gif_frames)}")
    print(f"  Duration: {frame_duration}ms per frame")
    print(f"  Total duration: {len(gif_frames) * frame_duration}ms")

def natural_sort_key(path: Path) -> tuple:
    """Sort key for natural sorting of filenames."""
    name = path.stem
    # Extract number from filename
    match = re.search(r'(\d+)', name)
    if match:
        return (name[:match.start()], int(match.group(1)))
    return (name, 0)

def main():
    print("=" * 60)
    print("SVG to Animated GIF Converter")
    print("=" * 60)

    # Find all Asset SVGs
    flame_only_files = []  # Assets 2-12 (small flames)
    skull_files = []       # Assets 14-21 (skull + flame)

    for svg in SVG_DIR.glob("Asset*.svg"):
        # Extract number from filename
        match = re.search(r'Asset\s*(\d+)', svg.name)
        if match:
            num = int(match.group(1))
            if num <= 12:
                flame_only_files.append(svg)
            else:
                skull_files.append(svg)

    # Sort naturally
    flame_only_files.sort(key=natural_sort_key)
    skull_files.sort(key=natural_sort_key)

    print(f"\nFound {len(flame_only_files)} flame-only frames (Assets 2-12)")
    print(f"Found {len(skull_files)} skull+flame frames (Assets 14-21)")

    # Create flame-only GIF
    if flame_only_files:
        print("\n" + "-" * 40)
        print("Creating FLAME FLICKERING animation...")
        create_gif(
            flame_only_files,
            OUTPUT_DIR / "flame_animation.gif",
            frame_duration=80,  # Fast flicker
            target_size=(100, 200)  # Small flame size
        )

    # Create skull+flame GIF
    if skull_files:
        print("\n" + "-" * 40)
        print("Creating SKULL + MELTING CANDLE animation...")
        create_gif(
            skull_files,
            OUTPUT_DIR / "skull_candle_animation.gif",
            frame_duration=150,  # Slower for candle melting
            target_size=(400, 300)  # Larger for skull detail
        )

    # Create combined animation (if we have both)
    if flame_only_files and skull_files:
        print("\n" + "-" * 40)
        print("Creating COMBINED animation (all frames)...")
        all_files = flame_only_files + skull_files
        all_files.sort(key=natural_sort_key)
        create_gif(
            all_files,
            OUTPUT_DIR / "full_animation.gif",
            frame_duration=100,
            target_size=(400, 300)
        )

    print("\n" + "=" * 60)
    print("Done! GIF files created in:")
    print(f"  {OUTPUT_DIR}")
    print("=" * 60)

if __name__ == "__main__":
    main()
