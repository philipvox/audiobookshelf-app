// File: src/features/player/screens/PlayerScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  StatusBar,
  Dimensions,
  Pressable,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '../stores/playerStore';
import { useImageColors } from '../hooks/useImageColors';
import { PlaybackControls } from '../components/PlaybackControls';
import { ProgressBar } from '../components/ProgressBar';
import { ChapterSheet } from '../components/ChapterSheet';
import { SpeedSelector } from '../components/SpeedSelector';
import { SleepTimer } from '../components/SleepTimer';
import { BookmarkSheet } from '../components/BookmarkSheet';
import { CoverWithProgress } from '../components/CoverWithProgress';
import { apiClient } from '@/core/api';
import { Icon } from '@/shared/components/Icon';
import { theme } from '@/shared/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_SIZE = SCREEN_WIDTH * 0.65;

type ProgressMode = 'book' | 'chapter';

const SKIP_AMOUNTS = [10, 15, 20, 30, 45, 60];

export function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const [showChapters, setShowChapters] = useState(false);
  const [showSpeed, setShowSpeed] = useState(false);
  const [showSleep, setShowSleep] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [progressMode, setProgressMode] = useState<ProgressMode>('chapter');
  const [skipAmount, setSkipAmount] = useState(20);

  const {
    currentBook,
    isPlayerVisible,
    position,
    duration: storeDuration,
    playbackRate,
    sleepTimer,
    closePlayer,
    jumpToChapter,
  } = usePlayerStore();

  const coverUrl = currentBook ? apiClient.getItemCoverUrl(currentBook.id) : '';
  const { background, backgroundLight, progressAccent } = useImageColors(coverUrl, currentBook?.id || '');

  if (!isPlayerVisible || !currentBook) {
    return null;
  }

  const metadata = currentBook.media.metadata;
  const title = metadata.title || 'Unknown Title';
  const author = metadata.authors?.[0]?.name || 'Unknown Author';
  const chapters = currentBook.media.chapters || [];
  
  let bookDuration = currentBook.media.duration || 0;
  if (bookDuration <= 0 && storeDuration > 0) {
    bookDuration = storeDuration;
  }
  if (bookDuration <= 0 && chapters.length > 0) {
    const lastChapter = chapters[chapters.length - 1];
    bookDuration = lastChapter.end || 0;
  }
  
  const bookProgress = bookDuration > 0 ? position / bookDuration : 0;
  
  const currentChapterIndex = chapters.findIndex(
    (ch, idx) =>
      position >= ch.start &&
      (idx === chapters.length - 1 || position < chapters[idx + 1].start)
  );
  const currentChapter = chapters[currentChapterIndex];
  const chapterTitle = currentChapter?.title || `Chapter ${currentChapterIndex + 1}`;

  const hasPreviousChapter = currentChapterIndex > 0;
  const hasNextChapter = currentChapterIndex < chapters.length - 1;

  const handlePreviousChapter = () => {
    if (hasPreviousChapter) jumpToChapter(currentChapterIndex - 1);
  };

  const handleNextChapter = () => {
    if (hasNextChapter) jumpToChapter(currentChapterIndex + 1);
  };

  const textColor = '#FFFFFF';
  const secondaryTextColor = 'rgba(255,255,255,0.7)';
  const tertiaryTextColor = 'rgba(255,255,255,0.5)';

  const gradientColors: [string, string] = [backgroundLight, background];

  const formatSleepTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      visible={isPlayerVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={closePlayer}
    >
      <LinearGradient colors={gradientColors} style={styles.container}>
        <StatusBar barStyle="light-content" />

        <View style={[styles.header, { paddingTop: insets.top + theme.spacing[2] }]}>
          <TouchableOpacity onPress={closePlayer} style={styles.headerButton}>
            <Icon name="chevron-down" size={28} color={textColor} set="ionicons" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Now Playing</Text>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowOptionsMenu(true)}
          >
            <Icon name="ellipsis-horizontal" size={24} color={textColor} set="ionicons" />
          </TouchableOpacity>
        </View>

        <View style={styles.coverSection}>
          <CoverWithProgress
            coverUrl={coverUrl}
            progress={bookProgress}
            size={COVER_SIZE}
            accentColor={progressAccent}
          />
        </View>

        <View style={styles.infoSection}>
          <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>
            {title}
          </Text>
          <Text style={[styles.author, { color: secondaryTextColor }]}>
            {author}
          </Text>
          <Text style={[styles.chapterInfo, { color: tertiaryTextColor }]}>
            {chapterTitle} • {Math.round(bookProgress * 100)}% complete
          </Text>
        </View>

        <View style={styles.modeIndicator}>
          <Text style={[styles.modeText, { color: tertiaryTextColor }]}>
            {progressMode === 'chapter' ? 'Chapter Progress' : 'Book Progress'}
          </Text>
        </View>

        <ProgressBar
          textColor={tertiaryTextColor}
          trackColor="rgba(255,255,255,0.2)"
          fillColor={progressAccent}
          mode={progressMode}
          chapters={chapters}
          currentChapterIndex={currentChapterIndex}
          bookDuration={bookDuration}
        />

        <PlaybackControls
          buttonColor="#FFFFFF"
          iconColor={background}
          skipColor="rgba(255,255,255,0.6)"
          skipAmount={skipAmount}
          onPreviousChapter={handlePreviousChapter}
          onNextChapter={handleNextChapter}
          hasPreviousChapter={hasPreviousChapter}
          hasNextChapter={hasNextChapter}
        />

        <View style={styles.speedSection}>
          <TouchableOpacity
            style={[styles.speedButton, { borderColor: 'rgba(255,255,255,0.3)' }]}
            onPress={() => setShowSpeed(true)}
          >
            <Text style={[styles.speedText, { color: textColor }]}>
              {playbackRate}×
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.bottomActions, { paddingBottom: insets.bottom + theme.spacing[6] }]}>
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowSleep(true)}>
            <Icon 
              name={sleepTimer !== null ? "moon" : "moon-outline"} 
              size={24} 
              color={sleepTimer !== null ? progressAccent : secondaryTextColor} 
              set="ionicons" 
            />
            <Text style={[styles.actionLabel, { color: sleepTimer !== null ? progressAccent : secondaryTextColor }]}>
              {sleepTimer !== null && sleepTimer !== -1 
                ? formatSleepTimer(sleepTimer) 
                : 'Sleep'
              }
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => setShowChapters(true)}>
            <Icon name="list-outline" size={24} color={secondaryTextColor} set="ionicons" />
            <Text style={[styles.actionLabel, { color: secondaryTextColor }]}>Chapters</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => setShowBookmarks(true)}>
            <Icon name="bookmark-outline" size={24} color={secondaryTextColor} set="ionicons" />
            <Text style={[styles.actionLabel, { color: secondaryTextColor }]}>Bookmark</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Icon name="share-outline" size={24} color={secondaryTextColor} set="ionicons" />
            <Text style={[styles.actionLabel, { color: secondaryTextColor }]}>Share</Text>
          </TouchableOpacity>
        </View>

        <ChapterSheet
          visible={showChapters}
          onClose={() => setShowChapters(false)}
          chapters={chapters}
          currentChapterIndex={currentChapterIndex}
        />

        <SpeedSelector
          visible={showSpeed}
          onClose={() => setShowSpeed(false)}
        />

        <SleepTimer
          visible={showSleep}
          onClose={() => setShowSleep(false)}
        />

        <BookmarkSheet
          visible={showBookmarks}
          onClose={() => setShowBookmarks(false)}
        />

        {/* Options Menu */}
        <Modal
          visible={showOptionsMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowOptionsMenu(false)}
        >
          <Pressable 
            style={styles.menuOverlay} 
            onPress={() => setShowOptionsMenu(false)}
          >
            <View style={[styles.menuContainer, { top: insets.top + 50 }]}>
              <ScrollView style={styles.menuScroll} bounces={false}>
                <Text style={styles.menuHeader}>Progress Display</Text>
                
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => setProgressMode('chapter')}
                >
                  <Icon 
                    name={progressMode === 'chapter' ? 'checkmark-circle' : 'ellipse-outline'} 
                    size={20} 
                    color={progressMode === 'chapter' ? theme.colors.primary[500] : '#666'} 
                    set="ionicons" 
                  />
                  <Text style={styles.menuItemText}>Current Chapter</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => setProgressMode('book')}
                >
                  <Icon 
                    name={progressMode === 'book' ? 'checkmark-circle' : 'ellipse-outline'} 
                    size={20} 
                    color={progressMode === 'book' ? theme.colors.primary[500] : '#666'} 
                    set="ionicons" 
                  />
                  <Text style={styles.menuItemText}>Full Book</Text>
                </TouchableOpacity>

                <Text style={[styles.menuHeader, styles.menuHeaderSpaced]}>Skip Duration</Text>
                
                <View style={styles.skipAmountGrid}>
                  {SKIP_AMOUNTS.map((amount) => (
                    <TouchableOpacity
                      key={amount}
                      style={[
                        styles.skipAmountButton,
                        skipAmount === amount && styles.skipAmountButtonActive,
                      ]}
                      onPress={() => setSkipAmount(amount)}
                    >
                      <Text 
                        style={[
                          styles.skipAmountText,
                          skipAmount === amount && styles.skipAmountTextActive,
                        ]}
                      >
                        {amount}s
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[2],
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...theme.textStyles.caption,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  coverSection: {
    alignItems: 'center',
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[6],
  },
  infoSection: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing[8],
    marginBottom: theme.spacing[2],
  },
  title: {
    ...theme.textStyles.h2,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: theme.spacing[1],
  },
  author: {
    ...theme.textStyles.body,
    textAlign: 'center',
    marginBottom: theme.spacing[1],
  },
  chapterInfo: {
    ...theme.textStyles.caption,
    textAlign: 'center',
  },
  modeIndicator: {
    alignItems: 'center',
    marginBottom: theme.spacing[1],
  },
  modeText: {
    ...theme.textStyles.caption,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  speedSection: {
    alignItems: 'center',
    marginTop: theme.spacing[2],
  },
  speedButton: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.radius.full,
    borderWidth: 1,
  },
  speedText: {
    ...theme.textStyles.bodySmall,
    fontWeight: '600',
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 'auto',
    paddingHorizontal: theme.spacing[8],
  },
  actionButton: {
    alignItems: 'center',
  },
  actionLabel: {
    ...theme.textStyles.caption,
    marginTop: theme.spacing[1],
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  menuContainer: {
    position: 'absolute',
    right: theme.spacing[4],
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.large,
    paddingVertical: theme.spacing[2],
    minWidth: 200,
    maxHeight: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  menuScroll: {
    flex: 1,
  },
  menuHeader: {
    ...theme.textStyles.caption,
    color: '#999',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuHeaderSpaced: {
    marginTop: theme.spacing[2],
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: theme.spacing[3],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    gap: theme.spacing[3],
  },
  menuItemText: {
    ...theme.textStyles.body,
    color: '#333',
  },
  skipAmountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing[3],
    gap: theme.spacing[2],
    paddingBottom: theme.spacing[2],
  },
  skipAmountButton: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.radius.medium,
    backgroundColor: '#F0F0F0',
    minWidth: 50,
    alignItems: 'center',
  },
  skipAmountButtonActive: {
    backgroundColor: theme.colors.primary[500],
  },
  skipAmountText: {
    ...theme.textStyles.bodySmall,
    fontWeight: '600',
    color: '#666',
  },
  skipAmountTextActive: {
    color: '#FFFFFF',
  },
});