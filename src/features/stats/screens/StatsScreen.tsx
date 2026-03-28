/**
 * src/features/stats/screens/StatsScreen.tsx
 *
 * Listening statistics screen showing today, weekly, all-time stats,
 * streak information, top books, and listening patterns.
 *
 * Uses SettingsHeader for consistent navigation and Secret Library
 * design system tokens throughout.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Flame, Trophy, Share2, Clock, BookOpen, Hourglass, CalendarDays } from 'lucide-react-native';
import { SkullRefreshControl } from '@/shared/components';
import { useStatsScreen, getWeekdayName } from '../hooks/useListeningStats';
import { formatDuration, formatDurationLong } from '@/shared/utils/format';
import { ShareStatsCard } from '../components/ShareStatsCard';
import { SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import { scale, useSecretLibraryColors } from '@/shared/theme';
import { secretLibraryFonts as fonts } from '@/shared/theme/secretLibrary';
import { SettingsHeader } from '@/shared/components/SettingsHeader';
import type { SecretLibraryColors } from '@/shared/theme/secretLibrary';

// =============================================================================
// HELPERS
// =============================================================================

type Colors = SecretLibraryColors;

// =============================================================================
// STAT CARD
// =============================================================================

interface StatCardProps {
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  label: string;
  value: string;
  subtitle?: string;
  colors: Colors;
}

function StatCard({ Icon, label, value, subtitle, colors }: StatCardProps) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.grayLight }]}>
      <Icon size={scale(18)} color={colors.gray} strokeWidth={1.5} />
      <Text style={[styles.statCardValue, { color: colors.black }]}>{value}</Text>
      <Text style={[styles.statCardLabel, { color: colors.gray }]}>{label}</Text>
      {subtitle && <Text style={[styles.statCardSub, { color: colors.textMuted }]}>{subtitle}</Text>}
    </View>
  );
}

// =============================================================================
// WEEKLY CHART
// =============================================================================

interface WeeklyChartProps {
  dailyBreakdown: { date: string; totalSeconds: number }[];
  colors: Colors;
}

function WeeklyChart({ dailyBreakdown, colors }: WeeklyChartProps) {
  const maxSeconds = useMemo(() => {
    return Math.max(...dailyBreakdown.map((d) => d.totalSeconds), 1);
  }, [dailyBreakdown]);

  const last7Days = useMemo(() => {
    const days: { date: string; totalSeconds: number; weekday: string }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const found = dailyBreakdown.find((db) => db.date === dateStr);
      days.push({
        date: dateStr,
        totalSeconds: found?.totalSeconds || 0,
        weekday: getWeekdayName(dateStr),
      });
    }
    return days;
  }, [dailyBreakdown]);

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartBars}>
        {last7Days.map((day, index) => {
          const height = Math.max((day.totalSeconds / maxSeconds) * 80, 4);
          const isToday = index === last7Days.length - 1;
          return (
            <View key={day.date} style={styles.chartBarWrapper}>
              <View style={styles.chartBarContainer}>
                <View
                  style={[
                    styles.chartBar,
                    { height, backgroundColor: 'rgba(243, 182, 12, 0.25)' },
                    isToday && { backgroundColor: colors.gold },
                    day.totalSeconds === 0 && { backgroundColor: colors.grayLight },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.chartLabel,
                  { color: colors.textMuted },
                  isToday && { color: colors.gold },
                ]}
              >
                {day.weekday}
              </Text>
              {day.totalSeconds > 0 && (
                <Text style={[styles.chartValue, { color: colors.gray }]}>
                  {formatDuration(day.totalSeconds)}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// =============================================================================
// HOUR HEATMAP
// =============================================================================

interface HourHeatmapProps {
  byHour: { hour: number; totalSeconds: number }[];
  colors: Colors;
}

function HourHeatmap({ byHour, colors }: HourHeatmapProps) {
  const maxSeconds = useMemo(() => {
    return Math.max(...byHour.map((h) => h.totalSeconds), 1);
  }, [byHour]);

  const formatHour = (hour: number): string => {
    if (hour === 0) return '12a';
    if (hour === 12) return '12p';
    if (hour < 12) return `${hour}a`;
    return `${hour - 12}p`;
  };

  return (
    <View style={styles.heatmapContainer}>
      <View style={styles.heatmapGrid}>
        {byHour.map((item) => {
          const intensity = item.totalSeconds / maxSeconds;
          const backgroundColor =
            intensity === 0
              ? colors.grayLight
              : `rgba(243, 182, 12, ${0.2 + intensity * 0.8})`;
          return (
            <View key={item.hour} style={styles.heatmapCellWrapper}>
              <View style={[styles.heatmapCell, { backgroundColor }]} />
              {item.hour % 6 === 0 && (
                <Text style={[styles.heatmapLabel, { color: colors.textMuted }]}>
                  {formatHour(item.hour)}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// =============================================================================
// TOP BOOKS
// =============================================================================

interface TopBooksProps {
  topBooks: { bookId: string; bookTitle: string; totalSeconds: number }[];
  colors: Colors;
}

function TopBooksList({ topBooks, colors }: TopBooksProps) {
  if (topBooks.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No listening data yet</Text>
      </View>
    );
  }

  const maxSeconds = topBooks[0]?.totalSeconds || 1;

  return (
    <View style={styles.topBooksContainer}>
      {topBooks.map((book, index) => {
        const barWidth = (book.totalSeconds / maxSeconds) * 100;
        return (
          <View key={book.bookId} style={styles.topBookItem}>
            <View style={[styles.topBookRank, { backgroundColor: colors.grayLight }]}>
              <Text style={[styles.topBookRankText, { color: colors.gray }]}>{index + 1}</Text>
            </View>
            <View style={styles.topBookInfo}>
              <Text style={[styles.topBookTitle, { color: colors.black }]} numberOfLines={1}>
                {book.bookTitle}
              </Text>
              <View style={[styles.topBookBarBg, { backgroundColor: colors.grayLight }]}>
                <View style={[styles.topBookBar, { width: `${barWidth}%`, backgroundColor: colors.gold }]} />
              </View>
            </View>
            <Text style={[styles.topBookTime, { color: colors.textMuted }]}>
              {formatDuration(book.totalSeconds)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// =============================================================================
// SECTION LABEL
// =============================================================================

function SectionLabel({ title, colors, rightElement }: { title: string; colors: Colors; rightElement?: React.ReactNode }) {
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={[styles.sectionLabel, { color: colors.gray }]}>{title}</Text>
      {rightElement}
    </View>
  );
}

// =============================================================================
// MAIN SCREEN
// =============================================================================

type ShareType = 'weekly' | 'streak' | 'allTime' | null;

export function StatsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useSecretLibraryColors();
  const { today, weekly, streak, allTime, topBooks, byHour, isLoading, refetch } =
    useStatsScreen();

  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareType, setShareType] = useState<ShareType>(null);

  const todayTime = today?.totalSeconds || 0;
  const weeklyTime = weekly?.totalSeconds || 0;
  const allTimeTime = allTime?.totalSeconds || 0;
  const currentStreak = streak?.currentStreak || 0;
  const longestStreak = streak?.longestStreak || 0;
  const uniqueBooks = allTime?.uniqueBooks || 0;
  const avgSession = allTime?.averageSessionLength || 0;

  const openShareModal = (type: ShareType) => {
    setShareType(type);
    setShareModalVisible(true);
  };

  const closeShareModal = () => {
    setShareModalVisible(false);
    setShareType(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.grayLight }]}>
      <StatusBar barStyle={colors.isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.grayLight} />
      <SettingsHeader title="Listening Stats" />

      <SkullRefreshControl refreshing={isLoading} onRefresh={refetch}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: SCREEN_BOTTOM_PADDING + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Today */}
          <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
            <SectionLabel title="Today" colors={colors} />
            <View style={styles.todayStats}>
              <Text style={[styles.todayTime, { color: colors.gold }]}>
                {formatDuration(todayTime)}
              </Text>
              <Text style={[styles.todayLabel, { color: colors.gray }]}>listened today</Text>
            </View>
            {today && (today.sessionCount > 0 || today.booksTouched.length > 0) && (
              <View style={[styles.todayMeta, { borderTopColor: colors.borderLight }]}>
                <Text style={[styles.todayMetaText, { color: colors.textMuted }]}>
                  {today.sessionCount} session{today.sessionCount !== 1 ? 's' : ''}
                </Text>
                <Text style={[styles.todayMetaDot, { color: colors.textMuted }]}>&middot;</Text>
                <Text style={[styles.todayMetaText, { color: colors.textMuted }]}>
                  {today.booksTouched.length} book{today.booksTouched.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>

          {/* Streak */}
          <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
            <SectionLabel
              title="Streak"
              colors={colors}
              rightElement={currentStreak > 0 ? (
                <TouchableOpacity
                  onPress={() => openShareModal('streak')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Share streak stats"
                >
                  <Share2 size={scale(14)} color={colors.textMuted} strokeWidth={1.5} />
                </TouchableOpacity>
              ) : undefined}
            />
            <View style={styles.streakContainer}>
              <View style={styles.streakItem}>
                <Flame
                  size={scale(22)}
                  color={currentStreak > 0 ? colors.orange : colors.textMuted}
                  strokeWidth={1.5}
                />
                <Text style={[styles.streakValue, { color: colors.black }]}>{currentStreak}</Text>
                <Text style={[styles.streakLabel, { color: colors.textMuted }]}>
                  day{currentStreak !== 1 ? 's' : ''} current
                </Text>
              </View>
              <View style={[styles.streakDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.streakItem}>
                <Trophy size={scale(22)} color={colors.gold} strokeWidth={1.5} />
                <Text style={[styles.streakValue, { color: colors.black }]}>{longestStreak}</Text>
                <Text style={[styles.streakLabel, { color: colors.textMuted }]}>
                  day{longestStreak !== 1 ? 's' : ''} best
                </Text>
              </View>
            </View>
          </View>

          {/* This Week */}
          <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
            <SectionLabel
              title="This Week"
              colors={colors}
              rightElement={weeklyTime > 0 ? (
                <TouchableOpacity
                  onPress={() => openShareModal('weekly')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Share weekly stats"
                >
                  <Share2 size={scale(14)} color={colors.textMuted} strokeWidth={1.5} />
                </TouchableOpacity>
              ) : undefined}
            />
            <Text style={[styles.weeklyTotal, { color: colors.black }]}>
              {formatDurationLong(weeklyTime)}
            </Text>
            <Text style={[styles.weeklySubtext, { color: colors.textMuted }]}>
              {weekly?.sessionCount || 0} sessions across {weekly?.uniqueBooks || 0} books
            </Text>
            <WeeklyChart dailyBreakdown={weekly?.dailyBreakdown || []} colors={colors} />
          </View>

          {/* All Time */}
          <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
            <SectionLabel
              title="All Time"
              colors={colors}
              rightElement={allTimeTime > 0 ? (
                <TouchableOpacity
                  onPress={() => openShareModal('allTime')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Share all-time stats"
                >
                  <Share2 size={scale(14)} color={colors.textMuted} strokeWidth={1.5} />
                </TouchableOpacity>
              ) : undefined}
            />
            <View style={styles.statsGrid}>
              <StatCard
                Icon={Clock}
                label="Total Time"
                value={formatDuration(allTimeTime)}
                subtitle={allTime?.totalSessions ? `${allTime.totalSessions} sessions` : undefined}
                colors={colors}
              />
              <StatCard
                Icon={BookOpen}
                label="Books"
                value={uniqueBooks.toString()}
                subtitle="unique titles"
                colors={colors}
              />
              <StatCard
                Icon={Hourglass}
                label="Avg Session"
                value={formatDuration(avgSession)}
                subtitle="per sitting"
                colors={colors}
              />
              <StatCard
                Icon={CalendarDays}
                label="Since"
                value={
                  allTime?.firstListenDate
                    ? new Date(allTime.firstListenDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : '--'
                }
                subtitle={allTime?.firstListenDate ? new Date(allTime.firstListenDate).getFullYear().toString() : ''}
                colors={colors}
              />
            </View>
          </View>

          {/* Top Books */}
          <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
            <SectionLabel title="Most Listened" colors={colors} />
            <TopBooksList topBooks={topBooks || []} colors={colors} />
          </View>

          {/* Listening Pattern */}
          {byHour && byHour.some((h) => h.totalSeconds > 0) && (
            <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
              <SectionLabel title="When You Listen" colors={colors} />
              <Text style={[styles.patternSubtext, { color: colors.textMuted }]}>
                Activity by hour of day
              </Text>
              <HourHeatmap byHour={byHour} colors={colors} />
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              Stats are recorded locally on your device
            </Text>
          </View>
        </ScrollView>
      </SkullRefreshControl>

      {/* Share Modal */}
      <Modal
        visible={shareModalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeShareModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismiss}
            activeOpacity={1}
            onPress={closeShareModal}
            accessibilityRole="button"
            accessibilityLabel="Dismiss share modal"
          />
          <View style={styles.modalContent}>
            {shareType === 'weekly' && (
              <ShareStatsCard
                type="weekly"
                weeklyStats={weekly ? {
                  totalSeconds: weekly.totalSeconds,
                  sessionCount: weekly.sessionCount,
                  uniqueBooks: weekly.uniqueBooks,
                } : undefined}
                onClose={closeShareModal}
              />
            )}
            {shareType === 'streak' && (
              <ShareStatsCard
                type="streak"
                streakStats={streak ? {
                  currentStreak: streak.currentStreak,
                  longestStreak: streak.longestStreak,
                } : undefined}
                onClose={closeShareModal}
              />
            )}
            {shareType === 'allTime' && (
              <ShareStatsCard
                type="allTime"
                allTimeStats={allTime ? {
                  totalSeconds: allTime.totalSeconds,
                  totalSessions: allTime.totalSessions,
                  uniqueBooks: allTime.uniqueBooks,
                } : undefined}
                onClose={closeShareModal}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // Cards
  card: {
    borderRadius: scale(12),
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },

  // Section label (uppercase mono)
  sectionLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(9),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Today
  todayStats: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  todayTime: {
    fontFamily: fonts.playfair.regular,
    fontSize: scale(40),
    fontWeight: '600',
  },
  todayLabel: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(10),
    marginTop: 4,
  },
  todayMeta: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  todayMetaText: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(10),
  },
  todayMetaDot: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(10),
  },

  // Streak
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  streakItem: {
    alignItems: 'center',
    flex: 1,
  },
  streakDivider: {
    width: 1,
    height: 56,
  },
  streakValue: {
    fontFamily: fonts.playfair.regular,
    fontSize: scale(28),
    fontWeight: '600',
    marginTop: 6,
  },
  streakLabel: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(9),
    marginTop: 2,
  },

  // Weekly
  weeklyTotal: {
    fontFamily: fonts.playfair.regular,
    fontSize: scale(17),
  },
  weeklySubtext: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(10),
    marginTop: 2,
    marginBottom: 16,
  },
  chartContainer: {
    marginTop: 4,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 110,
  },
  chartBarWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  chartBarContainer: {
    height: 80,
    justifyContent: 'flex-end',
    width: '100%',
    paddingHorizontal: 4,
  },
  chartBar: {
    borderRadius: 4,
    width: '100%',
    minHeight: 4,
  },
  chartLabel: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(9),
    marginTop: 6,
  },
  chartValue: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(8),
    marginTop: 2,
  },

  // All Time stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: scale(10),
    padding: 12,
    alignItems: 'center',
    gap: 3,
  },
  statCardValue: {
    fontFamily: fonts.playfair.regular,
    fontSize: scale(16),
    fontWeight: '600',
    marginTop: 4,
  },
  statCardLabel: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(9),
  },
  statCardSub: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(8),
  },

  // Top books
  topBooksContainer: {
    gap: 10,
  },
  topBookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topBookRank: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBookRankText: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(10),
    fontWeight: '600',
  },
  topBookInfo: {
    flex: 1,
  },
  topBookTitle: {
    fontFamily: fonts.playfair.regular,
    fontSize: scale(13),
    marginBottom: 4,
  },
  topBookBarBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  topBookBar: {
    height: '100%',
    borderRadius: 2,
  },
  topBookTime: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(10),
  },

  // Hour heatmap
  patternSubtext: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(10),
    marginBottom: 12,
    marginTop: -8,
  },
  heatmapContainer: {
    marginTop: 8,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  heatmapCellWrapper: {
    alignItems: 'center',
  },
  heatmapCell: {
    width: scale(11),
    height: 20,
    borderRadius: 3,
  },
  heatmapLabel: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(7),
    marginTop: 4,
  },

  // Empty state
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(11),
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(9),
  },

  // Share modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    width: '100%',
    alignItems: 'center',
  },
});
