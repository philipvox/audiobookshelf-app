#!/usr/bin/env python3
"""
Combine flame and skull SVGs into separate frame files.
"""
import re
import os
from pathlib import Path
import math

SVG_DIR = Path(__file__).parent
OUTPUT_DIR = SVG_DIR / "combined_frames"

def get_svg_viewbox(svg_content: str) -> tuple:
    """Extract viewBox dimensions from SVG."""
    match = re.search(r'viewBox="([^"]+)"', svg_content)
    if match:
        parts = match.group(1).split()
        return tuple(float(p) for p in parts)
    return (0, 0, 100, 100)

def get_svg_paths(svg_content: str) -> str:
    """Extract path elements from SVG."""
    # Find all path elements
    paths = re.findall(r'<path[^>]*/?>', svg_content)
    return '\n    '.join(paths)

def natural_sort_key(path: Path) -> tuple:
    """Sort key for natural sorting of filenames."""
    name = path.stem
    match = re.search(r'(\d+)', name)
    if match:
        return (name[:match.start()], int(match.group(1)))
    return (name, 0)

def create_combined_svg(flame_svg_path: Path, skull_svg_path: Path,
                         flame_offset: tuple, skull_offset: tuple,
                         canvas_size: tuple) -> str:
    """Create a combined SVG with flame and skull."""

    with open(flame_svg_path, 'r') as f:
        flame_content = f.read()
    with open(skull_svg_path, 'r') as f:
        skull_content = f.read()

    # Get viewBoxes
    flame_vb = get_svg_viewbox(flame_content)
    skull_vb = get_svg_viewbox(skull_content)

    # Get paths
    flame_paths = get_svg_paths(flame_content)
    skull_paths = get_svg_paths(skull_content)

    # Calculate transforms
    # Flame transform: translate to position, scale to fit
    flame_scale = 0.8  # Scale factor for flame
    flame_tx = flame_offset[0] - flame_vb[0] * flame_scale
    flame_ty = flame_offset[1] - flame_vb[1] * flame_scale

    # Skull transform: translate to position
    skull_scale = 1.2  # Scale factor for skull
    skull_tx = skull_offset[0] - skull_vb[0] * skull_scale
    skull_ty = skull_offset[1] - skull_vb[1] * skull_scale

    # Build combined SVG
    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {canvas_size[0]} {canvas_size[1]}">
  <style>
    .flame, .skull {{ fill: #000000; }}
  </style>

  <!-- Skull -->
  <g class="skull" transform="translate({skull_tx:.2f}, {skull_ty:.2f}) scale({skull_scale})">
    {skull_paths}
  </g>

  <!-- Flame -->
  <g class="flame" transform="translate({flame_tx:.2f}, {flame_ty:.2f}) scale({flame_scale})">
    {flame_paths}
  </g>
</svg>
'''
    return svg

def main():
    print("Creating combined SVG frames...")

    # Create output directory
    OUTPUT_DIR.mkdir(exist_ok=True)

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

    print(f"  Flame frames: {len(flame_files)}")
    print(f"  Skull frames: {len(skull_files)}")

    # Canvas size
    canvas_size = (200, 260)

    # Positioning (matching the GIF)
    skull_offset = (10, 85)   # Where skull starts
    flame_offset = (72, 35)   # Where flame starts (on top of candle)

    # Use 8 frames (one per skull stage, flames cycle)
    num_frames = len(skull_files)  # 8 frames
    print(f"  Creating {num_frames} combined frames...")

    # Create each frame
    for i in range(num_frames):
        flame_idx = i % len(flame_files)
        skull_idx = i % len(skull_files)

        flame_file = flame_files[flame_idx]
        skull_file = skull_files[skull_idx]

        svg_content = create_combined_svg(
            flame_file, skull_file,
            flame_offset, skull_offset,
            canvas_size
        )

        output_path = OUTPUT_DIR / f"frame_{i+1:03d}.svg"
        with open(output_path, 'w') as f:
            f.write(svg_content)

        if (i + 1) % 10 == 0 or i == 0:
            print(f"    Created frame {i+1}/{num_frames}")

    print(f"\nDone! {num_frames} SVG frames saved to:")
    print(f"  {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
