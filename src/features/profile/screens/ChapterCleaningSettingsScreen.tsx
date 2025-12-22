/**
 * src/features/profile/screens/ChapterCleaningSettingsScreen.tsx
 *
 * Settings screen for chapter name cleaning preferences.
 * Allows users to select cleaning level and see examples.
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
import { useNavigation } from '@react-navigation/native';
import { Check, ChevronLeft, Code, Info, ArrowRight, type LucideIcon } from 'lucide-react-native';
import { SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import { colors, scale } from '@/shared/theme';
import {
  useChapterCleaningStore,
  CLEANING_LEVEL_INFO,
  type ChapterCleaningLevel,
} from '../stores/chapterCleaningStore';

const ACCENT = colors.accent;

// Level option data
const LEVEL_OPTIONS: ChapterCleaningLevel[] = ['off', 'light', 'standard', 'aggressive'];

// Radio Button Option Component
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
      {isSelected && (
        <Check size={scale(20)} color={ACCENT} strokeWidth={2.5} />
      )}
    </TouchableOpacity>
  );
}

// Settings Row Component (for toggle)
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
          <Icon
            size={scale(18)}
            color="rgba(255,255,255,0.8)"
            strokeWidth={2}
          />
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.rowLabel}>{label}</Text>
          {note ? <Text style={styles.rowNote}>{note}</Text> : null}
        </View>
      </View>
      <Switch
        value={switchValue}
        onValueChange={onSwitchChange}
        trackColor={{ false: 'rgba(255,255,255,0.2)', true: ACCENT }}
        thumbColor="#fff"
      />
    </View>
  );
}

// Section Header Component
function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export function ChapterCleaningSettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={scale(24)} color="#fff" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chapter Names</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={styles.introSection}>
          <Text style={styles.introText}>
            Clean up inconsistent chapter names for a more polished listening experience.
            Original metadata is always preserved.
          </Text>
        </View>

        {/* Cleaning Level Section */}
        <View style={styles.section}>
          <SectionHeader title="CLEANING LEVEL" />
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
          <SectionHeader title="ADVANCED" />
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
          <SectionHeader title="EXAMPLE TRANSFORMATIONS" />
          <View style={styles.examplesCard}>
            <ExampleRow
              before="01 - The Great Gatsby: Chapter 1"
              after="Chapter 1"
            />
            <ExampleRow
              before="D01T05 - Interview With the Vampire"
              after="Chapter 5"
            />
            <ExampleRow
              before="Chapter Twenty-Three: The Discovery"
              after="Chapter 23: The Discovery"
            />
            <ExampleRow
              before="Prologue"
              after="Prologue"
              note="Front/back matter preserved"
            />
          </View>
        </View>

        {/* Info Note */}
        <View style={styles.infoSection}>
          <Info
            size={scale(16)}
            color="rgba(255,255,255,0.4)"
            strokeWidth={2}
          />
          <Text style={styles.infoText}>
            Changes only affect how chapters are displayed. Your server data remains unchanged.
            Based on analysis of 68,000+ real audiobook chapters.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// Example Row Component
function ExampleRow({
  before,
  after,
  note,
}: {
  before: string;
  after: string;
  note?: string;
}) {
  return (
    <View style={styles.exampleRow}>
      <View style={styles.exampleBefore}>
        <Text style={styles.exampleLabel}>Before</Text>
        <Text style={styles.exampleText} numberOfLines={1}>
          {before}
        </Text>
      </View>
      <ArrowRight
        size={scale(14)}
        color="rgba(255,255,255,0.3)"
        strokeWidth={2}
        style={styles.exampleArrow}
      />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: '#fff',
  },
  headerSpacer: {
    width: scale(40),
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: SCREEN_BOTTOM_PADDING,
  },
  introSection: {
    marginHorizontal: scale(20),
    marginBottom: scale(24),
  },
  introText: {
    fontSize: scale(14),
    color: 'rgba(255,255,255,0.6)',
    lineHeight: scale(20),
  },
  section: {
    marginBottom: scale(24),
  },
  sectionHeader: {
    fontSize: scale(13),
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
    marginHorizontal: scale(20),
    marginBottom: scale(8),
  },
  sectionCard: {
    marginHorizontal: scale(16),
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: scale(12),
    overflow: 'hidden',
  },
  levelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(14),
    paddingHorizontal: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  levelOptionSelected: {
    backgroundColor: 'rgba(243, 182, 12, 0.08)',
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
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: scale(2),
  },
  radioOuterSelected: {
    borderColor: ACCENT,
  },
  radioInner: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: ACCENT,
  },
  levelContent: {
    flex: 1,
    marginLeft: scale(12),
    marginRight: scale(12),
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  levelLabel: {
    fontSize: scale(15),
    fontWeight: '500',
    color: '#fff',
  },
  levelLabelSelected: {
    color: ACCENT,
  },
  recommendedBadge: {
    backgroundColor: 'rgba(243, 182, 12, 0.15)',
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(4),
  },
  recommendedText: {
    fontSize: scale(10),
    fontWeight: '600',
    color: ACCENT,
  },
  levelDescription: {
    fontSize: scale(12),
    color: 'rgba(255,255,255,0.5)',
    marginTop: scale(2),
  },
  levelExample: {
    fontSize: scale(11),
    color: 'rgba(255,255,255,0.35)',
    marginTop: scale(4),
    fontFamily: 'monospace',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(14),
    paddingHorizontal: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowContent: {
    flex: 1,
    marginLeft: scale(12),
    marginRight: scale(12),
  },
  rowLabel: {
    fontSize: scale(15),
    fontWeight: '500',
    color: '#fff',
  },
  rowNote: {
    fontSize: scale(12),
    color: 'rgba(255,255,255,0.5)',
    marginTop: scale(2),
  },
  examplesCard: {
    marginHorizontal: scale(16),
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: scale(12),
    overflow: 'hidden',
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: scale(12),
    paddingHorizontal: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  exampleBefore: {
    flex: 1,
  },
  exampleArrow: {
    marginHorizontal: scale(8),
    marginTop: scale(14),
  },
  exampleAfter: {
    flex: 1,
  },
  exampleLabel: {
    fontSize: scale(10),
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: scale(4),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exampleText: {
    fontSize: scale(12),
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'monospace',
  },
  exampleTextClean: {
    fontSize: scale(12),
    color: ACCENT,
    fontFamily: 'monospace',
  },
  exampleNote: {
    fontSize: scale(10),
    color: 'rgba(255,255,255,0.35)',
    marginTop: scale(2),
    fontStyle: 'italic',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(8),
    marginHorizontal: scale(20),
    marginTop: scale(8),
  },
  infoText: {
    flex: 1,
    fontSize: scale(12),
    color: 'rgba(255,255,255,0.4)',
    lineHeight: scale(18),
  },
});
