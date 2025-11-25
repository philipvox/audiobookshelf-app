// File: src/features/player/components/ProgressBar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, GestureResponderEvent } from 'react-native';
import { usePlayerStore } from '../stores/playerStore';
import { theme } from '@/shared/theme';

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

interface Chapter {
  id: number;
  start: number;
  end: number;
  title: string;
}

interface ProgressBarProps {
  textColor?: string;
  trackColor?: string;
  fillColor?: string;
  mode?: 'book' | 'chapter';
  chapters?: Chapter[];
  currentChapterIndex?: number;
  bookDuration: number;
}

export function ProgressBar({ 
  textColor = theme.colors.text.tertiary,
  trackColor = theme.colors.neutral[300],
  fillColor = theme.colors.text.primary,
  mode = 'chapter',
  chapters = [],
  currentChapterIndex = 0,
  bookDuration,
}: ProgressBarProps) {
  const { position, seekTo } = usePlayerStore();
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [seekLock, setSeekLock] = useState(false);
  const [lockedPosition, setLockedPosition] = useState(0);
  const trackWidth = useRef(300);

  // Use locked position briefly after seek to prevent UI snap-back
  const effectivePosition = seekLock ? lockedPosition : position;

  const currentChapter = chapters[currentChapterIndex];
  const isChapterMode = mode === 'chapter' && currentChapter;
  
  let displayPosition: number;
  let displayDuration: number;
  let progress: number;

  if (isChapterMode) {
    const chapterStart = currentChapter.start;
    const chapterEnd = currentChapter.end;
    const chapterDuration = chapterEnd - chapterStart;
    const chapterPosition = Math.max(0, effectivePosition - chapterStart);
    
    displayPosition = chapterPosition;
    displayDuration = chapterDuration;
    progress = chapterDuration > 0 ? chapterPosition / chapterDuration : 0;
  } else {
    displayPosition = effectivePosition;
    displayDuration = bookDuration;
    progress = bookDuration > 0 ? effectivePosition / bookDuration : 0;
  }

  const displayProgress = isDragging ? dragProgress : progress;

  const calculateProgress = (pageX: number) => {
    const padding = theme.spacing[8];
    const x = pageX - padding;
    return Math.max(0, Math.min(1, x / trackWidth.current));
  };

  const handleTouchStart = (e: GestureResponderEvent) => {
    if (displayDuration <= 0) return;
    const prog = calculateProgress(e.nativeEvent.pageX);
    setDragProgress(prog);
    setIsDragging(true);
  };

  const handleTouchMove = (e: GestureResponderEvent) => {
    if (!isDragging || displayDuration <= 0) return;
    const prog = calculateProgress(e.nativeEvent.pageX);
    setDragProgress(prog);
  };

  const handleTouchEnd = async () => {
    if (!isDragging || displayDuration <= 0) return;
    setIsDragging(false);
    
    let newPosition: number;
    if (isChapterMode) {
      const chapterDuration = currentChapter.end - currentChapter.start;
      newPosition = currentChapter.start + (dragProgress * chapterDuration);
    } else {
      newPosition = dragProgress * bookDuration;
    }
    
    newPosition = Math.max(0, Math.min(newPosition, bookDuration));
    
    // Lock position to prevent snap-back
    setLockedPosition(newPosition);
    setSeekLock(true);
    
    try {
      await seekTo(newPosition);
    } catch (error) {
      console.error('Failed to seek:', error);
    }
    
    // Release lock after audio catches up
    setTimeout(() => setSeekLock(false), 500);
  };

  const handleLayout = (e: any) => {
    trackWidth.current = e.nativeEvent.layout.width;
  };

  const currentTime = isDragging ? dragProgress * displayDuration : displayPosition;

  return (
    <View style={styles.container}>
      <View style={styles.timeContainer}>
        <Text style={[styles.timeText, { color: textColor }]}>
          {formatTime(currentTime)}
        </Text>
        <Text style={[styles.timeText, { color: textColor }]}>
          {formatTime(displayDuration)}
        </Text>
      </View>

      <View
        style={styles.touchArea}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouchStart}
        onResponderMove={handleTouchMove}
        onResponderRelease={handleTouchEnd}
        onResponderTerminate={handleTouchEnd}
      >
        <View 
          style={[styles.progressTrack, { backgroundColor: trackColor }]}
          onLayout={handleLayout}
        >
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${displayProgress * 100}%`, 
                backgroundColor: fillColor 
              }
            ]} 
          />
          <View 
            style={[
              styles.thumb, 
              { left: `${displayProgress * 100}%` }
            ]} 
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing[8],
    paddingVertical: theme.spacing[2],
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[2],
  },
  timeText: {
    ...theme.textStyles.caption,
  },
  touchArea: {
    paddingVertical: theme.spacing[3],
  },
  progressTrack: {
    height: 4,
    borderRadius: theme.radius.small,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.radius.small,
  },
  thumb: {
    position: 'absolute',
    top: -6,
    marginLeft: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
});