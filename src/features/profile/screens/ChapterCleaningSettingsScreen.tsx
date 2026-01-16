/**
 * src/features/profile/screens/ChapterCleaningSettingsScreen.tsx
 *
 * Secret Library Chapter Cleaning Settings
 * Cleaning level selection with examples.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Code, Info, ArrowRight, type LucideIcon } from 'lucide-react-native';
import { SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import { scale } from '@/shared/theme';
import {
  secretLibraryColors as colors,
  secretLibraryFonts as fonts,
} from '@/shared/theme/secretLibrary';
import {
  useChapterCleaningStore,
  CLEANING_LEVEL_INFO,
  type ChapterCleaningLevel,
} from '../stores/chapterCleaningStore';
import { SettingsHeader } from '../components/SettingsHeader';

// =============================================================================
// CONSTANTS
// =============================================================================

const LEVEL_OPTIONS: ChapterCleaningLevel[] = ['off', 'light', 'standard', 'aggressive'];

// =============================================================================
// COMPONENTS
// =============================================================================

interface LevelOptionProps {
  level: ChapterCleaningLevel;
  isSelected: boolean;
  onSelect: (level: ChapterCleaningLevel) => void;
  isRecommended?: boolean;
}

function LevelOption({ level, isSelected, onSelect, isRecommended }: LevelOptionProps) {
  const info = CLEANING_LEVEL_INFO[level];

  return (
    <TouchableOpacity
      style={[styles.levelOption, isSelected && styles.levelOptionSelected]}
      onPress={() => onSelect(level)}
      activeOpacity={0.7}
    >
      <View style={styles.levelOptionLeft}>
        {/* Radio circle */}
        <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
          {isSelected && <View style={styles.radioInner} />}
        </View>

        {/* Content */}
        <View style={styles.levelContent}>
          <View style={styles.labelRow}>
            <Text style={[styles.levelLabel, isSelected && styles.levelLabelSelected]}>
              {info.label}
            </Text>
            {isRecommended && (
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>Recommended</Text>
              </View>
            )}
          </View>
          <Text style={styles.levelDescription}>{info.description}</Text>
          <Text style={styles.levelExample}>{info.example}</Text>
        </View>
      </View>

      {/* Checkmark for selected */}
      {isSelected && <Check size={scale(20)} color={colors.black} strokeWidth={2} />}
    </TouchableOpacity>
  );
}

interface SettingsRowProps {
  Icon: LucideIcon;
  label: string;
  note?: string;
  switchValue: boolean;
  onSwitchChange: (value: boolean) => void;
}

