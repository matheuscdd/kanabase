from __future__ import annotations

import argparse
import colorsys
import json
import math
from collections import Counter
from pathlib import Path
from typing import Iterable

from PIL import Image


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def rgb_to_hsl(rgb: tuple[int, int, int]) -> tuple[float, float, float]:
    red, green, blue = [channel / 255 for channel in rgb]
    hue, lightness, saturation = colorsys.rgb_to_hls(red, green, blue)
    return hue * 360, saturation, lightness


def hsl_to_rgb(hue: float, saturation: float, lightness: float) -> tuple[int, int, int]:
    red, green, blue = colorsys.hls_to_rgb((hue % 360) / 360, lightness, saturation)
    return round(red * 255), round(green * 255), round(blue * 255)


def relative_luminance(rgb: tuple[int, int, int]) -> float:
    channels = []
    for channel in rgb:
        value = channel / 255
        if value <= 0.03928:
            channels.append(value / 12.92)
        else:
            channels.append(((value + 0.055) / 1.055) ** 2.4)
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]


def contrast_ratio(color_a: tuple[int, int, int], color_b: tuple[int, int, int]) -> float:
    luminance_a = relative_luminance(color_a)
    luminance_b = relative_luminance(color_b)
    lighter = max(luminance_a, luminance_b)
    darker = min(luminance_a, luminance_b)
    return (lighter + 0.05) / (darker + 0.05)


def hue_distance(first: float, second: float) -> float:
    distance = abs((first - second) % 360)
    return min(distance, 360 - distance)


def color_distance(first: tuple[int, int, int], second: tuple[int, int, int]) -> float:
    return math.sqrt(sum((left - right) ** 2 for left, right in zip(first, second)))


def rgb_to_hex(rgb: tuple[int, int, int]) -> str:
    return f"#{rgb[0]:02X}{rgb[1]:02X}{rgb[2]:02X}"


def visible_pixels(image_path: Path) -> list[tuple[int, int, int]]:
    image = Image.open(image_path).convert("RGBA")
    small_image = image.resize((min(image.width, 256), min(image.height, 256)))
    pixels = small_image.load()
    visible: list[tuple[int, int, int]] = []
    for y_coord in range(small_image.height):
        for x_coord in range(small_image.width):
            red, green, blue, alpha = pixels[x_coord, y_coord]
            if alpha >= 24:
                visible.append((red, green, blue))
    return visible


def representative_colors(pixels: Iterable[tuple[int, int, int]]) -> list[tuple[int, int, int]]:
    counts = Counter(pixels)
    chosen: list[tuple[int, int, int]] = []
    for rgb, _count in counts.most_common(64):
        if not chosen:
            chosen.append(rgb)
            continue
        if all(color_distance(rgb, existing) >= 42 for existing in chosen):
            chosen.append(rgb)
        if len(chosen) == 4:
            break
    return chosen or [(128, 128, 128)]


def circular_mean_hue(colors: list[tuple[int, int, int]]) -> float:
    x_total = 0.0
    y_total = 0.0
    for red, green, blue in colors:
        hue, _saturation, _lightness = rgb_to_hsl((red, green, blue))
        radians = math.radians(hue)
        x_total += math.cos(radians)
        y_total += math.sin(radians)
    if x_total == 0 and y_total == 0:
        return 0.0
    return math.degrees(math.atan2(y_total, x_total)) % 360


def overall_lightness(colors: list[tuple[int, int, int]]) -> float:
    lightness_values = [rgb_to_hsl(color)[2] for color in colors]
    return sum(lightness_values) / len(lightness_values)


def candidate_recipe(base_hue: float, image_lightness: float) -> list[tuple[float, float, float]]:
    darker_base = 0.39 if image_lightness > 0.58 else 0.44
    brighter_base = 0.57 if image_lightness < 0.48 else 0.52
    return [
        ((base_hue + 180) % 360, 0.78, darker_base),
        ((base_hue + 150) % 360, 0.84, 0.48),
        ((base_hue + 210) % 360, 0.83, 0.46),
        ((base_hue + 120) % 360, 0.76, brighter_base),
        ((base_hue + 300) % 360, 0.82, 0.50),
        ((base_hue + 90) % 360, 0.86, 0.47),
        ((base_hue + 240) % 360, 0.80, 0.43),
    ]


