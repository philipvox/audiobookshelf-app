/**
 * CassetteCover.tsx
 *
 * A drop-in replacement for cover images that adds a cassette tape overlay.
 * Use this in NowPlayingCard and PlayerScreen where you'd normally show a cover.
 */

import React, { useRef, useEffect, useMemo, memo } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, {
  Path,
  Circle,
  Line,
  Defs,
  LinearGradient,
  Stop,
  Rect,
  ClipPath,
  Image as SvgImage,
} from 'react-native-svg';

interface CassetteCoverProps {
  /** Cover image URL */
  coverUrl: string;
  /** Playback progress (0-1) - controls tape spool sizes */
  progress?: number;
  /** Whether audio is playing - controls spindle rotation */
  isPlaying?: boolean;
  /** Fast forwarding - spins faster */
  isFastForward?: boolean;
  /** Rewinding - spins faster in reverse */
  isRewinding?: boolean;
  /** Width of the component (height calculated automatically) */
  width: number;
}

// Base dimensions for calculations
const BASE_WIDTH = 263;
const BASE_HEIGHT = 280;
const MIN_SPOOL = 38;
const MAX_SPOOL = 160;

// Cassette pill dimensions
const PILL_TOP = 203;
const PILL_LEFT = 20;
const PILL_WIDTH = 223;
const PILL_HEIGHT = 51;
const PILL_RADIUS = 25.5;

// Spindle positions
const LEFT_SPINDLE_CENTER_X = 29;
const RIGHT_SPINDLE_CENTER_X = 194;
const SPINDLE_CENTER_Y = 25.5;
const SPINDLE_SIZE = 38;