function SettingsRow({ Icon, label, note, switchValue, onSwitchChange }: SettingsRowProps) {
  return (
    <View style={styles.settingsRow}>
      <View style={styles.rowLeft}>
        <View style={styles.iconContainer}>
          <Icon size={scale(18)} color={colors.gray} strokeWidth={1.5} />
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.rowLabel}>{label}</Text>
          {note && <Text style={styles.rowNote}>{note}</Text>}
        </View>
      </View>
      <Switch
        value={switchValue}
        onValueChange={onSwitchChange}
        trackColor={{ false: 'rgba(0,0,0,0.1)', true: colors.black }}
        thumbColor={colors.white}
        ios_backgroundColor="rgba(0,0,0,0.1)"
      />
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

interface ExampleRowProps {
  before: string;
  after: string;
  note?: string;
}

function ExampleRow({ before, after, note }: ExampleRowProps) {
  return (
    <View style={styles.exampleRow}>
      <View style={styles.exampleBefore}>
        <Text style={styles.exampleLabel}>Before</Text>
        <Text style={styles.exampleText} numberOfLines={1}>
          {before}
        </Text>
      </View>
      <ArrowRight size={scale(14)} color={colors.gray} strokeWidth={1.5} style={styles.exampleArrow} />
      <View style={styles.exampleAfter}>
        <Text style={styles.exampleLabel}>After</Text>
        <Text style={styles.exampleTextClean} numberOfLines={1}>
          {after}
        </Text>
        {note && <Text style={styles.exampleNote}>{note}</Text>}
      </View>
    </View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ChapterCleaningSettingsScreen() {
  const insets = useSafeAreaInsets();

  // Settings from store
  const level = useChapterCleaningStore((s) => s.level);
  const showOriginalNames = useChapterCleaningStore((s) => s.showOriginalNames);
  const setLevel = useChapterCleaningStore((s) => s.setLevel);
  const setShowOriginalNames = useChapterCleaningStore((s) => s.setShowOriginalNames);

  const handleLevelSelect = useCallback(
    (newLevel: ChapterCleaningLevel) => {
      setLevel(newLevel);
    },
    [setLevel]
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.grayLight} />
      <SettingsHeader title="Chapter Names" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: SCREEN_BOTTOM_PADDING + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={styles.introSection}>
          <Text style={styles.introText}>
            Clean up inconsistent chapter names for a more polished listening experience. Original
            metadata is always preserved.
          </Text>
        </View>

        {/* Cleaning Level Section */}
        <View style={styles.section}>
          <SectionHeader title="Cleaning Level" />
          <View style={styles.sectionCard}>
            {LEVEL_OPTIONS.map((opt) => (
              <LevelOption
                key={opt}
                level={opt}
                isSelected={level === opt}
                onSelect={handleLevelSelect}
                isRecommended={opt === 'standard'}
              />
            ))}
          </View>
        </View>

        {/* Advanced Section */}
        <View style={styles.section}>
          <SectionHeader title="Advanced" />
          <View style={styles.sectionCard}>
            <SettingsRow
              Icon={Code}
              label="Show Original Names"
              note="Display original metadata for debugging"
              switchValue={showOriginalNames}
              onSwitchChange={setShowOriginalNames}
            />
          </View>
        </View>

        {/* Before/After Examples */}
        <View style={styles.section}>
          <SectionHeader title="Example Transformations" />
          <View style={styles.sectionCard}>
            <ExampleRow before="01 - The Great Gatsby: Chapter 1" after="Chapter 1" />
            <ExampleRow before="D01T05 - Interview With the Vampire" after="Chapter 5" />
            <ExampleRow
              before="Chapter Twenty-Three: The Discovery"
              after="Chapter 23: The Discovery"
            />
            <ExampleRow before="Prologue" after="Prologue" note="Front/back matter preserved" />
          </View>
        </View>

        {/* Info Note */}
        <View style={styles.infoSection}>
          <Info size={scale(16)} color={colors.gray} strokeWidth={1.5} />
          <Text style={styles.infoText}>
            Changes only affect how chapters are displayed. Your server data remains unchanged.
            Based on analysis of 68,000+ real audiobook chapters.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grayLight,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  introSection: {
    marginBottom: 28,
  },
  introText: {
    fontFamily: fonts.playfair.regular,
    fontSize: scale(14),
    color: colors.black,
    lineHeight: scale(22),
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(9),
    color: colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    paddingLeft: 4,
  },
  sectionCard: {
    backgroundColor: colors.white,
  },
  // Level Option
  levelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  levelOptionSelected: {
    backgroundColor: colors.grayLight,
  },
  levelOptionLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  radioOuter: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    borderWidth: 2,
    borderColor: colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: scale(2),
  },
  radioOuterSelected: {
    borderColor: colors.black,
  },
  radioInner: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: colors.black,
  },
  levelContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelLabel: {
    fontFamily: fonts.playfair.regular,
    fontSize: scale(15),
    color: colors.black,
  },
  levelLabelSelected: {
    fontFamily: fonts.playfair.bold,
  },
  recommendedBadge: {
    backgroundColor: colors.grayLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  recommendedText: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(8),
    color: colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  levelDescription: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(9),
    color: colors.gray,
    marginTop: 2,
  },
  levelExample: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(9),
    color: colors.gray,
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Settings Row
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(8),
    backgroundColor: colors.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  rowLabel: {
    fontFamily: fonts.playfair.regular,
    fontSize: scale(15),
    color: colors.black,
  },
  rowNote: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(9),
    color: colors.gray,
    marginTop: 2,
  },
  // Example Row
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  exampleBefore: {
    flex: 1,
  },
  exampleArrow: {
    marginHorizontal: 8,
    marginTop: 18,
  },
  exampleAfter: {
    flex: 1,
  },
  exampleLabel: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(8),
    color: colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  exampleText: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(10),
    color: colors.gray,
  },
  exampleTextClean: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(10),
    color: colors.black,
  },
  exampleNote: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(8),
    color: colors.gray,
    marginTop: 2,
    fontStyle: 'italic',
  },
  // Info Section
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
  },
  infoText: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(9),
    color: colors.gray,
    flex: 1,
    lineHeight: scale(16),
  },
});
