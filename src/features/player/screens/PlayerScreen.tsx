/**
 * src/features/player/screens/PlayerScreen.tsx
 * 
 * Full screen player with live animated waveform.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
  Platform,
  ScrollView,
  TextInput,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getColors } from 'react-native-image-colors';
import Svg, { Path } from 'react-native-svg';
import { 
  useAudioPlayer, 
  useAudioPlayerStatus,
  useAudioSampleListener,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import { usePlayerStore } from '../stores/playerStore';
import { apiClient } from '@/core/api';
import { Icon } from '@/shared/components/Icon';
import { theme } from '@/shared/theme';
import { getTitle } from '@/shared/utils/metadata';
import { matchToPalette } from '@/shared/utils/colorPalette';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_MARGIN = 5;
const CARD_WIDTH = SCREEN_WIDTH - CARD_MARGIN * 2;
const BUTTON_GAP = 5;
const BUTTON_SIZE = (CARD_WIDTH - BUTTON_GAP * 2) / 3;
const COVER_SIZE = CARD_WIDTH - 20;
const RADIUS = 5;
const WAVEFORM_WIDTH = CARD_WIDTH - 20;
const WAVEFORM_HEIGHT = 35;
const NUM_POINTS = 10;

// Custom Slider component
function CustomSlider({
  value,
  onValueChange,
  minimumValue = 0,
  maximumValue = 1,
  step = 0.01,
  trackColor = '#fff',
  thumbColor = '#fff',
}: {
  value: number;
  onValueChange: (val: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  trackColor?: string;
  thumbColor?: string;
}) {
  const sliderWidth = COVER_SIZE - 32;
  const thumbSize = 28;
  
  const valueToPosition = (val: number) => {
    const percent = (val - minimumValue) / (maximumValue - minimumValue);
    return percent * (sliderWidth - thumbSize);
  };
  
  const positionToValue = (pos: number) => {
    const percent = pos / (sliderWidth - thumbSize);
    let val = minimumValue + percent * (maximumValue - minimumValue);
    if (step > 0) {
      val = Math.round(val / step) * step;
    }
    return Math.max(minimumValue, Math.min(maximumValue, val));
  };

  const pan = useRef(new Animated.Value(valueToPosition(value))).current;
  
  useEffect(() => {
    pan.setValue(valueToPosition(value));
  }, [value]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.extractOffset();
      },
      onPanResponderMove: (_, gesture) => {
        const newPos = Math.max(0, Math.min(sliderWidth - thumbSize, gesture.dx + (pan as any)._offset));
        pan.setValue(newPos - (pan as any)._offset);
        onValueChange(positionToValue(newPos));
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  const fillWidth = pan.interpolate({
    inputRange: [0, sliderWidth - thumbSize],
    outputRange: [thumbSize / 2, sliderWidth - thumbSize / 2],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ width: sliderWidth, height: 40, justifyContent: 'center' }}>
      {/* Track background */}
      <View style={{
        position: 'absolute',
        left: 0,
        right: 0,
        height: 6,
        backgroundColor: 'rgba(128,128,128,0.3)',
        borderRadius: 3,
      }} />
      {/* Track fill */}
      <Animated.View style={{
        position: 'absolute',
        left: 0,
        width: fillWidth,
        height: 6,
        backgroundColor: trackColor,
        borderRadius: 3,
      }} />
      {/* Thumb */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          position: 'absolute',
          left: 0,
          transform: [{ translateX: pan }],
          width: thumbSize,
          height: thumbSize,
          borderRadius: thumbSize / 2,
          backgroundColor: thumbColor,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
        }}
      />
    </View>
  );
}

