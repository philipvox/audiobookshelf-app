// File: src/features/player/components/ChapterSheet.tsx
import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '../stores/playerStore';
import { Icon } from '@/shared/components/Icon';
import { theme } from '@/shared/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ITEM_HEIGHT = 52;

interface Chapter {
  id: number;
  start: number;
  end: number;
  title: string;
}

interface ChapterSheetProps {
  visible: boolean;
  onClose: () => void;
  chapters: Chapter[];
  currentChapterIndex: number;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function ChapterSheet({ visible, onClose, chapters, currentChapterIndex }: ChapterSheetProps) {
  const insets = useSafeAreaInsets();
  const { jumpToChapter } = usePlayerStore();
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible && listRef.current && currentChapterIndex > 0) {
      setTimeout(() => {
        listRef.current?.scrollToIndex({
          index: Math.max(0, currentChapterIndex - 2),
          animated: false,
        });
      }, 100);
    }
  }, [visible, currentChapterIndex]);

  const handleSelect = async (index: number) => {
    await jumpToChapter(index);
    onClose();
  };

  const renderChapter = ({ item, index }: { item: Chapter; index: number }) => {
    const isActive = index === currentChapterIndex;
    const duration = item.end - item.start;
    
    let displayTitle = item.title || `Chapter ${index + 1}`;
    if (displayTitle.includes(' - ')) {
      const parts = displayTitle.split(' - ');
      displayTitle = parts[parts.length - 1];
    }
    
    return (
      <TouchableOpacity
        style={[styles.chapterItem, isActive && styles.chapterItemActive]}
        onPress={() => handleSelect(index)}
        activeOpacity={0.7}
      >
        <Text style={[styles.chapterNumber, isActive && styles.textActive]}>
          {index + 1}
        </Text>
        <View style={styles.chapterInfo}>
          <Text 
            style={[styles.chapterTitle, isActive && styles.textActive]} 
            numberOfLines={1}
          >
            {displayTitle}
          </Text>
          <Text style={styles.chapterDuration}>{formatDuration(duration)}</Text>
        </View>
        {isActive && (
          <Icon name="volume-high" size={16} color={theme.colors.primary[500]} set="ionicons" />
        )}
      </TouchableOpacity>
    );
  };

  const listHeight = Math.min(
    chapters.length * ITEM_HEIGHT,
    SCREEN_HEIGHT * 0.6
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismissArea} onPress={onClose} activeOpacity={1} />
        
        <View style={[styles.sheet, { paddingBottom: insets.bottom + theme.spacing[2] }]}>
          <View style={styles.header}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Text style={styles.title}>Chapters</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="close" size={22} color={theme.colors.text.secondary} set="ionicons" />
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            ref={listRef}
            data={chapters}
            renderItem={renderChapter}
            keyExtractor={(item) => item.id.toString()}
            style={[styles.list, { height: listHeight }]}
            showsVerticalScrollIndicator={false}
            getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
            onScrollToIndexFailed={() => {}}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  header: {
    alignItems: 'center',
    paddingTop: theme.spacing[2],
    paddingBottom: theme.spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.neutral[300],
    borderRadius: 2,
    marginBottom: theme.spacing[2],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: theme.spacing[4],
  },
  title: {
    ...theme.textStyles.body,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  list: {
    flexGrow: 0,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    height: ITEM_HEIGHT,
  },
  chapterItemActive: {
    backgroundColor: theme.colors.primary[50],
  },
  chapterNumber: {
    width: 28,
    ...theme.textStyles.bodySmall,
    color: theme.colors.text.tertiary,
  },
  chapterInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: theme.spacing[2],
  },
  chapterTitle: {
    ...theme.textStyles.bodySmall,
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: theme.spacing[2],
  },
  chapterDuration: {
    ...theme.textStyles.caption,
    color: theme.colors.text.tertiary,
  },
  textActive: {
    color: theme.colors.primary[500],
    fontWeight: '600',
  },
});