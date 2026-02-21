/**
 * src/features/browse/components/TagFilterSheet.tsx
 *
 * Filter popup for tag-based filtering.
 * Works across all audience modes (All, Kids, Adults).
 * Tab-based category navigation for cleaner UX.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  ChevronDown,
  ChevronUp,
  Compass,
  Cloud,
  Coffee,
  Moon,
  Heart,
  Sun,
  Smile,
  Eye,
  Sunrise,
  Sparkles,
  Flame,
  Feather,
  Search,
  Clock,
  Zap,
  Lightbulb,
  TrendingUp,
  Wand2,
  FastForward,
  Hourglass,
  Gauge,
  Users,
  Swords,
  Crown,
  Shield,
  AlertTriangle,
  BookOpen,
  Mic,
  Award,
  Star,
  Headphones,
  Volume2,
  Play,
  ListOrdered,
  Bookmark,
  Timer,
  type LucideIcon,
} from 'lucide-react-native';
import { secretLibraryFonts } from '@/shared/theme/secretLibrary';
import { scale, useSecretLibraryColors } from '@/shared/theme';
import { Icon } from '@/shared/components/Icon';
import { TAG_CATEGORIES, TagCategory, LengthRange, useContentFilterStore } from '../stores/contentFilterStore';

// =============================================================================
// Tag Icons Mapping
// =============================================================================

const TAG_ICONS: Record<string, LucideIcon> = {
  // Mood
  adventurous: Compass,
  atmospheric: Cloud,
  cozy: Coffee,
  dark: Moon,
  emotional: Heart,
  'feel-good': Sun,
  funny: Smile,
  haunting: Eye,
  heartwarming: Heart,
  hopeful: Sunrise,
  inspiring: Sparkles,
  intense: Flame,
  lighthearted: Feather,
  mysterious: Search,
  romantic: Heart,
  suspenseful: Clock,
  tense: Zap,
  'thought-provoking': Lightbulb,
  uplifting: TrendingUp,
  whimsical: Wand2,
  // Pacing
  'fast-paced': FastForward,
  'slow-burn': Hourglass,
  'medium-paced': Gauge,
  'page-turner': Zap,
  // Tropes
  'enemies-to-lovers': Swords,
  'found-family': Users,
  'chosen-one': Crown,
  'redemption-arc': Shield,
  'unreliable-narrator': Eye,
  'love-triangle': Heart,
  'fish-out-of-water': Compass,
  'coming-of-age': Sunrise,
  'second-chance': TrendingUp,
  'underdog': Star,
  // Content
  'explicit-content': AlertTriangle,
  'clean-read': BookOpen,
  'mild-language': Volume2,
  'violence': Swords,
  'no-romance': BookOpen,
  // Audiobook
  'full-cast': Users,
  'single-narrator': Mic,
  'author-narrated': BookOpen,
  'award-winning-narrator': Award,
  'celebrity-narrator': Star,
  // Listening
  'good-for-sleep': Moon,
  'good-for-commute': Headphones,
  'good-for-workout': Flame,
  'background-listening': Volume2,
  'requires-attention': Eye,
  // Series
  'standalone': BookOpen,
  'series-starter': Play,
  'series-complete': ListOrdered,
  'can-read-out-of-order': Bookmark,
};

// Category icons for tabs
const CATEGORY_ICONS: Record<TagCategory, LucideIcon> = {
  mood: Sparkles,
  pacing: Gauge,
  tropes: Crown,
  content: BookOpen,
  audiobook: Mic,
  listening: Headphones,
  series: ListOrdered,
};

// =============================================================================
// Types
// =============================================================================

interface TagFilterSheetProps {
  visible: boolean;
  onClose: () => void;
}

// =============================================================================
// Helper to format tag for display
// =============================================================================

function formatTagLabel(tag: string): string {
  return tag
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// =============================================================================
// Length Range Section Component
// =============================================================================

const LENGTH_MIN = 0;
const LENGTH_MAX = 30; // 30+ hours

interface LengthRangeSectionProps {
  lengthRange: LengthRange | null;
  onLengthChange: (range: LengthRange | null) => void;
}

function LengthRangeSection({ lengthRange, onLengthChange }: LengthRangeSectionProps) {
  const colors = useSecretLibraryColors();
  const [expanded, setExpanded] = useState(false);

  const minValue = lengthRange?.min ?? LENGTH_MIN;
  const maxValue = lengthRange?.max ?? LENGTH_MAX;
  const isActive = lengthRange !== null;

  const handleToggleExpand = useCallback(() => {
    Haptics.selectionAsync();
    setExpanded((prev) => !prev);
  }, []);

  const handleMinChange = useCallback((value: number) => {
    const newMin = Math.round(value);
    const newMax = Math.max(newMin + 1, maxValue);
    onLengthChange({ min: newMin, max: newMax });
  }, [maxValue, onLengthChange]);

  const handleMaxChange = useCallback((value: number) => {
    const newMax = Math.round(value);
    const newMin = Math.min(minValue, newMax - 1);
    onLengthChange({ min: newMin, max: newMax });
  }, [minValue, onLengthChange]);

  const handleClear = useCallback(() => {
    Haptics.selectionAsync();
    onLengthChange(null);
  }, [onLengthChange]);

  const formatHours = (hours: number) => {
    if (hours >= LENGTH_MAX) return '30+';
    return `${hours}`;
  };

  return (
    <View style={styles.lengthContainer}>
      <TouchableOpacity style={styles.lengthHeader} onPress={handleToggleExpand}>
        <View style={styles.lengthTitleRow}>
          <Timer size={16} color={colors.gray} />
          <Text style={[styles.lengthTitle, { color: colors.black }]}>Length</Text>
          {isActive && (
            <View style={[styles.lengthBadge, { backgroundColor: colors.black }]}>
              <Text style={[styles.lengthBadgeText, { color: colors.white }]}>
                {formatHours(minValue)}-{formatHours(maxValue)}h
              </Text>
            </View>
          )}
        </View>
        {expanded ? (
          <ChevronUp size={16} color={colors.gray} />
        ) : (
          <ChevronDown size={16} color={colors.gray} />
        )}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.lengthSection}>
          {/* Range display */}
          <View style={styles.lengthRangeDisplay}>
            <Text style={[styles.lengthRangeText, { color: colors.black }]}>
              {formatHours(minValue)} - {formatHours(maxValue)} hours
            </Text>
            {isActive && (
              <TouchableOpacity onPress={handleClear}>
                <Text style={[styles.clearText, { color: colors.gray }]}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Min slider */}
          <View style={styles.sliderRow}>
            <Text style={[styles.sliderLabel, { color: colors.gray }]}>Min</Text>
            <Slider
              style={styles.slider}
              minimumValue={LENGTH_MIN}
              maximumValue={LENGTH_MAX - 1}
              value={minValue}
              onValueChange={handleMinChange}
              minimumTrackTintColor={colors.black}
              maximumTrackTintColor={colors.grayLine}
              thumbTintColor={colors.black}
              step={1}
            />
            <Text style={[styles.sliderValue, { color: colors.black }]}>{formatHours(minValue)}h</Text>
          </View>

          {/* Max slider */}
          <View style={styles.sliderRow}>
            <Text style={[styles.sliderLabel, { color: colors.gray }]}>Max</Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={LENGTH_MAX}
              value={maxValue}
              onValueChange={handleMaxChange}
              minimumTrackTintColor={colors.black}
              maximumTrackTintColor={colors.grayLine}
              thumbTintColor={colors.black}
              step={1}
            />
            <Text style={[styles.sliderValue, { color: colors.black }]}>{formatHours(maxValue)}h</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// =============================================================================
// Category Tab Component
// =============================================================================

interface CategoryTabProps {
  category: TagCategory;
  isActive: boolean;
  selectedCount: number;
  onPress: () => void;
}

function CategoryTab({ category, isActive, selectedCount, onPress }: CategoryTabProps) {
  const colors = useSecretLibraryColors();
  const config = TAG_CATEGORIES[category];
  const TabIcon = CATEGORY_ICONS[category];

  return (
    <TouchableOpacity
      style={styles.categoryTab}
      onPress={onPress}
    >
      <View style={styles.categoryTabContent}>
        <TabIcon
          size={14}
          color={isActive ? colors.black : colors.gray}
          strokeWidth={2}
        />
        <Text
          style={[
            styles.categoryTabText,
            { color: isActive ? colors.black : colors.gray },
          ]}
        >
          {config.label}
        </Text>
        {selectedCount > 0 && (
          <View style={[styles.tabBadge, { backgroundColor: colors.black }]}>
            <Text style={[styles.tabBadgeText, { color: colors.white }]}>
              {selectedCount}
            </Text>
          </View>
        )}
      </View>
      {isActive && <View style={[styles.tabIndicator, { backgroundColor: colors.black }]} />}
    </TouchableOpacity>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function TagFilterSheet({ visible, onClose }: TagFilterSheetProps) {
  const colors = useSecretLibraryColors();
  const [activeCategory, setActiveCategory] = useState<TagCategory>('mood');

  // Store state
  const selectedTags = useContentFilterStore((s) => s.selectedTags);
  const lengthRange = useContentFilterStore((s) => s.lengthRange);
  const toggleTag = useContentFilterStore((s) => s.toggleTag);
  const setLengthRange = useContentFilterStore((s) => s.setLengthRange);
  const clearTags = useContentFilterStore((s) => s.clearTags);

  // Get selected count per category
  const getSelectedCount = useCallback((category: TagCategory) => {
    const categoryTags = TAG_CATEGORIES[category].tags;
    return categoryTags.filter((t) => selectedTags.includes(t)).length;
  }, [selectedTags]);

  // Handlers
  const handleToggleTag = useCallback((tag: string) => {
    Haptics.selectionAsync();
    toggleTag(tag);
  }, [toggleTag]);

  const handleCategoryChange = useCallback((category: TagCategory) => {
    Haptics.selectionAsync();
    setActiveCategory(category);
  }, []);

  const handleClear = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    clearTags();
  }, [clearTags]);

  const handleDone = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
  }, [onClose]);

  const filterCount = selectedTags.length + (lengthRange ? 1 : 0);
  const hasActiveFilter = filterCount > 0;
  const activeCategoryConfig = TAG_CATEGORIES[activeCategory];

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={styles.overlay}
        entering={FadeIn.duration(150)}
        exiting={FadeOut.duration(100)}
      >
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <View style={[styles.popup, { backgroundColor: colors.white }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.grayLine }]}>
            <Text style={[styles.headerTitle, { color: colors.black }]}>Filters</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="X" size={20} color={colors.black} />
            </TouchableOpacity>
          </View>

          {/* Selected Tags Summary */}
          {hasActiveFilter && (
            <View style={styles.selectedSummary}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.selectedTagsRow}>
                  {lengthRange && (
                    <View style={[styles.selectedTag, { backgroundColor: colors.black }]}>
                      <Timer size={12} color={colors.white} />
                      <Text style={[styles.selectedTagText, { color: colors.white }]}>
                        {lengthRange.min}-{lengthRange.max >= 30 ? '30+' : lengthRange.max}h
                      </Text>
                    </View>
                  )}
                  {selectedTags.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.selectedTag, { backgroundColor: colors.black }]}
                      onPress={() => handleToggleTag(tag)}
                    >
                      <Text style={[styles.selectedTagText, { color: colors.white }]}>
                        {formatTagLabel(tag)}
                      </Text>
                      <Icon name="X" size={12} color={colors.white} />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Length Range Section */}
          <LengthRangeSection
            lengthRange={lengthRange}
            onLengthChange={setLengthRange}
          />

          {/* Category Tabs */}
          <View style={styles.categoryTabsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryTabs}
            >
              {(Object.keys(TAG_CATEGORIES) as TagCategory[]).map((category) => (
                <CategoryTab
                  key={category}
                  category={category}
                  isActive={activeCategory === category}
                  selectedCount={getSelectedCount(category)}
                  onPress={() => handleCategoryChange(category)}
                />
              ))}
            </ScrollView>
          </View>

          {/* Tags Grid for Active Category */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.tagsGrid}>
              {activeCategoryConfig.tags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                const TagIcon = TAG_ICONS[tag] || BookOpen;
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tag,
                      { borderColor: colors.grayLine },
                      isSelected && { backgroundColor: colors.black, borderColor: colors.black },
                    ]}
                    onPress={() => handleToggleTag(tag)}
                  >
                    <TagIcon
                      size={16}
                      color={isSelected ? colors.white : colors.black}
                      strokeWidth={2}
                    />
                    <Text
                      style={[
                        styles.tagText,
                        { color: isSelected ? colors.white : colors.black },
                      ]}
                    >
                      {formatTagLabel(tag)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.grayLine }]}>
            {hasActiveFilter && (
              <TouchableOpacity style={styles.resetButton} onPress={handleClear}>
                <Text style={[styles.resetText, { color: colors.gray }]}>Clear All</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.applyButton, { backgroundColor: colors.black }]}
              onPress={handleDone}
            >
              <Text style={[styles.applyText, { color: colors.white }]}>
                Done{hasActiveFilter ? ` (${filterCount})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  popup: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontFamily: secretLibraryFonts.playfair.regular,
    fontSize: scale(20),
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  selectedSummary: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  selectedTagsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  selectedTagText: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(11),
  },
  // Length section
  lengthContainer: {
  },
  lengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  lengthTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lengthTitle: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(12),
    fontWeight: '500',
  },
  lengthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  lengthBadgeText: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(10),
    fontWeight: '600',
  },
  lengthSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  lengthRangeDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lengthRangeText: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(14),
    fontWeight: '600',
  },
  clearText: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(11),
    textTransform: 'uppercase',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabel: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(10),
    width: 32,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderValue: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(11),
    width: 36,
    textAlign: 'right',
  },
  // Category tabs
  categoryTabsContainer: {
  },
  categoryTabs: {
    paddingHorizontal: 8,
    gap: 0,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  categoryTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTabText: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(12),
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabIndicator: {
    height: 3,
    marginTop: 10,
    borderRadius: 1.5,
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  tabBadgeText: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(10),
    fontWeight: '700',
  },
  // Content area
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxHeight: 280,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
  },
  tagText: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(12),
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  resetButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  resetText: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(11),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  applyButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  applyText: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(11),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default TagFilterSheet;