// Real-time Audio Waveform - single line
function AudioWaveform({ 
  audioUrl, 
  color, 
  isPlaying,
  currentPosition,
}: { 
  audioUrl: string; 
  color: string;
  isPlaying: boolean;
  currentPosition: number;
}) {
  const [points, setPoints] = useState<number[]>(() => Array(NUM_POINTS).fill(0.5));
  const pointsRef = useRef<number[]>(Array(NUM_POINTS).fill(0.5));
  const animFrameRef = useRef<number | null>(null);
  const lastSyncRef = useRef(0);
  
  const player = useAudioPlayer(audioUrl);
  const status = useAudioPlayerStatus(player);

  // Request permission for Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      requestRecordingPermissionsAsync().catch(() => {});
    }
  }, []);

  // Mute this player - it's only for visualization
  useEffect(() => {
    if (player) {
      player.volume = 0;
    }
  }, [player]);

  // Sync position with main player periodically
  useEffect(() => {
    const now = Date.now();
    if (now - lastSyncRef.current > 5000 && player && Math.abs((status.currentTime || 0) - currentPosition) > 2) {
      lastSyncRef.current = now;
      player.seekTo(currentPosition).catch(() => {});
    }
  }, [currentPosition, player, status.currentTime]);

  // Sync play/pause with main player
  useEffect(() => {
    if (!player) return;
    
    try {
      if (isPlaying && !status.playing) {
        player.play();
      } else if (!isPlaying && status.playing) {
        player.pause();
      }
    } catch (e) {
      console.log('Waveform player sync error:', e);
    }
  }, [isPlaying, status.playing, player]);

  // Listen to audio samples for visualization
  useAudioSampleListener(player, (sample) => {
    if (!sample.channels || sample.channels.length === 0) return;
    
    const frames = sample.channels[0]?.frames;
    if (!frames || frames.length === 0) return;

    const chunkSize = Math.max(1, Math.floor(frames.length / NUM_POINTS));
    const newPoints: number[] = [];
    
    for (let i = 0; i < NUM_POINTS; i++) {
      const idx = Math.floor(i * chunkSize);
      const value = frames[idx] || 0;
      // Amplify for visibility
      const amplified = value * 4;
      newPoints.push(0.5 + Math.max(-0.45, Math.min(0.45, amplified)));
    }
    
    pointsRef.current = newPoints;
  });

  // Smooth animation loop
  useEffect(() => {
    const animate = () => {
      setPoints(prev => prev.map((p, i) => p + (pointsRef.current[i] - p) * 1));
      animFrameRef.current = requestAnimationFrame(animate);
    };
    
    animFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Build smooth wavy path
  const buildPath = (): string => {
    const midY = WAVEFORM_HEIGHT / 2;
    const amplitude = WAVEFORM_HEIGHT / 2 - 4;
    
    let path = `M 0 ${midY}`;
    const allPoints = [0.5, ...points, 0.5];
    
    for (let i = 1; i < allPoints.length; i++) {
      const x = (i / (allPoints.length - 1)) * WAVEFORM_WIDTH;
      const y = midY + (allPoints[i] - 0.5) * 2 * amplitude;
      const prevX = ((i - 1) / (allPoints.length - 1)) * WAVEFORM_WIDTH;
      const prevY = midY + (allPoints[i - 1] - 0.5) * 2 * amplitude;
      
      const cpX = (prevX + x) / 2;
      path += ` C ${cpX} ${prevY} ${cpX} ${y} ${x} ${y}`;
    }
    
    return path;
  };

  return (
    <View style={styles.waveformContainer}>
      <Svg width={WAVEFORM_WIDTH} height={WAVEFORM_HEIGHT}>
        <Path
          d={buildPath()}
          stroke={color}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

function isColorLight(hex: string): boolean {
  const color = hex.replace('#', '');
  if (color.length !== 6) return true;
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const color = hex.replace('#', '');
  if (color.length !== 6) return null;
  return {
    r: parseInt(color.substr(0, 2), 16),
    g: parseInt(color.substr(2, 2), 16),
    b: parseInt(color.substr(4, 2), 16),
  };
}

function getColorSaturation(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const { r, g, b } = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

function pickMostSaturated(colors: (string | undefined)[]): string | null {
  let best: string | null = null;
  let bestSat = -1;
  for (const c of colors) {
    if (!c) continue;
    const sat = getColorSaturation(c);
    if (sat > bestSat) {
      bestSat = sat;
      best = c;
    }
  }
  return best;
}

export function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const [cardColor, setCardColor] = useState(theme.colors.neutral[300]);
  const [isLight, setIsLight] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flipMode, setFlipMode] = useState<'details' | 'speed' | 'sleep' | 'chapters' | 'settings'>('details');
  const [tempSpeed, setTempSpeed] = useState(1);
  const [tempSleepMins, setTempSleepMins] = useState(15);
  const [sleepInputValue, setSleepInputValue] = useState('15');
  const [controlMode, setControlMode] = useState<'rewind' | 'chapter'>('rewind');
  const [progressMode, setProgressMode] = useState<'bar' | 'chapters'>('bar');
  const [isRewinding, setIsRewinding] = useState(false);
  const [isFastForwarding, setIsFastForwarding] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const flipAnim = useRef(new Animated.Value(0)).current;
  const rewindInterval = useRef<NodeJS.Timeout | null>(null);
  const ffInterval = useRef<NodeJS.Timeout | null>(null);
  const seekingPos = useRef(0);
  const wasPlaying = useRef(false);
  const isSeeking = useRef(false);
  const startPosition = useRef(0);
  const [seekDelta, setSeekDelta] = useState(0);

  const {
    currentBook,
    isPlayerVisible,
    isPlaying,
    isLoading,
    position,
    duration: storeDuration,
    playbackRate,
    sleepTimer,
    closePlayer,
    play,
    pause,
    seekTo,
  } = usePlayerStore();

  const coverUrl = currentBook ? apiClient.getItemCoverUrl(currentBook.id) : '';

  // Get audio URL for waveform visualization
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  useEffect(() => {
    const getAudioUrl = async () => {
      if (!currentBook?.media?.audioFiles?.length) {
        setAudioUrl(null);
        return;
      }
      
      try {
        const { authService } = await import('@/core/auth');
        const token = await authService.getStoredToken();
        const baseUrl = apiClient.getBaseURL();
        const audioFile = currentBook.media.audioFiles[0];
        const url = `${baseUrl}/api/items/${currentBook.id}/file/${audioFile.ino}?token=${token}`;
        setAudioUrl(url);
      } catch (e) {
        setAudioUrl(null);
      }
    };
    
    getAudioUrl();
  }, [currentBook?.id]);

  // Extract color same way as home cards
  useEffect(() => {
    if (!coverUrl || !currentBook) return;
    let mounted = true;

    const extractColors = async () => {
      try {
        const result = await getColors(coverUrl, {
          fallback: theme.colors.neutral[200],
          cache: true,
          key: currentBook.id,
        });

        if (!mounted) return;

        let dominant = theme.colors.neutral[200];

        if (result.platform === 'ios') {
          dominant = result.detail || result.primary || result.secondary || theme.colors.neutral[200];
        } else if (result.platform === 'android') {
          const candidates = [
            result.vibrant,
            result.darkVibrant, 
            result.lightVibrant,
            result.muted,
            result.darkMuted,
            result.lightMuted,
            result.dominant,
          ];
          dominant = pickMostSaturated(candidates) || result.dominant || theme.colors.neutral[200];
        }

        // Match to palette
        const paletteColor = matchToPalette(dominant);
        setCardColor(paletteColor);
        setIsLight(isColorLight(paletteColor));
      } catch (err) {
        console.log('Color extraction error:', err);
      }
    };

    extractColors();
    return () => { mounted = false; };
  }, [coverUrl, currentBook?.id]);

  // Slide up animation
  useEffect(() => {
    if (isPlayerVisible && currentBook) {
      slideAnim.setValue(SCREEN_HEIGHT);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 55,
        friction: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [isPlayerVisible, currentBook?.id]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (rewindInterval.current) clearInterval(rewindInterval.current);
      if (ffInterval.current) clearInterval(ffInterval.current);
    };
  }, []);

  // Sync seeking position with current position
  useEffect(() => {
    seekingPos.current = position;
  }, [position]);

  // Format sleep timer display (sleepTimer is already in seconds from store)
  const formatSleepTimer = (seconds: number): string => {
    if (seconds === -1) return '⏸'; // End of chapter mode
    if (seconds <= 0) {
      return `${seconds}s`;
    }
    const mins = Math.ceil(seconds / 60);
    return `${mins}m`;
  };

  const handleClose = () => {
    // Stop any active rewind/ff
    if (rewindInterval.current) {
      clearInterval(rewindInterval.current);
      rewindInterval.current = null;
    }
    if (ffInterval.current) {
      clearInterval(ffInterval.current);
      ffInterval.current = null;
    }
    setIsRewinding(false);
    setIsFastForwarding(false);
    isSeeking.current = false;
    setSeekDelta(0);
    
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      closePlayer();
      setIsFlipped(false);
      setFlipMode('details');
      flipAnim.setValue(0);
    });
  };

  const handleFlip = (mode: 'details' | 'speed' | 'sleep' | 'chapters' | 'settings' = 'details') => {
    if (isFlipped && flipMode === mode) {
      // Flip back to front
      setIsFlipped(false);
      Animated.timing(flipAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else if (isFlipped && flipMode !== mode) {
      // Already flipped, just change mode
      setFlipMode(mode);
      if (mode === 'speed') {
        setTempSpeed(playbackRate);
      }
    } else {
      // Flip to back with mode
      setFlipMode(mode);
      if (mode === 'speed') {
        setTempSpeed(playbackRate);
      }
      setIsFlipped(true);
      Animated.timing(flipAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleFlipBack = () => {
    setIsFlipped(false);
    Animated.timing(flipAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Flip interpolations - crossfade
  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  if (!isPlayerVisible || !currentBook) {
    return null;
  }

  const title = getTitle(currentBook);
  const chapters = currentBook.media?.chapters || [];

  let bookDuration = currentBook.media?.duration || 0;
  if (bookDuration <= 0 && storeDuration > 0) {
    bookDuration = storeDuration;
  }
  if (bookDuration <= 0 && chapters.length > 0) {
    const lastChapter = chapters[chapters.length - 1];
    bookDuration = lastChapter.end || 0;
  }

  // Find current chapter
  const currentChapter = chapters.find((ch, idx) => {
    const next = chapters[idx + 1];
    return position >= ch.start && (!next || position < next.start);
  });
  const chapterIndex = currentChapter ? chapters.indexOf(currentChapter) + 1 : 1;
  const chapterTitle = `Chapter ${chapterIndex}`;

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDelta = (seconds: number): string => {
    const sign = seconds < 0 ? '-' : '+';
    const abs = Math.abs(Math.round(seconds));
    const mins = Math.floor(abs / 60);
    const secs = abs % 60;
    if (mins > 0) {
      return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${sign}${secs}s`;
  };

  const progress = bookDuration > 0 ? position / bookDuration : 0;

  // Calculate chapter progress
  const chapterStart = currentChapter?.start || 0;
  const chapterEnd = currentChapter?.end || bookDuration;
  const chapterDuration = chapterEnd - chapterStart;
  const chapterProgress = chapterDuration > 0 
    ? Math.max(0, Math.min(1, (position - chapterStart) / chapterDuration))
    : 0;

  const handlePlayPause = async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  };

  const handlePrevChapter = async () => {
    if (chapters.length === 0) return;
    const currentIdx = currentChapter ? chapters.indexOf(currentChapter) : 0;
    if (currentIdx > 0) {
      await seekTo(chapters[currentIdx - 1].start);
    } else {
      await seekTo(0);
    }
  };

  const handleNextChapter = async () => {
    if (chapters.length === 0) return;
    const currentIdx = currentChapter ? chapters.indexOf(currentChapter) : 0;
    if (currentIdx < chapters.length - 1) {
      await seekTo(chapters[currentIdx + 1].start);
    }
  };

  // Rewind/FF handlers - seek-based scrubbing
  const REWIND_STEP = 2; // seconds per tick
  const REWIND_INTERVAL = 80; // ms between ticks
  const FF_STEP = 5; // seconds per tick for fast forward

  const startRewind = async () => {
    if (isRewinding) return;
    
    setIsRewinding(true);
    wasPlaying.current = isPlaying;
    startPosition.current = position;
    seekingPos.current = position;
    isSeeking.current = false;
    setSeekDelta(0);
    
    await pause();
    
    const doRewind = () => {
      if (isSeeking.current) return;
      
      isSeeking.current = true;
      seekingPos.current = Math.max(0, seekingPos.current - REWIND_STEP);
      setSeekDelta(seekingPos.current - startPosition.current);
      
      seekTo(seekingPos.current).finally(() => {
        isSeeking.current = false;
        
        if (seekingPos.current <= 0 && rewindInterval.current) {
          clearInterval(rewindInterval.current);
          rewindInterval.current = null;
          setIsRewinding(false);
          setSeekDelta(0);
        }
      });
    };
    
    doRewind();
    rewindInterval.current = setInterval(doRewind, REWIND_INTERVAL);
  };

  const stopRewind = async () => {
    if (rewindInterval.current) {
      clearInterval(rewindInterval.current);
      rewindInterval.current = null;
    }
    setIsRewinding(false);
    isSeeking.current = false;
    setSeekDelta(0);
    
    if (wasPlaying.current) {
      await play();
    }
  };

  const startFastForward = async () => {
    if (isFastForwarding) return;
    
    const bookDur = storeDuration || currentBook?.media?.duration || 0;
    
    setIsFastForwarding(true);
    wasPlaying.current = isPlaying;
    startPosition.current = position;
    seekingPos.current = position;
    isSeeking.current = false;
    setSeekDelta(0);
    
    await pause();
    
    const doFF = () => {
      if (isSeeking.current) return;
      
      isSeeking.current = true;
      seekingPos.current = Math.min(bookDur - 1, seekingPos.current + FF_STEP);
      setSeekDelta(seekingPos.current - startPosition.current);
      
      seekTo(seekingPos.current).finally(() => {
        isSeeking.current = false;
        
        if (seekingPos.current >= bookDur - 1 && ffInterval.current) {
          clearInterval(ffInterval.current);
          ffInterval.current = null;
          setIsFastForwarding(false);
          setSeekDelta(0);
        }
      });
    };
    
    doFF();
    ffInterval.current = setInterval(doFF, REWIND_INTERVAL);
  };

  const stopFastForward = async () => {
    if (ffInterval.current) {
      clearInterval(ffInterval.current);
      ffInterval.current = null;
    }
    setIsFastForwarding(false);
    isSeeking.current = false;
    setSeekDelta(0);
    
    if (wasPlaying.current) {
      await play();
    }
  };

  // Handle left button (rewind or prev chapter)
  const handleLeftPressIn = () => {
    if (controlMode === 'rewind') {
      startRewind();
    }
  };

  const handleLeftPressOut = () => {
    if (controlMode === 'rewind') {
      stopRewind();
    }
  };

  const handleLeftPress = () => {
    if (controlMode === 'chapter') {
      handlePrevChapter();
    }
  };

  // Handle right button (fast forward or next chapter)
  const handleRightPressIn = () => {
    if (controlMode === 'rewind') {
      startFastForward();
    }
  };

  const handleRightPressOut = () => {
    if (controlMode === 'rewind') {
      stopFastForward();
    }
  };

  const handleRightPress = () => {
    if (controlMode === 'chapter') {
      handleNextChapter();
    }
  };

  // Scrub progress bar
  const handleProgressScrub = async (percent: number) => {
    const newPos = percent * bookDuration;
    await seekTo(newPos);
  };

  const textColor = isLight ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.9)';
  const secondaryColor = isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)';
  const waveColor = isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)';

  return (
    <Animated.View 
      style={[
        styles.container, 
        { transform: [{ translateY: slideAnim }] }
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Main content area */}
      <View style={[styles.mainContent, { paddingTop: insets.top + 8 }]}>
        {/* Card */}
        <View style={[styles.card, { backgroundColor: cardColor }]}>
          {/* Header - aligned with cover */}
          <View style={[styles.header, { marginHorizontal: -14 }]}>
            <View style={styles.headerLeft}>
              <Text style={[styles.title, { color: textColor }]} numberOfLines={3}>{title}</Text>
            </View>
            <View style={styles.headerCenter}>
              <TouchableOpacity 
                style={styles.chapterButton}
                onPress={() => handleFlip('chapters')}
              >
                <Text style={[styles.chapterLabel, { color: textColor }]}>{chapterTitle}</Text>
              </TouchableOpacity>
              <Text style={[styles.timeLabel, { color: secondaryColor }]}>{formatTime(position)}</Text>
              <Text style={[styles.timeLabel, { color: secondaryColor }]}>{formatTime(bookDuration)}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Icon name="chevron-down" size={24} color={textColor} set="ionicons" />
            </TouchableOpacity>
          </View>

          {/* Flippable Cover */}
          <View style={styles.coverContainer}>
            {/* Front - Cover Image */}
            <Animated.View 
              style={[
                styles.coverFace,
                { opacity: frontOpacity }
              ]}
              pointerEvents={isFlipped ? 'none' : 'auto'}
            >
              <Pressable onPress={() => handleFlip('details')}>
                <Image 
                  source={{ uri: coverUrl }} 
                  style={styles.cover} 
                  resizeMode="cover"
                />
              </Pressable>
            </Animated.View>

            {/* Back - Dynamic Content */}
            <Animated.View 
              style={[
                styles.coverFace,
                styles.coverBack,
                { 
                  backgroundColor: isLight ? 'rgba(0,0,0,0.95)' : 'rgba(255,255,255,0.98)',
                  opacity: backOpacity,
                }
              ]}
              pointerEvents={isFlipped ? 'auto' : 'none'}
            >
              {/* Close button */}
              <TouchableOpacity 
                style={styles.flipCloseButton}
                onPress={handleFlipBack}
              >
                <Icon name="close" size={24} color={isLight ? '#fff' : '#000'} set="ionicons" />
              </TouchableOpacity>

              {flipMode === 'details' && (
                <ScrollView 
                  style={styles.detailsScroll}
                  contentContainerStyle={styles.detailsContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={[styles.detailsTitle, { color: isLight ? '#fff' : '#000' }]}>
                    {title}
                  </Text>
                  
                  {currentBook?.media?.metadata?.authorName && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: isLight ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }]}>
                        Author
                      </Text>
                      <Text style={[styles.detailValue, { color: isLight ? '#fff' : '#000' }]}>
                        {currentBook.media.metadata.authorName}
                      </Text>
                    </View>
                  )}

                  {currentBook?.media?.metadata?.narratorName && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: isLight ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }]}>
                        Narrator
                      </Text>
                      <Text style={[styles.detailValue, { color: isLight ? '#fff' : '#000' }]}>
                        {currentBook.media.metadata.narratorName.replace('Narrated by: ', '')}
                      </Text>
                    </View>
                  )}

                  {currentBook?.media?.metadata?.seriesName && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: isLight ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }]}>
                        Series
                      </Text>
                      <Text style={[styles.detailValue, { color: isLight ? '#fff' : '#000' }]}>
                        {currentBook.media.metadata.seriesName}
                      </Text>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: isLight ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }]}>
                      Duration
                    </Text>
                    <Text style={[styles.detailValue, { color: isLight ? '#fff' : '#000' }]}>
                      {formatTime(bookDuration)}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: isLight ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }]}>
                      Chapters
                    </Text>
                    <Text style={[styles.detailValue, { color: isLight ? '#fff' : '#000' }]}>
                      {chapters.length}
                    </Text>
                  </View>

                  {currentBook?.media?.metadata?.description && (
                    <View style={[styles.detailRow, { marginTop: 12 }]}>
                      <Text style={[styles.detailLabel, { color: isLight ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }]}>
                        Description
                      </Text>
                      <Text 
                        style={[styles.detailDescription, { color: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)' }]}
                        numberOfLines={8}
                      >
                        {currentBook.media.metadata.description}
                      </Text>
                    </View>
                  )}
                </ScrollView>
              )}

              {flipMode === 'speed' && (
                <View style={styles.flipModeContent}>
                  <Text style={[styles.flipModeTitle, { color: isLight ? '#fff' : '#000' }]}>
                    Playback Speed
                  </Text>
                  
                  {/* Current value display */}
                  <View style={styles.sliderValueContainer}>
                    <Text style={[styles.sliderValueText, { color: isLight ? '#fff' : '#000' }]}>
                      {tempSpeed.toFixed(2)}x
                    </Text>
                  </View>

                  {/* Slider */}
                  <View style={styles.sliderContainer}>
                    <CustomSlider
                      value={tempSpeed}
                      onValueChange={setTempSpeed}
                      minimumValue={0.5}
                      maximumValue={3}
                      step={0.05}
                      trackColor={isLight ? '#fff' : '#000'}
                      thumbColor={isLight ? '#fff' : '#000'}
                    />
                    <View style={styles.sliderLabels}>
                      <Text style={[styles.sliderLabel, { color: isLight ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }]}>0.5x</Text>
                      <Text style={[styles.sliderLabel, { color: isLight ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }]}>1x</Text>
                      <Text style={[styles.sliderLabel, { color: isLight ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }]}>2x</Text>
                      <Text style={[styles.sliderLabel, { color: isLight ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }]}>3x</Text>
                    </View>
                  </View>

                  {/* Presets */}
                  <View style={styles.presetRow}>
                    {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
                      <TouchableOpacity
                        key={speed}
                        style={[
                          styles.presetButton,
                          { 
                            backgroundColor: Math.abs(tempSpeed - speed) < 0.01
                              ? (isLight ? '#fff' : '#000') 
                              : (isLight ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)')
                          }
                        ]}
                        onPress={() => setTempSpeed(speed)}
                      >
                        <Text style={[
                          styles.presetText,
                          { 
                            color: Math.abs(tempSpeed - speed) < 0.01
                              ? (isLight ? '#000' : '#fff') 
                              : (isLight ? '#fff' : '#000')
                          }
                        ]}>
                          {speed}x
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Apply button */}
                  <TouchableOpacity
                    style={[styles.applyButton, { backgroundColor: isLight ? '#fff' : '#000' }]}
                    onPress={() => {
                      usePlayerStore.getState().setPlaybackRate(tempSpeed);
                      handleFlipBack();
                    }}
                  >
                    <Text style={[styles.applyButtonText, { color: isLight ? '#000' : '#fff' }]}>
                      Apply
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {flipMode === 'sleep' && (
                <View style={styles.flipModeContent}>
                  <Text style={[styles.flipModeTitle, { color: isLight ? '#fff' : '#000' }]}>
                    Sleep Timer
                  </Text>
                  
                  {/* Current value display with input */}
                  <View style={styles.sliderValueContainer}>
                    <TextInput
                      style={[
                        styles.sleepInput,
                        { 
                          color: isLight ? '#fff' : '#000',
                          borderColor: isLight ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                        }
                      ]}
                      value={sleepInputValue}
                      onChangeText={(text) => {
                        setSleepInputValue(text);
                        const num = parseInt(text, 10);
                        if (!isNaN(num) && num >= 0 && num <= 120) {
                          setTempSleepMins(num);
                        }
                      }}
                      keyboardType="number-pad"
                      maxLength={3}
                      selectTextOnFocus
                    />
                    <Text style={[styles.sleepInputLabel, { color: isLight ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }]}>
                      minutes
                    </Text>
                  </View>

                  {/* Slider */}
                  <View style={styles.sliderContainer}>
                    <CustomSlider
                      value={tempSleepMins}
                      onValueChange={(val) => {
                        setTempSleepMins(val);
                        setSleepInputValue(String(Math.round(val)));
                      }}
                      minimumValue={0}
                      maximumValue={120}
                      step={5}
                      trackColor={isLight ? '#fff' : '#000'}
                      thumbColor={isLight ? '#fff' : '#000'}
                    />
                    <View style={styles.sliderLabels}>
                      <Text style={[styles.sliderLabel, { color: isLight ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }]}>Off</Text>
                      <Text style={[styles.sliderLabel, { color: isLight ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }]}>30m</Text>
                      <Text style={[styles.sliderLabel, { color: isLight ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }]}>1h</Text>
                      <Text style={[styles.sliderLabel, { color: isLight ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }]}>2h</Text>
                    </View>
                  </View>

                  {/* Presets */}
                  <View style={styles.presetRow}>
                    {[5, 15, 30, 45, 60].map((mins) => (
                      <TouchableOpacity
                        key={mins}
                        style={[
                          styles.presetButton,
                          { 
                            backgroundColor: tempSleepMins === mins
                              ? (isLight ? '#fff' : '#000') 
                              : (isLight ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)')
                          }
                        ]}
                        onPress={() => {
                          setTempSleepMins(mins);
                          setSleepInputValue(String(mins));
                        }}
                      >
                        <Text style={[
                          styles.presetText,
                          { 
                            color: tempSleepMins === mins
                              ? (isLight ? '#000' : '#fff') 
                              : (isLight ? '#fff' : '#000')
                          }
                        ]}>
                          {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Action buttons */}
                  <View style={styles.sleepActions}>
                    <TouchableOpacity
                      style={[styles.sleepActionButton, { backgroundColor: isLight ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]}
                      onPress={() => {
                        usePlayerStore.getState().clearSleepTimer?.();
                        handleFlipBack();
                      }}
                    >
                      <Text style={[styles.sleepActionText, { color: isLight ? '#fff' : '#000' }]}>
                        Off
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.applyButton, { flex: 1, backgroundColor: isLight ? '#fff' : '#000' }]}
                      onPress={() => {
                        if (tempSleepMins > 0) {
                          usePlayerStore.getState().setSleepTimer?.(tempSleepMins);
                        }
                        handleFlipBack();
                      }}
                    >
                      <Text style={[styles.applyButtonText, { color: isLight ? '#000' : '#fff' }]}>
                        Start Timer
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {flipMode === 'chapters' && (
                <View style={styles.flipModeContent}>
                  <Text style={[styles.flipModeTitle, { color: isLight ? '#fff' : '#000' }]}>
                    Chapters
                  </Text>
                  <ScrollView 
                    style={styles.chaptersScroll}
                    showsVerticalScrollIndicator={false}
                  >
                    {chapters.map((chapter, idx) => {
                      const isCurrentChapter = currentChapter === chapter;
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.chapterItem,
                            { backgroundColor: isCurrentChapter 
                              ? (isLight ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)') 
                              : 'transparent' 
                            }
                          ]}
                          onPress={() => {
                            seekTo(chapter.start);
                            handleFlipBack();
                          }}
                        >
                          <Text 
                            style={[
                              styles.chapterNumber, 
                              { color: isLight ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }
                            ]}
                          >
                            {idx + 1}
                          </Text>
                          <View style={styles.chapterInfo}>
                            <Text 
                              style={[
                                styles.chapterName, 
                                { color: isLight ? '#fff' : '#000' }
                              ]} 
                              numberOfLines={1}
                            >
                              {chapter.title || `Chapter ${idx + 1}`}
                            </Text>
                            <Text 
                              style={[
                                styles.chapterTime, 
                                { color: isLight ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }
                              ]}
                            >
                              {formatTime(chapter.start)}
                            </Text>
                          </View>
                          {isCurrentChapter && (
                            <Icon name="volume-high" size={16} color={isLight ? '#fff' : '#000'} set="ionicons" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {flipMode === 'settings' && (
                <ScrollView 
                  style={styles.flipModeContent}
                  contentContainerStyle={styles.settingsScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={[styles.flipModeTitle, { color: isLight ? '#fff' : '#000' }]}>
                    Settings
                  </Text>
                  
                  {/* Control Mode Toggle */}
                  <View style={styles.settingRow}>
                    <Text style={[styles.settingLabel, { color: isLight ? '#fff' : '#000' }]}>
                      Control Buttons
                    </Text>
                    <View style={styles.settingToggle}>
                      <TouchableOpacity
                        style={[
                          styles.settingOption,
                          { 
                            backgroundColor: controlMode === 'rewind' 
                              ? (isLight ? '#fff' : '#000') 
                              : 'transparent'
                          }
                        ]}
                        onPress={() => setControlMode('rewind')}
                      >
                        <Icon 
                          name="play-back" 
                          size={18} 
                          color={controlMode === 'rewind' ? (isLight ? '#000' : '#fff') : (isLight ? '#fff' : '#000')} 
                          set="ionicons" 
                        />
                        <Text style={[
                          styles.settingOptionText,
                          { color: controlMode === 'rewind' ? (isLight ? '#000' : '#fff') : (isLight ? '#fff' : '#000') }
                        ]}>
                          Rewind
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.settingOption,
                          { 
                            backgroundColor: controlMode === 'chapter' 
                              ? (isLight ? '#fff' : '#000') 
                              : 'transparent'
                          }
                        ]}
                        onPress={() => setControlMode('chapter')}
                      >
                        <Icon 
                          name="play-skip-forward" 
                          size={18} 
                          color={controlMode === 'chapter' ? (isLight ? '#000' : '#fff') : (isLight ? '#fff' : '#000')} 
                          set="ionicons" 
                        />
                        <Text style={[
                          styles.settingOptionText,
                          { color: controlMode === 'chapter' ? (isLight ? '#000' : '#fff') : (isLight ? '#fff' : '#000') }
                        ]}>
                          Chapter
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Progress Mode Toggle */}
                  <View style={styles.settingRow}>
                    <Text style={[styles.settingLabel, { color: isLight ? '#fff' : '#000' }]}>
                      Progress Display
                    </Text>
                    <View style={styles.settingToggle}>
                      <TouchableOpacity
                        style={[
                          styles.settingOption,
                          { 
                            backgroundColor: progressMode === 'bar' 
                              ? (isLight ? '#fff' : '#000') 
                              : 'transparent'
                          }
                        ]}
                        onPress={() => setProgressMode('bar')}
                      >
                        <Icon 
                          name="book" 
                          size={18} 
                          color={progressMode === 'bar' ? (isLight ? '#000' : '#fff') : (isLight ? '#fff' : '#000')} 
                          set="ionicons" 
                        />
                        <Text style={[
                          styles.settingOptionText,
                          { color: progressMode === 'bar' ? (isLight ? '#000' : '#fff') : (isLight ? '#fff' : '#000') }
                        ]}>
                          Book
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.settingOption,
                          { 
                            backgroundColor: progressMode === 'chapters' 
                              ? (isLight ? '#fff' : '#000') 
                              : 'transparent'
                          }
                        ]}
                        onPress={() => setProgressMode('chapters')}
                      >
                        <Icon 
                          name="bookmark" 
                          size={18} 
                          color={progressMode === 'chapters' ? (isLight ? '#000' : '#fff') : (isLight ? '#fff' : '#000')} 
                          set="ionicons" 
                        />
                        <Text style={[
                          styles.settingOptionText,
                          { color: progressMode === 'chapters' ? (isLight ? '#000' : '#fff') : (isLight ? '#fff' : '#000') }
                        ]}>
                          Chapter
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Chapters List Button */}
                  <TouchableOpacity
                    style={[styles.settingButton, { backgroundColor: isLight ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]}
                    onPress={() => setFlipMode('chapters')}
                  >
                    <Icon name="list" size={20} color={isLight ? '#fff' : '#000'} set="ionicons" />
                    <Text style={[styles.settingButtonText, { color: isLight ? '#fff' : '#000' }]}>
                      View Chapters
                    </Text>
                    <Icon name="chevron-forward" size={20} color={isLight ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'} set="ionicons" />
                  </TouchableOpacity>

                  {/* Book Details Button */}
                  <TouchableOpacity
                    style={[styles.settingButton, { backgroundColor: isLight ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]}
                    onPress={() => setFlipMode('details')}
                  >
                    <Icon name="book" size={20} color={isLight ? '#fff' : '#000'} set="ionicons" />
                    <Text style={[styles.settingButtonText, { color: isLight ? '#fff' : '#000' }]}>
                      Book Details
                    </Text>
                    <Icon name="chevron-forward" size={20} color={isLight ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'} set="ionicons" />
                  </TouchableOpacity>
                </ScrollView>
              )}
            </Animated.View>
          </View>

          {/* Live Audio Waveform */}
          {audioUrl && (
            <AudioWaveform 
              audioUrl={audioUrl} 
              color={waveColor} 
              isPlaying={isPlaying}
              currentPosition={position}
            />
          )}

          {/* Time labels with speed control */}
          <View style={styles.timeRow}>
            <View style={styles.timeLeft}>
              <TouchableOpacity 
                style={[styles.speedButton, { backgroundColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)' }]}
                onPress={() => handleFlip('speed')}
              >
                <Text style={[styles.speedLabel, { color: textColor }]}>{playbackRate}x</Text>
              </TouchableOpacity>
              <Text style={[styles.currentTime, { color: secondaryColor }]}>{formatTime(position)}</Text>
            </View>
            <Text style={[styles.totalTime, { color: secondaryColor }]}>{formatTime(bookDuration)}</Text>
          </View>
        </View>
        
        {/* Control buttons - directly under card */}
        <View style={styles.controlsRow}>
           <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: cardColor }]}
            onPress={handlePlayPause}
            activeOpacity={0.7}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="large" color={textColor} />
            ) : (isRewinding || isFastForwarding) ? (
              <Text style={[styles.seekDeltaText, { color: textColor }]}>
                {formatDelta(seekDelta)}
              </Text>
            ) : (
              <Icon 
                name={isPlaying ? 'pause' : 'play'} 
                size={45} 
                color={textColor} 
                set="ionicons" 
              />
            )}
          </TouchableOpacity>

          <Pressable 
            style={[styles.controlButton, { backgroundColor: cardColor, opacity: isRewinding ? 0.7 : 1 }]}
            onPress={handleLeftPress}
            onPressIn={handleLeftPressIn}
            onPressOut={handleLeftPressOut}
          >
            <Icon 
              name={controlMode === 'rewind' ? 'play-back' : 'play-skip-back'} 
              size={45} 
              color={textColor} 
              set="ionicons" 
            />
          </Pressable>

          <Pressable 
            style={[styles.controlButton, { backgroundColor: cardColor, opacity: isFastForwarding ? 0.7 : 1 }]}
            onPress={handleRightPress}
            onPressIn={handleRightPressIn}
            onPressOut={handleRightPressOut}
          >
            <Icon 
              name={controlMode === 'rewind' ? 'play-forward' : 'play-skip-forward'} 
              size={45} 
              color={textColor} 
              set="ionicons" 
            />
          </Pressable>
        </View>
      </View>

      {/* Bottom controls with progress bar */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 8 }]}>
        {/* Sleep button / countdown */}
        <TouchableOpacity 
          style={styles.bottomSideButton}
          onPress={() => handleFlip('sleep')}
        >
          {sleepTimer !== null ? (
            <Text style={styles.sleepCountdown}>
              {formatSleepTimer(sleepTimer)}
            </Text>
          ) : (
            <Icon name="moon" size={24} color="rgba(255,255,255,0.7)" set="ionicons" />
          )}
        </TouchableOpacity>

        {/* Progress bar or Chapter progress */}
        {progressMode === 'bar' ? (
          <Pressable 
            style={styles.progressContainer}
            onPress={(e) => {
              const { locationX } = e.nativeEvent;
              const containerWidth = SCREEN_WIDTH - 32 - 88; // minus padding and buttons
              const percent = Math.max(0, Math.min(1, locationX / containerWidth));
              handleProgressScrub(percent);
            }}
          >
            {/* Background track */}
            <View style={styles.progressTrack} />
            
            {/* Filled progress */}
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${progress * 100}%`,
                  backgroundColor: cardColor,
                }
              ]} 
            />
            
            {/* Red marker */}
            <View 
              style={[
                styles.progressMarker,
                { left: `${progress * 100}%` }
              ]} 
            />
          </Pressable>
        ) : (
          <Pressable 
            style={styles.progressContainer}
            onPress={(e) => {
              const { locationX } = e.nativeEvent;
              const containerWidth = SCREEN_WIDTH - 32 - 88;
              const percent = Math.max(0, Math.min(1, locationX / containerWidth));
              // Seek within current chapter
              const newPos = chapterStart + (percent * chapterDuration);
              seekTo(newPos);
            }}
          >
            {/* Background track */}
            <View style={styles.progressTrack} />
            
            {/* Filled progress - chapter progress */}
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${chapterProgress * 100}%`,
                  backgroundColor: cardColor,
                }
              ]} 
            />
            
            {/* Red marker */}
            <View 
              style={[
                styles.progressMarker,
                { left: `${chapterProgress * 100}%` }
              ]} 
            />

            {/* Chapter indicator */}
            <View style={styles.chapterIndicator}>
              <Text style={styles.chapterIndicatorText}>
                Ch {chapterIndex}/{chapters.length}
              </Text>
            </View>
          </Pressable>
        )}

        {/* Settings button */}
        <TouchableOpacity 
          style={styles.bottomSideButton}
          onPress={() => handleFlip('settings')}
        >
          <Icon name="settings" size={24} color="rgba(255,255,255,0.7)" set="ionicons" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  mainContent: {
    flex: 1,
  },
  card: {
    marginHorizontal: CARD_MARGIN,
    borderRadius: RADIUS,
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    paddingRight: 16,
  },
  headerCenter: {
    alignItems: 'flex-end',
    marginRight: 12,
    marginTop: 4,
  },
  closeButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
  },
  chapterLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  chapterButton: {
    marginBottom: 4,
  },
  speedButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  speedLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeLabel: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    lineHeight: 18,
  },
  coverContainer: {
    alignItems: 'center',
    marginBottom: 16,
    width: COVER_SIZE,
    height: COVER_SIZE,
    alignSelf: 'center',
  },
  coverFace: {
    position: 'absolute',
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: RADIUS,
  },
  coverBack: {
    padding: 16,
    overflow: 'hidden',
  },
  cover: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: RADIUS,
    backgroundColor: '#000',
  },
  detailsScroll: {
    flex: 1,
    marginTop: 24,
  },
  detailsContent: {
    paddingBottom: 20,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  detailDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  tapHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
  flipCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  flipModeContent: {
    flex: 1,
    paddingTop: 8,
  },
  settingsScrollContent: {
    paddingBottom: 20,
  },
  flipModeTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  speedOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  speedOption: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  speedOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sliderValueContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sliderValueText: {
    fontSize: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  sliderContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: COVER_SIZE - 32,
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 12,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  presetButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  presetText: {
    fontSize: 14,
    fontWeight: '600',
  },
  applyButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  sleepInput: {
    fontSize: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    borderBottomWidth: 2,
    paddingBottom: 4,
    minWidth: 100,
  },
  sleepInputLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  sleepActions: {
    flexDirection: 'row',
    gap: 12,
  },
  sleepActionButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  sleepActionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sleepOptions: {
    gap: 8,
  },
  sleepOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
  },
  sleepOptionText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  chaptersScroll: {
    flex: 1,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 12,
  },
  chapterNumber: {
    fontSize: 14,
    fontWeight: '600',
    width: 24,
    textAlign: 'center',
  },
  chapterInfo: {
    flex: 1,
  },
  chapterName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  chapterTime: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  waveformContainer: {
    width: WAVEFORM_WIDTH,
    height: WAVEFORM_HEIGHT,
    alignSelf: 'center',
    marginVertical: 12,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: -14,
  },
  timeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentTime: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  totalTime: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: BUTTON_GAP,
    marginHorizontal: CARD_MARGIN,
    marginTop: 5,
  },
  controlButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: RADIUS,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seekDeltaText: {
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  bottomSideButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sleepCountdown: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF9500',
    fontVariant: ['tabular-nums'],
  },
  progressContainer: {
    flex: 1,
    height: 24,
    justifyContent: 'center',
    position: 'relative',
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    height: 6,
    borderRadius: 3,
  },
  progressMarker: {
    position: 'absolute',
    width: 4,
    height: 24,
    backgroundColor: '#FF3B30',
    borderRadius: 2,
    marginLeft: -2,
  },
  chapterProgressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  chapterDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  settingRow: {
    marginBottom: 24,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  settingToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    gap: 8,
  },
  settingOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  settingOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  settingButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  chapterIndicator: {
    position: 'absolute',
    right: 0,
    top: -16,
  },
  chapterIndicatorText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
});