#!/usr/bin/env python3
"""
Convert a multi-group SVG into an animated SVG for browser playback.
"""
import re
from pathlib import Path

SVG_DIR = Path(__file__).parent
INPUT_FILE = SVG_DIR / "combined_frames" / "frame_001.svg"
OUTPUT_FILE = SVG_DIR / "skull_flame_animated.svg"

def create_animated_svg():
    print("Creating animated SVG...")

    with open(INPUT_FILE, 'r') as f:
        content = f.read()

    # Find the SVG opening tag and viewBox
    svg_match = re.search(r'<svg[^>]*viewBox="([^"]*)"[^>]*>', content)
    if not svg_match:
        print("Could not find SVG tag with viewBox")
        return

    viewbox = svg_match.group(1)
    print(f"  ViewBox: {viewbox}")

    # Find all top-level groups (frames)
    # Pattern: groups that are direct children of SVG (start with "  <g>")
    # Split content by top-level group tags

    # Find positions of all "  <g>" (2 spaces + <g>)
    frame_pattern = re.compile(r'^  <g>', re.MULTILINE)
    frame_starts = [m.start() for m in frame_pattern.finditer(content)]

    print(f"  Found {len(frame_starts)} frames")

    if len(frame_starts) < 2:
        print("Not enough frames found")
        return

    # Extract each frame's content
    frames = []
    for i, start in enumerate(frame_starts):
        if i < len(frame_starts) - 1:
            end = frame_starts[i + 1]
        else:
            # Last frame - find closing </svg>
            end = content.rfind('</svg>')

        frame_content = content[start:end].strip()
        frames.append(frame_content)

    print(f"  Extracted {len(frames)} frame groups")

    num_frames = len(frames)
    frame_duration = 0.15  # seconds per frame
    total_duration = num_frames * frame_duration

    # Create CSS animation
    # Each frame is visible for (100/num_frames)% of the animation
    frame_percent = 100 / num_frames

    css_keyframes = []
    for i in range(num_frames):
        start_pct = i * frame_percent
        end_pct = (i + 1) * frame_percent

        # Frame is visible from start_pct to end_pct
        if i == 0:
            css_keyframes.append(f"    0%, {end_pct:.2f}% {{ opacity: 1; }}")
            css_keyframes.append(f"    {end_pct:.2f}%, 100% {{ opacity: 0; }}")
        else:
            css_keyframes.append(f"    0%, {start_pct:.2f}% {{ opacity: 0; }}")
            css_keyframes.append(f"    {start_pct:.2f}%, {end_pct:.2f}% {{ opacity: 1; }}")
            if end_pct < 100:
                css_keyframes.append(f"    {end_pct:.2f}%, 100% {{ opacity: 0; }}")

    # Build the animated SVG
    animated_svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}">
  <style>
    .frame {{ opacity: 0; }}
    .frame1 {{ animation: frame1 {total_duration}s infinite step-end; }}
    .frame2 {{ animation: frame2 {total_duration}s infinite step-end; }}
    .frame3 {{ animation: frame3 {total_duration}s infinite step-end; }}
    .frame4 {{ animation: frame4 {total_duration}s infinite step-end; }}
    .frame5 {{ animation: frame5 {total_duration}s infinite step-end; }}
    .frame6 {{ animation: frame6 {total_duration}s infinite step-end; }}
    .frame7 {{ animation: frame7 {total_duration}s infinite step-end; }}
    .frame8 {{ animation: frame8 {total_duration}s infinite step-end; }}
'''

    # Add keyframes for each frame
    for i in range(num_frames):
        start_pct = i * frame_percent
        end_pct = (i + 1) * frame_percent

        animated_svg += f'''
    @keyframes frame{i+1} {{
      0%, {start_pct:.1f}% {{ opacity: 0; }}
      {start_pct:.1f}%, {end_pct:.1f}% {{ opacity: 1; }}
      {end_pct:.1f}%, 100% {{ opacity: 0; }}
    }}
'''

    animated_svg += "  </style>\n\n"

    # Add frames with class names
    for i, frame in enumerate(frames):
        # Add class to the group
        frame_with_class = frame.replace("<g>", f'<g class="frame frame{i+1}">', 1)
        animated_svg += f"  {frame_with_class}\n\n"

    animated_svg += "</svg>\n"

    # Write output
    with open(OUTPUT_FILE, 'w') as f:
        f.write(animated_svg)

    print(f"\nCreated: {OUTPUT_FILE}")
    print(f"  Frames: {num_frames}")
    print(f"  Duration: {total_duration}s per loop")
    print(f"  Frame rate: {1/frame_duration:.1f} fps")

if __name__ == "__main__":
    create_animated_svg()
