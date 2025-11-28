/**
 * src/shared/components/LiquidGlass/shaders.ts
 * SkSL shaders for Liquid Glass effects
 */

import { Skia } from '@shopify/react-native-skia';

// Liquid Glass refraction shader - based on Dominaants' GLSL shader
export const liquidGlassSource = Skia.RuntimeEffect.Make(`
uniform vec2 iResolution;
uniform vec2 iCenter;
uniform vec2 iDimensions;
uniform float iRadius;
uniform float iBlur;
uniform float iBrightness;
uniform float iSaturation;
uniform float iRefraction;
uniform shader image;

float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

vec4 main(vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution;
  vec2 center = iCenter / iResolution;
  vec2 dims = iDimensions / iResolution;
  float radius = iRadius / min(iResolution.x, iResolution.y);
  
  vec2 p = uv - center;
  
  // Distance to glass shape
  float d = sdRoundedBox(p, dims * 0.5, radius);
  
  // Edge detection for refraction
  float edgeWidth = 0.015;
  float edge = 1.0 - smoothstep(0.0, edgeWidth, abs(d));
  
  // Refraction offset based on edge normal
  vec2 normal = normalize(p);
  vec2 refractOffset = normal * edge * iRefraction * 0.03;
  
  // Inner glow
  float innerGlow = smoothstep(0.0, edgeWidth * 2.0, -d);
  
  // Sample with refraction
  vec2 sampleUV = uv + refractOffset;
  sampleUV = clamp(sampleUV, vec2(0.0), vec2(1.0));
  vec4 col = image.eval(sampleUV * iResolution);
  
  // Apply brightness boost at edges
  col.rgb += edge * iBrightness * 0.2;
  
  // Apply saturation
  float gray = dot(col.rgb, vec3(0.299, 0.587, 0.114));
  col.rgb = mix(vec3(gray), col.rgb, iSaturation);
  
  // Subtle highlight on top edge
  float topHighlight = smoothstep(0.0, dims.y * 0.3, -(p.y + dims.y * 0.4));
  col.rgb += topHighlight * innerGlow * 0.1;
  
  return col;
}
`)!;

// Simple blur shader for performance
export const simpleBlurSource = Skia.RuntimeEffect.Make(`
uniform vec2 iResolution;
uniform float iBlur;
uniform shader image;

vec4 main(vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution;
  
  vec4 col = vec4(0.0);
  float total = 0.0;
  
  float blur = iBlur / iResolution.x;
  
  for (float x = -2.0; x <= 2.0; x += 1.0) {
    for (float y = -2.0; y <= 2.0; y += 1.0) {
      vec2 offset = vec2(x, y) * blur;
      col += image.eval((uv + offset) * iResolution);
      total += 1.0;
    }
  }
  
  return col / total;
}
`)!;

// Pill/capsule shape shader for slider thumb
export const pillGlassSource = Skia.RuntimeEffect.Make(`
uniform vec2 iResolution;
uniform vec2 iCenter;
uniform float iRadius;
uniform float iPressed;
uniform shader image;

float sdCapsule(vec2 p, float r) {
  return length(p) - r;
}

vec4 main(vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution;
  vec2 center = iCenter / iResolution;
  float radius = iRadius / min(iResolution.x, iResolution.y);
  
  vec2 p = uv - center;
  float d = sdCapsule(p, radius);
  
  // Edge refraction
  float edge = 1.0 - smoothstep(0.0, 0.02, abs(d));
  vec2 normal = normalize(p);
  vec2 refract = normal * edge * 0.025;
  
  vec4 col = image.eval((uv + refract) * iResolution);
  
  // Brightness and pressed state
  float brightness = 1.0 + edge * 0.15 + iPressed * 0.1;
  col.rgb *= brightness;
  
  // Saturation boost
  float gray = dot(col.rgb, vec3(0.299, 0.587, 0.114));
  col.rgb = mix(vec3(gray), col.rgb, 1.25);
  
  // Top highlight
  float highlight = smoothstep(0.0, radius, -(p.y + radius * 0.5));
  col.rgb += highlight * (1.0 - smoothstep(-radius, 0.0, d)) * 0.15;
  
  return col;
}
`)!;
