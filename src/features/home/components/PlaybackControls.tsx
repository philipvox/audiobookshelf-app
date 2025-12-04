/**
 * src/features/home/components/PlaybackControls.tsx
 *
 * Playback controls using exact Anima SVG buttons
 * Order: Rewind | Fast Forward | Play
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { SvgXml } from 'react-native-svg';

// PNG button images with glow effects
const playButtonImage = require('../assets/play-button.png');
const pauseButtonImage = require('../assets/pause-button.png');

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

// Exact Anima rewind button SVG (53x56)
const rewindSvg = `<svg width="53" height="56" viewBox="0 0 53 56" fill="none" xmlns="http://www.w3.org/2000/svg">
<mask id="path-1-inside-1_224_140" fill="white">
<path d="M52.4046 5.21277C52.4046 2.33384 50.0708 0 47.1919 0H5.2128C2.33387 0 3.05176e-05 2.33383 3.05176e-05 5.21277V50.6282C3.05176e-05 53.5071 2.33387 55.841 5.2128 55.841H47.1919C50.0708 55.841 52.4046 53.5071 52.4046 50.6282V5.21277Z"/>
</mask>
<path d="M52.4046 5.21277C52.4046 2.33384 50.0708 0 47.1919 0H5.2128C2.33387 0 3.05176e-05 2.33383 3.05176e-05 5.21277V50.6282C3.05176e-05 53.5071 2.33387 55.841 5.2128 55.841H47.1919C50.0708 55.841 52.4046 53.5071 52.4046 50.6282V5.21277Z" fill="#262626"/>
<path d="M52.4046 5.21277C52.4046 2.33384 50.0708 0 47.1919 0H5.2128C2.33387 0 3.05176e-05 2.33383 3.05176e-05 5.21277V50.6282C3.05176e-05 53.5071 2.33387 55.841 5.2128 55.841H47.1919C50.0708 55.841 52.4046 53.5071 52.4046 50.6282V5.21277Z" fill="url(#paint0_linear_224_140)" fill-opacity="0.2"/>
<path d="M52.4046 5.21277C52.4046 2.33384 50.0708 0 47.1919 0H5.2128C2.33387 0 3.05176e-05 2.33383 3.05176e-05 5.21277V50.6282C3.05176e-05 53.5071 2.33387 55.841 5.2128 55.841H47.1919C50.0708 55.841 52.4046 53.5071 52.4046 50.6282V5.21277Z" fill="url(#paint1_linear_224_140)" fill-opacity="0.2"/>
<path d="M52.4046 5.21277C52.4046 2.33384 50.0708 0 47.1919 0H5.2128C2.33387 0 3.05176e-05 2.33383 3.05176e-05 5.21277V50.6282C3.05176e-05 53.5071 2.33387 55.841 5.2128 55.841H47.1919C50.0708 55.841 52.4046 53.5071 52.4046 50.6282V5.21277Z" fill="url(#paint2_radial_224_140)" fill-opacity="0.1"/>
<path d="M52.4046 5.21277C52.4046 2.33384 50.0708 0 47.1919 0H5.2128C2.33387 0 3.05176e-05 2.33383 3.05176e-05 5.21277V50.6282C3.05176e-05 53.5071 2.33387 55.841 5.2128 55.841H47.1919C50.0708 55.841 52.4046 53.5071 52.4046 50.6282V5.21277Z" fill="url(#paint3_radial_224_140)" fill-opacity="0.1"/>
<path d="M47.1919 0C43.7328 0.0233333 40.2738 0.0455 36.8147 0.0665C26.2807 0.130452 15.7468 0.183584 5.2128 0.225897C2.55598 0.172957 0.181918 2.574 0.256639 5.21277C0.309389 20.3512 0.339793 35.4897 0.347851 50.6282C0.286048 53.2192 2.6231 55.5543 5.2128 55.491C5.2128 55.491 5.2128 55.491 5.2128 55.491C19.2058 55.491 33.1988 55.5101 47.1919 55.5482C49.8115 55.6203 52.1911 53.2623 52.1364 50.6282C52.1834 36.2193 52.2507 21.8103 52.3381 7.4014C52.3426 6.67185 52.347 5.94231 52.3516 5.21277C52.4367 2.46597 49.9699 -0.0475217 47.1919 0C49.9672 -0.0875051 52.5076 2.40629 52.4577 5.21277C52.4622 5.94231 52.4667 6.67185 52.4711 7.4014C52.5586 21.8103 52.6258 36.2193 52.6728 50.6282C52.7532 53.5474 50.1255 56.1966 47.1919 56.1337C33.1988 56.1719 19.2058 56.191 5.2128 56.191C2.24921 56.2626 -0.421014 53.5905 -0.34779 50.6282C-0.339732 35.4897 -0.309328 20.3512 -0.256578 5.21277C-0.316882 2.29825 2.31635 -0.307982 5.2128 -0.225897C15.7468 -0.183584 26.2807 -0.130452 36.8147 -0.0665C40.2738 -0.0455 43.7328 -0.0233333 47.1919 0Z" fill="white" fill-opacity="0.5" mask="url(#path-1-inside-1_224_140)"/>
<mask id="mask0_224_140" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="14" y="20" width="26" height="16">
<path d="M24.9025 22.8357C24.9025 21.1714 22.9884 20.2352 21.6746 21.2569L14.8809 26.541C13.8514 27.3417 13.8514 28.8977 14.8809 29.6984L21.6746 34.9824C22.9884 36.0042 24.9025 35.068 24.9025 33.4037L24.9025 22.8357Z" fill="white"/>
<path d="M39.632 22.8357C39.632 21.1714 37.7178 20.2352 36.4041 21.2569L29.6104 26.541C28.5809 27.3417 28.5809 28.8977 29.6104 29.6984L36.4041 34.9824C37.7178 36.0042 39.632 35.068 39.632 33.4037L39.632 22.8357Z" fill="white"/>
</mask>
<g mask="url(#mask0_224_140)">
<path d="M24.9025 22.8357C24.9025 21.1714 22.9884 20.2352 21.6746 21.2569L14.8809 26.541C13.8514 27.3417 13.8514 28.8977 14.8809 29.6984L21.6746 34.9824C22.9884 36.0042 24.9025 35.068 24.9025 33.4037L24.9025 22.8357Z" fill="white"/>
<path d="M39.632 22.8357C39.632 21.1714 37.7178 20.2352 36.4041 21.2569L29.6104 26.541C28.5809 27.3417 28.5809 28.8977 29.6104 29.6984L36.4041 34.9824C37.7178 36.0042 39.632 35.068 39.632 33.4037L39.632 22.8357Z" fill="white"/>
<path d="M26.9868 18.5405L10.4579 24.3087L13.548 31.5189L27.7625 22.0426L26.9868 18.5405Z" fill="url(#paint4_linear_224_140)" fill-opacity="0.49"/>
<path d="M41.4073 18.5405H27.9686V31.5189L42.183 22.0426L41.4073 18.5405Z" fill="url(#paint5_linear_224_140)" fill-opacity="0.49"/>
</g>
<defs>
<linearGradient id="paint0_linear_224_140" x1="26.2023" y1="9.88832" x2="26.2023" y2="-2.67809" gradientUnits="userSpaceOnUse">
<stop offset="0.596054" stop-opacity="0"/>
<stop offset="0.596154"/>
</linearGradient>
<linearGradient id="paint1_linear_224_140" x1="26.2023" y1="46.3515" x2="26.2023" y2="55.841" gradientUnits="userSpaceOnUse">
<stop offset="0.754808" stop-opacity="0"/>
<stop offset="0.793269" stop-color="white"/>
</linearGradient>
<radialGradient id="paint2_radial_224_140" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(0.0789273 56.0338) rotate(15.1697) scale(60.6182 29.0284)">
<stop stop-color="white"/>
<stop offset="1" stop-opacity="0"/>
</radialGradient>
<radialGradient id="paint3_radial_224_140" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(50.1386 -2.67821e-06) rotate(113.58) scale(40.6841 81.564)">
<stop stop-color="white"/>
<stop offset="1" stop-opacity="0"/>
</radialGradient>
<linearGradient id="paint4_linear_224_140" x1="20.1403" y1="22.8666" x2="21.1703" y2="24.5147" gradientUnits="userSpaceOnUse">
<stop/>
<stop offset="1" stop-opacity="0"/>
</linearGradient>
<linearGradient id="paint5_linear_224_140" x1="34.5608" y1="22.8666" x2="35.5908" y2="24.5147" gradientUnits="userSpaceOnUse">
<stop/>
<stop offset="1" stop-opacity="0"/>
</linearGradient>
</defs>
</svg>`;

// Exact Anima fast-forward button SVG (53x56)
const fastForwardSvg = `<svg width="53" height="56" viewBox="0 0 53 56" fill="none" xmlns="http://www.w3.org/2000/svg">
<mask id="path-1-inside-1_224_147" fill="white">
<path d="M0 5.21277C0 2.33384 2.33383 0 5.21277 0H47.1918C50.0708 0 52.4046 2.33383 52.4046 5.21277V50.6282C52.4046 53.5071 50.0708 55.841 47.1918 55.841H5.21277C2.33384 55.841 0 53.5071 0 50.6282V5.21277Z"/>
</mask>
<path d="M0 5.21277C0 2.33384 2.33383 0 5.21277 0H47.1918C50.0708 0 52.4046 2.33383 52.4046 5.21277V50.6282C52.4046 53.5071 50.0708 55.841 47.1918 55.841H5.21277C2.33384 55.841 0 53.5071 0 50.6282V5.21277Z" fill="#262626"/>
<path d="M0 5.21277C0 2.33384 2.33383 0 5.21277 0H47.1918C50.0708 0 52.4046 2.33383 52.4046 5.21277V50.6282C52.4046 53.5071 50.0708 55.841 47.1918 55.841H5.21277C2.33384 55.841 0 53.5071 0 50.6282V5.21277Z" fill="url(#paint0_linear_224_147)" fill-opacity="0.2"/>
<path d="M0 5.21277C0 2.33384 2.33383 0 5.21277 0H47.1918C50.0708 0 52.4046 2.33383 52.4046 5.21277V50.6282C52.4046 53.5071 50.0708 55.841 47.1918 55.841H5.21277C2.33384 55.841 0 53.5071 0 50.6282V5.21277Z" fill="url(#paint1_linear_224_147)" fill-opacity="0.2"/>
<path d="M0 5.21277C0 2.33384 2.33383 0 5.21277 0H47.1918C50.0708 0 52.4046 2.33383 52.4046 5.21277V50.6282C52.4046 53.5071 50.0708 55.841 47.1918 55.841H5.21277C2.33384 55.841 0 53.5071 0 50.6282V5.21277Z" fill="url(#paint2_radial_224_147)" fill-opacity="0.1"/>
<path d="M0 5.21277C0 2.33384 2.33383 0 5.21277 0H47.1918C50.0708 0 52.4046 2.33383 52.4046 5.21277V50.6282C52.4046 53.5071 50.0708 55.841 47.1918 55.841H5.21277C2.33384 55.841 0 53.5071 0 50.6282V5.21277Z" fill="url(#paint3_radial_224_147)" fill-opacity="0.1"/>
<path d="M5.21277 0C8.67182 0.0333333 12.1309 0.065 15.5899 0.095C26.1239 0.18636 36.6579 0.262263 47.1918 0.32271C49.7973 0.276015 52.1158 2.63308 52.038 5.21277C51.9627 20.3512 51.9192 35.4897 51.9077 50.6282C51.9671 53.1396 49.7014 55.4025 47.1918 55.341C47.1918 55.341 47.1918 55.341 47.1918 55.341C33.1988 55.341 19.2058 55.3682 5.21277 55.4228C2.66039 55.4968 0.333966 53.2012 0.383142 50.6282C0.316014 36.2193 0.219967 21.8103 0.095 7.4014C0.0886727 6.67185 0.0822713 5.94231 0.0757958 5.21277C-0.0169148 2.47875 2.43419 -0.0389538 5.21277 0C2.43806 -0.096073 -0.118112 2.3935 -0.0757958 5.21277C-0.0822713 5.94231 -0.0886727 6.67185 -0.095 7.4014C-0.219967 21.8103 -0.316014 36.2193 -0.383142 50.6282C-0.468991 53.6085 2.21187 56.3201 5.21277 56.2591C19.2058 56.3137 33.1988 56.341 47.1918 56.341C50.2355 56.4144 52.9772 53.6701 52.9015 50.6282C52.89 35.4897 52.8465 20.3512 52.7712 5.21277C52.8284 2.23916 50.1396 -0.41104 47.1918 -0.32271C36.6579 -0.262263 26.1239 -0.18636 15.5899 -0.095C12.1309 -0.065 8.67182 -0.0333333 5.21277 0Z" fill="white" fill-opacity="0.5" mask="url(#path-1-inside-1_224_147)"/>
<mask id="mask0_224_147" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="14" y="20" width="26" height="16">
<path d="M29.15 22.8357C29.15 21.1714 31.0641 20.2352 32.3779 21.2569L39.1716 26.541C40.2011 27.3417 40.2011 28.8977 39.1716 29.6984L32.3779 34.9824C31.0641 36.0042 29.15 35.068 29.15 33.4037L29.15 22.8357Z" fill="white"/>
<path d="M14.4205 22.8357C14.4205 21.1714 16.3347 20.2352 17.6484 21.2569L24.4421 26.541C25.4716 27.3417 25.4716 28.8977 24.4421 29.6984L17.6484 34.9824C16.3347 36.0042 14.4205 35.068 14.4205 33.4037L14.4205 22.8357Z" fill="white"/>
</mask>
<g mask="url(#mask0_224_147)">
<path d="M29.15 22.8357C29.15 21.1714 31.0641 20.2352 32.3779 21.2569L39.1716 26.541C40.2011 27.3417 40.2011 28.8977 39.1716 29.6984L32.3779 34.9824C31.0641 36.0042 29.15 35.068 29.15 33.4037L29.15 22.8357Z" fill="white"/>
<path d="M14.4205 22.8357C14.4205 21.1714 16.3347 20.2352 17.6484 21.2569L24.4421 26.541C25.4716 27.3417 25.4716 28.8977 24.4421 29.6984L17.6484 34.9824C16.3347 36.0042 14.4205 35.068 14.4205 33.4037L14.4205 22.8357Z" fill="white"/>
<path d="M27.0657 18.5405L43.5945 24.3087L40.5044 31.5189L26.29 22.0426L27.0657 18.5405Z" fill="url(#paint4_linear_224_147)" fill-opacity="0.49"/>
<path d="M12.6449 18.5405H26.0836V31.5189L11.8692 22.0426L12.6449 18.5405Z" fill="url(#paint5_linear_224_147)" fill-opacity="0.49"/>
</g>
<defs>
<linearGradient id="paint0_linear_224_147" x1="26.2023" y1="9.88832" x2="26.2023" y2="-2.67809" gradientUnits="userSpaceOnUse">
<stop offset="0.596054" stop-opacity="0"/>
<stop offset="0.596154"/>
</linearGradient>
<linearGradient id="paint1_linear_224_147" x1="26.2023" y1="46.3515" x2="26.2023" y2="55.841" gradientUnits="userSpaceOnUse">
<stop offset="0.754808" stop-opacity="0"/>
<stop offset="0.793269" stop-color="white"/>
</linearGradient>
<radialGradient id="paint2_radial_224_147" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(52.3257 56.0338) rotate(164.83) scale(60.6182 29.0284)">
<stop stop-color="white"/>
<stop offset="1" stop-opacity="0"/>
</radialGradient>
<radialGradient id="paint3_radial_224_147" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(26.29 -3.50211) rotate(90) scale(42.2314 84.666)">
<stop stop-color="white"/>
<stop offset="1" stop-opacity="0"/>
</radialGradient>
<linearGradient id="paint4_linear_224_147" x1="33.9122" y1="22.8666" x2="32.8822" y2="24.5147" gradientUnits="userSpaceOnUse">
<stop/>
<stop offset="1" stop-opacity="0"/>
</linearGradient>
<linearGradient id="paint5_linear_224_147" x1="19.4914" y1="22.8666" x2="18.4614" y2="24.5147" gradientUnits="userSpaceOnUse">
<stop/>
<stop offset="1" stop-opacity="0"/>
</linearGradient>
</defs>
</svg>`;


interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSkipForward: () => void;
  onSkipBackward: () => void;
  disabled?: boolean;
}

export function PlaybackControls({
  isPlaying,
  onPlay,
  onPause,
  onSkipForward,
  onSkipBackward,
  disabled = false,
}: PlaybackControlsProps) {
  const handlePlayPause = () => {
    if (isPlaying) {
      onPause();
    } else {
      onPlay();
    }
  };

  // Anima dimensions
  const buttonWidth = scale(55);
  const buttonHeight = scale(55);
  const gap = scale(5);

  return (
    <View style={styles.container}>
      {/* Rewind - exact Anima SVG */}
      <TouchableOpacity
        onPress={onSkipBackward}
        disabled={disabled}
        activeOpacity={0.7}
        style={styles.button}
      >
        <SvgXml xml={rewindSvg} width={buttonWidth} height={buttonHeight} />
      </TouchableOpacity>

      <View style={{ width: gap }} />

      {/* Fast Forward - exact Anima SVG */}
      <TouchableOpacity
        onPress={onSkipForward}
        disabled={disabled}
        activeOpacity={0.7}
        style={styles.button}
      >
        <SvgXml xml={fastForwardSvg} width={buttonWidth} height={buttonHeight} />
      </TouchableOpacity>

      <View style={{ width: gap }} />

      {/* Play/Pause - PNG images with glow effects */}
      <TouchableOpacity
        onPress={handlePlayPause}
        disabled={disabled}
        activeOpacity={0.7}
        style={styles.button}
      >
        <Image
          source={isPlaying ? pauseButtonImage : playButtonImage}
          style={{ width: buttonWidth, height: buttonHeight }}
          contentFit="contain"
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    // No additional styling - SVG handles all appearance
  },
});
