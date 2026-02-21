/**
 * src/features/home/screens/SpinePlaygroundScreen.tsx
 *
 * Spine style editor with clean, visual controls.
 * Dark mode design with sliders and large toggle buttons.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Share,
  Clipboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import { colors } from '@/shared/theme';
import { GENRE_PROFILES } from '../utils/spine/profiles';
import { ChevronLeft, ChevronRight, Share2 } from 'lucide-react-native';

// =============================================================================
// SLIDER ROW COMPONENT
// =============================================================================

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}

function SliderRow({ label, value, min, max, step = 1, suffix = '', onChange }: SliderRowProps) {
  return (
    <View style={sliderStyles.container}>
      <View style={sliderStyles.header}>
        <Text style={sliderStyles.label}>{label}</Text>
        <Text style={sliderStyles.value}>{Math.round(value * 10) / 10}{suffix}</Text>
      </View>
      <View style={sliderStyles.sliderContainer}>
        <Text style={sliderStyles.rangeLabel}>{min}</Text>
        <Slider
          style={sliderStyles.slider}
          minimumValue={min}
          maximumValue={max}
          step={step}
          value={value}
          onValueChange={onChange}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor="#333"
          thumbTintColor={colors.accent}
        />
        <Text style={sliderStyles.rangeLabel}>{max}</Text>
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#888',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
    minWidth: 50,
    textAlign: 'right',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  rangeLabel: {
    fontSize: 11,
    color: '#555',
    width: 28,
    textAlign: 'center',
  },
});

// =============================================================================
// TOGGLE BUTTON COMPONENT
// =============================================================================

interface ToggleButtonProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}

function ToggleButton({ options, value, onChange, label }: ToggleButtonProps) {
  return (
    <View style={toggleStyles.container}>
      <Text style={toggleStyles.label}>{label}</Text>
      <View style={toggleStyles.optionsRow}>
        {options.map((opt) => {
          const isActive = value === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[toggleStyles.option, isActive && toggleStyles.optionActive]}
              onPress={() => onChange(opt.value)}
            >
              <Text style={[toggleStyles.optionText, isActive && toggleStyles.optionTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const toggleStyles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  option: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1A1A1A',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#333',
  },
  optionActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#AAA',
  },
  optionTextActive: {
    color: '#FFF',
  },
});

// =============================================================================
// CONSTANTS
// =============================================================================

const FONT_OPTIONS = [
  { value: 'PlayfairDisplay-Bold', label: 'Playfair B' },
  { value: 'PlayfairDisplay-Regular', label: 'Playfair' },
  { value: 'Lora-Bold', label: 'Lora B' },
  { value: 'Lora-Regular', label: 'Lora' },
  { value: 'Oswald-Bold', label: 'Oswald B' },
  { value: 'Oswald-Regular', label: 'Oswald' },
  { value: 'BebasNeue-Regular', label: 'Bebas' },
  { value: 'NotoSerif-Bold', label: 'Noto B' },
  { value: 'LibreBaskerville-Bold', label: 'Libre B' },
  { value: 'GravitasOne-Regular', label: 'Gravitas' },
  { value: 'Orbitron-Regular', label: 'Orbitron' },
];

const ORIENTATION_OPTIONS = [
  { value: 'horizontal', label: 'Horiz' },
  { value: 'vertical-up', label: 'Vert ↑' },
  { value: 'vertical-down', label: 'Vert ↓' },
];

const CASE_OPTIONS = [
  { value: 'uppercase', label: 'UPPER' },
  { value: 'lowercase', label: 'lower' },
  { value: 'capitalize', label: 'Title' },
];

const ALIGN_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

const PLACEMENT_OPTIONS = [
  { value: 'top', label: 'Top' },
  { value: 'center', label: 'Mid' },
  { value: 'bottom', label: 'Bot' },
];

const DECORATION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'divider-line', label: 'Divider' },
  { value: 'top-line', label: 'Top' },
  { value: 'bottom-line', label: 'Bottom' },
];

const LINE_STYLE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'thin', label: 'Thin' },
  { value: 'medium', label: 'Med' },
  { value: 'thick', label: 'Thick' },
];

const TREATMENT_OPTIONS = [
  { value: 'plain', label: 'Plain' },
  { value: 'prefixed', label: 'by...' },
  { value: 'underlined', label: 'Under' },
];

const SIZES = ['small', 'medium', 'large'] as const;
type SpineSize = typeof SIZES[number];

// Smaller preview sizes
const SIZE_WIDTHS = { small: 28, medium: 44, large: 60 };
const SIZE_HEIGHTS = { small: 120, medium: 160, large: 200 };

const ALL_GENRES = GENRE_PROFILES.map(p => ({ id: p.id, name: p.name }));

// =============================================================================
// TYPES & DEFAULTS
// =============================================================================

interface SizeConfig {
  title: {
    fontFamily: string;
    fontSizeMin: number;
    fontSizeMax: number;
    orientation: string;
    case: string;
    align: string;
    placement: string;
    letterSpacing: number;
    heightPercent: number;
  };
  author: {
    fontFamily: string;
    fontSizeMin: number;
    fontSizeMax: number;
    orientation: string;
    case: string;
    align: string;
    placement: string;
    letterSpacing: number;
    heightPercent: number;
    treatment: string;
  };
  decoration: {
    element: string;
    lineStyle: string;
  };
}

interface GenreConfig {
  small: SizeConfig;
  medium: SizeConfig;
  large: SizeConfig;
}

function getDefaultSizeConfig(profile: any, size: SpineSize): SizeConfig {
  const sizeOverrides = profile.title.sizes?.[size] || {};
  const authorOverrides = profile.author.sizes?.[size] || {};
  const baseFontSize = sizeOverrides.fontSize || profile.title.fontSize || 14;
  const authorFontSize = authorOverrides.fontSize || profile.author.fontSize || 10;

  return {
    title: {
      fontFamily: sizeOverrides.fontFamily || profile.title.fontFamily || 'PlayfairDisplay-Bold',
      fontSizeMin: Math.max(8, baseFontSize - 4),
      fontSizeMax: baseFontSize + 8,
      orientation: sizeOverrides.orientation || profile.title.orientation || 'vertical-up',
      case: sizeOverrides.case || profile.title.case || 'uppercase',
      align: sizeOverrides.align || profile.title.align || 'center',
      placement: sizeOverrides.placement || profile.title.placement || 'center',
      letterSpacing: sizeOverrides.letterSpacing ?? profile.title.letterSpacing ?? 1,
      heightPercent: sizeOverrides.heightPercent || profile.title.heightPercent || 65,
    },
    author: {
      fontFamily: authorOverrides.fontFamily || profile.author.fontFamily || 'PlayfairDisplay-Regular',
      fontSizeMin: Math.max(6, authorFontSize - 2),
      fontSizeMax: authorFontSize + 6,
      orientation: authorOverrides.orientation || profile.author.orientation || 'vertical-up',
      case: authorOverrides.case || profile.author.case || 'uppercase',
      align: authorOverrides.align || profile.author.align || 'center',
      placement: authorOverrides.placement || profile.author.placement || 'center',
      letterSpacing: authorOverrides.letterSpacing ?? profile.author.letterSpacing ?? 0.5,
      heightPercent: authorOverrides.heightPercent || profile.author.heightPercent || 30,
      treatment: authorOverrides.treatment || profile.author.treatment || 'plain',
    },
    decoration: {
      element: profile.decoration?.element || 'none',
      lineStyle: profile.decoration?.lineStyle || 'none',
    },
  };
}

function getDefaultGenreConfig(profileId: string): GenreConfig {
  const profile = GENRE_PROFILES.find(p => p.id === profileId) || GENRE_PROFILES[0];
  return {
    small: getDefaultSizeConfig(profile, 'small'),
    medium: getDefaultSizeConfig(profile, 'medium'),
    large: getDefaultSizeConfig(profile, 'large'),
  };
}

// =============================================================================
// SPINE PREVIEW (Compact)
// =============================================================================

interface SpinePreviewProps {
  config: SizeConfig;
  width: number;
  height: number;
  title: string;
  author: string;
}

function SpinePreview({ config, width, height, title, author }: SpinePreviewProps) {
  const { title: tc, author: ac, decoration } = config;

  const processText = (text: string, textCase: string) => {
    switch (textCase) {
      case 'uppercase': return text.toUpperCase();
      case 'lowercase': return text.toLowerCase();
      default: return text;
    }
  };

  const displayTitle = processText(title, tc.case);
  const displayAuthor = ac.treatment === 'prefixed'
    ? `by ${processText(author, ac.case)}`
    : processText(author, ac.case);

  const titleHeight = (height * tc.heightPercent) / 100;
  const authorHeight = (height * ac.heightPercent) / 100;

  const titleFontSize = Math.min((tc.fontSizeMin + tc.fontSizeMax) / 2, width * 0.8);
  const authorFontSize = Math.min((ac.fontSizeMin + ac.fontSizeMax) / 2, width * 0.7);

  const isVerticalTitle = tc.orientation.includes('vertical');
  const isVerticalAuthor = ac.orientation.includes('vertical');

  const getTitleRotation = () => {
    if (tc.orientation === 'vertical-up') return '-90deg';
    if (tc.orientation === 'vertical-down') return '90deg';
    return '0deg';
  };

  const getAuthorRotation = () => {
    if (ac.orientation === 'vertical-up') return '-90deg';
    if (ac.orientation === 'vertical-down') return '90deg';
    return '0deg';
  };

  const spineBg = '#2A2A2A';
  const textColor = '#FFFFFF';
  const lineColor = 'rgba(255,255,255,0.25)';

  return (
    <View style={[previewStyles.spine, { width, height, backgroundColor: spineBg }]}>
      {(decoration.element === 'top-line' || decoration.element === 'divider-line') && (
        <View style={[previewStyles.decoLine, {
          top: 4,
          height: decoration.lineStyle === 'thick' ? 2 : 1,
          backgroundColor: lineColor,
        }]} />
      )}

      <View style={[previewStyles.section, { height: titleHeight }]}>
        {isVerticalTitle ? (
          <View style={[
            previewStyles.verticalTextContainer,
            { justifyContent: tc.placement === 'top' ? 'flex-start' : tc.placement === 'bottom' ? 'flex-end' : 'center' }
          ]}>
            <Text
              style={[previewStyles.text, {
                fontSize: titleFontSize,
                fontFamily: tc.fontFamily,
                letterSpacing: tc.letterSpacing,
                color: textColor,
                transform: [{ rotate: getTitleRotation() }],
                width: titleHeight,
                textAlign: tc.align as any,
              }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
            >
              {displayTitle}
            </Text>
          </View>
        ) : (
          <View style={[
            previewStyles.horizontalTextContainer,
            { justifyContent: tc.placement === 'top' ? 'flex-start' : tc.placement === 'bottom' ? 'flex-end' : 'center' }
          ]}>
            <Text
              style={[previewStyles.text, {
                fontSize: titleFontSize,
                fontFamily: tc.fontFamily,
                letterSpacing: tc.letterSpacing,
                color: textColor,
                textAlign: tc.align as any,
                paddingHorizontal: 2,
              }]}
              numberOfLines={4}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
            >
              {displayTitle}
            </Text>
          </View>
        )}
      </View>

      {decoration.element === 'divider-line' && (
        <View style={[previewStyles.dividerLine, {
          height: decoration.lineStyle === 'thick' ? 2 : 1,
          backgroundColor: lineColor,
        }]} />
      )}

      <View style={[previewStyles.section, { height: authorHeight }]}>
        {isVerticalAuthor ? (
          <View style={[
            previewStyles.verticalTextContainer,
            { justifyContent: ac.placement === 'top' ? 'flex-start' : ac.placement === 'bottom' ? 'flex-end' : 'center' }
          ]}>
            <Text
              style={[previewStyles.text, {
                fontSize: authorFontSize,
                fontFamily: ac.fontFamily,
                letterSpacing: ac.letterSpacing,
                color: textColor,
                opacity: 0.8,
                transform: [{ rotate: getAuthorRotation() }],
                width: authorHeight,
                textAlign: ac.align as any,
                textDecorationLine: ac.treatment === 'underlined' ? 'underline' : 'none',
              }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
            >
              {displayAuthor}
            </Text>
          </View>
        ) : (
          <View style={[
            previewStyles.horizontalTextContainer,
            { justifyContent: ac.placement === 'top' ? 'flex-start' : ac.placement === 'bottom' ? 'flex-end' : 'center' }
          ]}>
            <Text
              style={[previewStyles.text, {
                fontSize: authorFontSize,
                fontFamily: ac.fontFamily,
                letterSpacing: ac.letterSpacing,
                color: textColor,
                opacity: 0.8,
                textAlign: ac.align as any,
                paddingHorizontal: 2,
                textDecorationLine: ac.treatment === 'underlined' ? 'underline' : 'none',
              }]}
              numberOfLines={3}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
            >
              {displayAuthor}
            </Text>
          </View>
        )}
      </View>

      {decoration.element === 'bottom-line' && (
        <View style={[previewStyles.decoLine, {
          bottom: 4,
          height: decoration.lineStyle === 'thick' ? 2 : 1,
          backgroundColor: lineColor,
        }]} />
      )}
    </View>
  );
}

const previewStyles = StyleSheet.create({
  spine: {
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#444',
  },
  section: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalTextContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalTextContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingVertical: 4,
  },
  text: {
    fontWeight: '600',
  },
  decoLine: {
    position: 'absolute',
    left: 4,
    right: 4,
  },
  dividerLine: {
    marginHorizontal: 4,
  },
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SpinePlaygroundScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [selectedGenreIndex, setSelectedGenreIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<SpineSize>('medium');
  const [activeSection, setActiveSection] = useState<'title' | 'author' | 'decoration'>('title');
  const [genreConfigs, setGenreConfigs] = useState<Record<string, GenreConfig>>({});
  const [previewTitle, setPreviewTitle] = useState('The Midnight Library');
  const [previewAuthor, setPreviewAuthor] = useState('Matt Haig');

  const selectedGenre = ALL_GENRES[selectedGenreIndex];

  const currentGenreConfig = useMemo(() => {
    return genreConfigs[selectedGenre.id] || getDefaultGenreConfig(selectedGenre.id);
  }, [selectedGenre.id, genreConfigs]);

  const currentSizeConfig = currentGenreConfig[selectedSize];

  const prevGenre = () => setSelectedGenreIndex(i => i > 0 ? i - 1 : ALL_GENRES.length - 1);
  const nextGenre = () => setSelectedGenreIndex(i => i < ALL_GENRES.length - 1 ? i + 1 : 0);

  const updateConfig = useCallback((
    section: 'title' | 'author' | 'decoration',
    key: string,
    value: any
  ) => {
    setGenreConfigs(prev => {
      const current = prev[selectedGenre.id] || getDefaultGenreConfig(selectedGenre.id);
      return {
        ...prev,
        [selectedGenre.id]: {
          ...current,
          [selectedSize]: {
            ...current[selectedSize],
            [section]: {
              ...current[selectedSize][section],
              [key]: value,
            },
          },
        },
      };
    });
  }, [selectedGenre.id, selectedSize]);

  const exportConfig = useCallback(async () => {
    const allConfigs: Record<string, any> = {};
    for (const [id, config] of Object.entries(genreConfigs)) {
      const genre = ALL_GENRES.find(g => g.id === id);
      if (genre) allConfigs[id] = { name: genre.name, ...config };
    }
    if (Object.keys(allConfigs).length === 0) {
      Alert.alert('No Changes', 'Modify some genres first');
      return;
    }
    const json = JSON.stringify(allConfigs, null, 2);
    try {
      await Share.share({ message: json });
    } catch {
      Clipboard.setString(json);
      Alert.alert('Copied', `${Object.keys(allConfigs).length} configs copied`);
    }
  }, [genreConfigs]);

  const isModified = !!genreConfigs[selectedGenre.id];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ChevronLeft size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Spine Editor</Text>
        <TouchableOpacity onPress={exportConfig} style={styles.headerBtn}>
          <Share2 size={20} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Genre Nav */}
      <View style={styles.genreNav}>
        <TouchableOpacity onPress={prevGenre} style={styles.navArrow}>
          <ChevronLeft size={24} color="#666" />
        </TouchableOpacity>
        <View style={styles.genreInfo}>
          <Text style={styles.genreName} numberOfLines={1}>{selectedGenre.name}</Text>
          {isModified && <View style={styles.modifiedDot} />}
        </View>
        <TouchableOpacity onPress={nextGenre} style={styles.navArrow}>
          <ChevronRight size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Compact Preview */}
      <View style={styles.previewSection}>
        <View style={styles.previewRow}>
          {SIZES.map(size => (
            <TouchableOpacity
              key={size}
              style={[styles.previewItem, selectedSize === size && styles.previewItemActive]}
              onPress={() => setSelectedSize(size)}
            >
              <SpinePreview
                config={currentGenreConfig[size]}
                width={SIZE_WIDTHS[size]}
                height={SIZE_HEIGHTS[size]}
                title={previewTitle}
                author={previewAuthor}
              />
              <Text style={[styles.sizeLabel, selectedSize === size && styles.sizeLabelActive]}>
                {size[0].toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Size + Section Tabs */}
      <View style={styles.tabsContainer}>
        <View style={styles.sizeTabs}>
          {SIZES.map(size => (
            <TouchableOpacity
              key={size}
              style={[styles.sizeTab, selectedSize === size && styles.sizeTabActive]}
              onPress={() => setSelectedSize(size)}
            >
              <Text style={[styles.sizeTabText, selectedSize === size && styles.sizeTabTextActive]}>
                {size.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.sectionTabs}>
          {(['title', 'author', 'decoration'] as const).map(section => (
            <TouchableOpacity
              key={section}
              style={[styles.sectionTab, activeSection === section && styles.sectionTabActive]}
              onPress={() => setActiveSection(section)}
            >
              <Text style={[styles.sectionTabText, activeSection === section && styles.sectionTabTextActive]}>
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Controls */}
      <ScrollView
        style={styles.controls}
        contentContainerStyle={[styles.controlsContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* TITLE */}
        {activeSection === 'title' && (
          <>
            <ToggleButton
              label="Font"
              options={FONT_OPTIONS}
              value={currentSizeConfig.title.fontFamily}
              onChange={v => updateConfig('title', 'fontFamily', v)}
            />
            <SliderRow
              label="Font Size Min"
              value={currentSizeConfig.title.fontSizeMin}
              min={6}
              max={32}
              suffix="px"
              onChange={v => updateConfig('title', 'fontSizeMin', v)}
            />
            <SliderRow
              label="Font Size Max"
              value={currentSizeConfig.title.fontSizeMax}
              min={10}
              max={72}
              suffix="px"
              onChange={v => updateConfig('title', 'fontSizeMax', v)}
            />
            <ToggleButton
              label="Orientation"
              options={ORIENTATION_OPTIONS}
              value={currentSizeConfig.title.orientation}
              onChange={v => updateConfig('title', 'orientation', v)}
            />
            <ToggleButton
              label="Case"
              options={CASE_OPTIONS}
              value={currentSizeConfig.title.case}
              onChange={v => updateConfig('title', 'case', v)}
            />
            <ToggleButton
              label="Align"
              options={ALIGN_OPTIONS}
              value={currentSizeConfig.title.align}
              onChange={v => updateConfig('title', 'align', v)}
            />
            <ToggleButton
              label="Placement"
              options={PLACEMENT_OPTIONS}
              value={currentSizeConfig.title.placement}
              onChange={v => updateConfig('title', 'placement', v)}
            />
            <SliderRow
              label="Letter Spacing"
              value={currentSizeConfig.title.letterSpacing}
              min={-2}
              max={6}
              step={0.5}
              onChange={v => updateConfig('title', 'letterSpacing', v)}
            />
            <SliderRow
              label="Height %"
              value={currentSizeConfig.title.heightPercent}
              min={30}
              max={85}
              step={5}
              suffix="%"
              onChange={v => updateConfig('title', 'heightPercent', v)}
            />
          </>
        )}

        {/* AUTHOR */}
        {activeSection === 'author' && (
          <>
            <ToggleButton
              label="Font"
              options={FONT_OPTIONS}
              value={currentSizeConfig.author.fontFamily}
              onChange={v => updateConfig('author', 'fontFamily', v)}
            />
            <SliderRow
              label="Font Size Min"
              value={currentSizeConfig.author.fontSizeMin}
              min={6}
              max={24}
              suffix="px"
              onChange={v => updateConfig('author', 'fontSizeMin', v)}
            />
            <SliderRow
              label="Font Size Max"
              value={currentSizeConfig.author.fontSizeMax}
              min={8}
              max={48}
              suffix="px"
              onChange={v => updateConfig('author', 'fontSizeMax', v)}
            />
            <ToggleButton
              label="Treatment"
              options={TREATMENT_OPTIONS}
              value={currentSizeConfig.author.treatment}
              onChange={v => updateConfig('author', 'treatment', v)}
            />
            <ToggleButton
              label="Orientation"
              options={ORIENTATION_OPTIONS}
              value={currentSizeConfig.author.orientation}
              onChange={v => updateConfig('author', 'orientation', v)}
            />
            <ToggleButton
              label="Case"
              options={CASE_OPTIONS}
              value={currentSizeConfig.author.case}
              onChange={v => updateConfig('author', 'case', v)}
            />
            <ToggleButton
              label="Align"
              options={ALIGN_OPTIONS}
              value={currentSizeConfig.author.align}
              onChange={v => updateConfig('author', 'align', v)}
            />
            <ToggleButton
              label="Placement"
              options={PLACEMENT_OPTIONS}
              value={currentSizeConfig.author.placement}
              onChange={v => updateConfig('author', 'placement', v)}
            />
            <SliderRow
              label="Letter Spacing"
              value={currentSizeConfig.author.letterSpacing}
              min={-1}
              max={4}
              step={0.5}
              onChange={v => updateConfig('author', 'letterSpacing', v)}
            />
            <SliderRow
              label="Height %"
              value={currentSizeConfig.author.heightPercent}
              min={15}
              max={50}
              step={5}
              suffix="%"
              onChange={v => updateConfig('author', 'heightPercent', v)}
            />
          </>
        )}

        {/* DECORATION */}
        {activeSection === 'decoration' && (
          <>
            <ToggleButton
              label="Element"
              options={DECORATION_OPTIONS}
              value={currentSizeConfig.decoration.element}
              onChange={v => updateConfig('decoration', 'element', v)}
            />
            <ToggleButton
              label="Line Style"
              options={LINE_STYLE_OPTIONS}
              value={currentSizeConfig.decoration.lineStyle}
              onChange={v => updateConfig('decoration', 'lineStyle', v)}
            />
          </>
        )}

        {/* Preview Text */}
        <View style={styles.previewInputs}>
          <Text style={styles.inputLabel}>Preview Text</Text>
          <TextInput
            style={styles.input}
            value={previewTitle}
            onChangeText={setPreviewTitle}
            placeholder="Title"
            placeholderTextColor="#444"
          />
          <TextInput
            style={styles.input}
            value={previewAuthor}
            onChangeText={setPreviewAuthor}
            placeholder="Author"
            placeholderTextColor="#444"
          />
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
    backgroundColor: '#000',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    height: 44,
  },
  headerBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },

  // Genre Nav
  genreNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  navArrow: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genreInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  genreName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
  },
  modifiedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },

  // Preview Section
  previewSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 12,
  },
  previewItem: {
    alignItems: 'center',
    padding: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  previewItemActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(243, 182, 12, 0.1)',
  },
  sizeLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '600',
    color: '#555',
  },
  sizeLabelActive: {
    color: colors.accent,
  },

  // Tabs
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  sizeTabs: {
    flexDirection: 'row',
    backgroundColor: '#0A0A0A',
  },
  sizeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  sizeTabActive: {
    backgroundColor: '#1A1A1A',
  },
  sizeTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#444',
    letterSpacing: 1,
  },
  sizeTabTextActive: {
    color: colors.accent,
  },
  sectionTabs: {
    flexDirection: 'row',
  },
  sectionTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  sectionTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
  },
  sectionTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  sectionTabTextActive: {
    color: '#FFF',
  },

  // Controls
  controls: {
    flex: 1,
  },
  controlsContent: {
    padding: 16,
  },

  // Preview Inputs
  previewInputs: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#FFF',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
});

export default SpinePlaygroundScreen;