def acceptable_background(
    background: tuple[int, int, int], representatives: list[tuple[int, int, int]]
) -> bool:
    background_hue, _background_saturation, background_lightness = rgb_to_hsl(background)
    for color in representatives[:3]:
        color_hue, _color_saturation, color_lightness = rgb_to_hsl(color)
        if hue_distance(background_hue, color_hue) < 20 and abs(background_lightness - color_lightness) < 0.18:
            return False
        if contrast_ratio(background, color) < 1.35 and color_distance(background, color) < 92:
            return False
    return True


def refine_background(
    background_hsl: tuple[float, float, float], representatives: list[tuple[int, int, int]]
) -> tuple[int, int, int]:
    hue, saturation, lightness = background_hsl
    for hue_shift in (0, 18, -18, 30, -30, 45, -45):
        candidate_hue = (hue + hue_shift) % 360
        for lightness_shift in (0.0, -0.06, 0.06, -0.1, 0.1):
            candidate = hsl_to_rgb(
                candidate_hue,
                clamp(saturation, 0.68, 0.92),
                clamp(lightness + lightness_shift, 0.34, 0.62),
            )
            if acceptable_background(candidate, representatives):
                return candidate
    return hsl_to_rgb(hue, clamp(saturation, 0.68, 0.92), clamp(lightness, 0.36, 0.58))


def generate_palette(image_path: Path) -> list[str]:
    pixels = visible_pixels(image_path)
    representatives = representative_colors(pixels)
    base_hue = circular_mean_hue(representatives)
    image_lightness = overall_lightness(representatives)
    palette: list[str] = []
    for recipe in candidate_recipe(base_hue, image_lightness):
        background = refine_background(recipe, representatives)
        hex_value = rgb_to_hex(background)
        if hex_value not in palette:
            palette.append(hex_value)
        if len(palette) == 5:
            break
    if len(palette) < 5:
        fallback_hues = [(base_hue + offset) % 360 for offset in (135, 195, 255, 315, 75)]
        for hue in fallback_hues:
            hex_value = rgb_to_hex(refine_background((hue, 0.8, 0.46), representatives))
            if hex_value not in palette:
                palette.append(hex_value)
            if len(palette) == 5:
                break
    return palette


def build_output(root: Path) -> dict[str, list[str]]:
    output: dict[str, list[str]] = {}
    for image_path in sorted(root.glob("*.png"), key=lambda path: int(path.stem) if path.stem.isdigit() else 9999):
        if not image_path.stem.isdigit():
            continue
        output[image_path.name] = generate_palette(image_path)
    return output


def write_markdown(output_path: Path, palettes: dict[str, list[str]]) -> None:
    lines = ["# Sugestoes de Fundos", ""]
    for image_name, colors in palettes.items():
        lines.append(f"## {image_name}")
        lines.append(", ".join(colors))
        lines.append("")
    output_path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", type=Path)
    parser.add_argument("--json", dest="json_path", type=Path)
    parser.add_argument("--markdown", dest="markdown_path", type=Path)
    parser.add_argument("--single", dest="single_image", type=Path)
    args = parser.parse_args()

    if args.single_image:
        palette = generate_palette(args.single_image)
        print(json.dumps({args.single_image.name: palette}, ensure_ascii=False, indent=2))
        return

    palettes = build_output(args.root)
    if args.json_path:
        args.json_path.write_text(json.dumps(palettes, ensure_ascii=False, indent=2), encoding="utf-8")
    if args.markdown_path:
        write_markdown(args.markdown_path, palettes)
    if not args.json_path and not args.markdown_path:
        print(json.dumps(palettes, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()