// Memoized Spindle component
const Spindle = memo(({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 38 38">
    <Circle cx={19} cy={19} r={14} stroke="#AAAAAA" strokeWidth={1.5} fill="none" />
    <Circle cx={19} cy={19} r={9} stroke="#AAAAAA" strokeWidth={1} fill="none" />
    <Circle cx={19} cy={19} r={5} fill="#AAAAAA" />
    <Circle cx={19} cy={19} r={2} fill="#666666" />
    <Line x1={10} y1={12} x2={14} y2={14} stroke="#AAAAAA" strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={14} y1={28} x2={16} y2={25} stroke="#AAAAAA" strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={26} y1={18} x2={30} y2={17.5} stroke="#AAAAAA" strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
));

export const CassetteCover: React.FC<CassetteCoverProps> = memo(({
  coverUrl,
  progress = 0,
  isPlaying = false,
  isFastForward = false,
  isRewinding = false,
  width,
}) => {
  // Calculate scale based on width
  const scale = width / BASE_WIDTH;
  const height = BASE_HEIGHT * scale;

  const s = (size: number) => size * scale;

  // Animated progress for smooth spool size transitions
  const progressAnim = useRef(new Animated.Value(progress)).current;

  // Animate progress changes
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false, // Can't use native driver for layout properties
    }).start();
  }, [progress]);

  // Spindle rotation animation
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Determine spin state and speed
  const shouldSpin = isPlaying || isFastForward || isRewinding;
  const spinSpeed = isFastForward || isRewinding ? 200 : 1500;
  const spinDirection = isRewinding ? -1 : 1;

  useEffect(() => {
    if (shouldSpin) {
      spinAnim.setValue(0);
      spinAnimationRef.current = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: spinDirection,
          duration: spinSpeed,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spinAnimationRef.current.start();
    } else {
      if (spinAnimationRef.current) {
        spinAnimationRef.current.stop();
        spinAnimationRef.current = null;
      }
    }

    return () => {
      if (spinAnimationRef.current) {
        spinAnimationRef.current.stop();
      }
    };
  }, [shouldSpin, spinSpeed, spinDirection]);

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-360deg', '0deg', '360deg'],
  });

  const spindleSize = useMemo(() => s(SPINDLE_SIZE), [scale]);

  // Animated spool sizes - interpolate from progress
  const leftSizeAnim = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [s(MAX_SPOOL), s(MIN_SPOOL)],
  });
  const rightSizeAnim = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [s(MIN_SPOOL), s(MAX_SPOOL)],
  });

  // Animated positions (centered within spindle container)
  const leftOffsetAnim = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [s((SPINDLE_SIZE - MAX_SPOOL) / 2), s((SPINDLE_SIZE - MIN_SPOOL) / 2)],
  });
  const rightOffsetAnim = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [s((SPINDLE_SIZE - MIN_SPOOL) / 2), s((SPINDLE_SIZE - MAX_SPOOL) / 2)],
  });

  // Animated border radius
  const leftRadiusAnim = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [s(MAX_SPOOL / 2), s(MIN_SPOOL / 2)],
  });
  const rightRadiusAnim = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [s(MIN_SPOOL / 2), s(MAX_SPOOL / 2)],
  });

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Cover image with pill cutout */}
      <View style={[styles.coverContainer, { width, height }]}>
        <Svg width={width} height={height} viewBox="0 0 263 280">
          <Defs>
            <ClipPath id="cassetteCoverClip">
              <Path
                d="M8.79 0C3.936 0 0 3.936 0 8.79V271.21C0 276.064 3.936 280 8.79 280H254.21C259.064 280 263 276.064 263 271.21V8.79C263 3.936 259.064 0 254.21 0H8.79ZM45.42 203C31.381 203 20 214.381 20 228.42C20 242.459 31.381 253.84 45.42 253.84H217.58C231.619 253.84 243 242.459 243 228.42C243 214.381 231.619 203 217.58 203H45.42Z"
                fillRule="evenodd"
                clipRule="evenodd"
              />
            </ClipPath>
          </Defs>
          <SvgImage
            href={coverUrl}
            width={263}
            height={280}
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#cassetteCoverClip)"
          />
        </Svg>
      </View>

      {/* Cassette pill area */}
      <View style={[
        styles.cassetteContainer,
        {
          top: s(PILL_TOP),
          left: s(PILL_LEFT),
          width: s(PILL_WIDTH),
          height: s(PILL_HEIGHT),
          borderRadius: s(PILL_RADIUS),
        }
      ]}>
        {/* Subtle dark background */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.15)' }]} />

        {/* Left Reel */}
        <View style={[
          styles.reelContainer,
          {
            left: s(LEFT_SPINDLE_CENTER_X - SPINDLE_SIZE / 2),
            top: s(SPINDLE_CENTER_Y - SPINDLE_SIZE / 2),
            width: s(SPINDLE_SIZE),
            height: s(SPINDLE_SIZE),
          }
        ]}>
          <Animated.View
            style={[
              styles.tapeSpool,
              {
                width: leftSizeAnim,
                height: leftSizeAnim,
                borderRadius: leftRadiusAnim,
                left: leftOffsetAnim,
                top: leftOffsetAnim,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.spindle,
              {
                width: spindleSize,
                height: spindleSize,
                transform: [{ rotate: spinInterpolate }],
              }
            ]}
          >
            <Spindle size={spindleSize} />
          </Animated.View>
        </View>

        {/* Right Reel */}
        <View style={[
          styles.reelContainer,
          {
            left: s(RIGHT_SPINDLE_CENTER_X - SPINDLE_SIZE / 2),
            top: s(SPINDLE_CENTER_Y - SPINDLE_SIZE / 2),
            width: s(SPINDLE_SIZE),
            height: s(SPINDLE_SIZE),
          }
        ]}>
          <Animated.View
            style={[
              styles.tapeSpool,
              {
                width: rightSizeAnim,
                height: rightSizeAnim,
                borderRadius: rightRadiusAnim,
                left: rightOffsetAnim,
                top: rightOffsetAnim,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.spindle,
              {
                width: spindleSize,
                height: spindleSize,
                transform: [{ rotate: spinInterpolate }],
              }
            ]}
          >
            <Spindle size={spindleSize} />
          </Animated.View>
        </View>

        {/* Blur panels */}
        <View style={[
          styles.blurPanel,
          {
            left: 0,
            top: 0,
            width: s(74),
            height: s(PILL_HEIGHT),
            borderTopLeftRadius: s(PILL_RADIUS),
            borderBottomLeftRadius: s(PILL_RADIUS),
          }
        ]}>
          <BlurView style={StyleSheet.absoluteFill} intensity={10} tint="dark" />
        </View>

        <View style={[
          styles.blurPanel,
          {
            right: 0,
            top: 0,
            width: s(74),
            height: s(PILL_HEIGHT),
            borderTopRightRadius: s(PILL_RADIUS),
            borderBottomRightRadius: s(PILL_RADIUS),
          }
        ]}>
          <BlurView style={StyleSheet.absoluteFill} intensity={10} tint="dark" />
        </View>

        <View style={[styles.blurPanel, { left: s(74), top: 0, width: s(75), height: s(16) }]}>
          <BlurView style={StyleSheet.absoluteFill} intensity={10} tint="dark" />
        </View>

        <View style={[styles.blurPanel, { left: s(74), bottom: 0, width: s(75), height: s(16) }]}>
          <BlurView style={StyleSheet.absoluteFill} intensity={10} tint="dark" />
        </View>
      </View>

      {/* Pill stroke */}
      <View style={[
        styles.strokeLayer,
        {
          top: s(PILL_TOP),
          left: s(PILL_LEFT),
          width: s(PILL_WIDTH),
          height: s(PILL_HEIGHT),
        }
      ]}>
        <Svg width={s(PILL_WIDTH)} height={s(PILL_HEIGHT)} viewBox="0 0 223 51">
          <Defs>
            <LinearGradient id="cassettePillStroke" x1="111.5" y1="0" x2="111.5" y2="51" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#000000" stopOpacity={0.4} />
              <Stop offset="1" stopColor="#ffffff" stopOpacity={0.3} />
            </LinearGradient>
          </Defs>
          <Rect
            x={0.5}
            y={0.5}
            width={222}
            height={50}
            rx={25}
            stroke="url(#cassettePillStroke)"
            strokeWidth={1.5}
            fill="none"
          />
        </Svg>
      </View>

      {/* Tape window stroke */}
      <View style={[
        styles.strokeLayer,
        {
          top: s(PILL_TOP + 16),
          left: s(PILL_LEFT + 74),
          width: s(75),
          height: s(19),
        }
      ]}>
        <Svg width={s(75)} height={s(19)} viewBox="0 0 75 19">
          <Defs>
            <LinearGradient id="cassetteWindowStroke" x1="37.5" y1="0" x2="37.5" y2="19" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#000000" stopOpacity={0.3} />
              <Stop offset="1" stopColor="#ffffff" stopOpacity={0.2} />
            </LinearGradient>
          </Defs>
          <Rect
            x={0.5}
            y={0.5}
            width={74}
            height={18}
            rx={9}
            stroke="url(#cassetteWindowStroke)"
            strokeWidth={1}
            fill="none"
          />
        </Svg>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  coverContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 10,
  },
  cassetteContainer: {
    position: 'absolute',
    overflow: 'hidden',
    zIndex: 1,
  },
  reelContainer: {
    position: 'absolute',
  },
  tapeSpool: {
    position: 'absolute',
    backgroundColor: '#0a0a0a',
  },
  spindle: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  blurPanel: {
    position: 'absolute',
    overflow: 'hidden',
  },
  strokeLayer: {
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: 20,
  },
});

export default CassetteCover;
