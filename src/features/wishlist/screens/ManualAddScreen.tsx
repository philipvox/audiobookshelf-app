/**
 * src/features/wishlist/screens/ManualAddScreen.tsx
 *
 * Full-screen form for manually adding books to the wishlist.
 * Allows users to enter book details for titles not in their library.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  X,
  Bookmark,
  Star,
  User,
  Mic,
  Library,
  Hash,
  FileText,
  Plus,
  ChevronLeft,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { WishlistPriority } from '../types';
import { useWishlistStore } from '../stores/wishlistStore';
import { spacing, radius, scale, layout, useTheme, ACCENT } from '@/shared/theme';

interface FormData {
  title: string;
  author: string;
  narrator: string;
  series: string;
  seriesSequence: string;
  notes: string;
}

const PRIORITY_OPTIONS: { value: WishlistPriority; label: string; description: string }[] = [
  { value: 'must-read', label: 'Must Read', description: 'High priority - read next' },
  { value: 'want-to-read', label: 'Want to Read', description: 'Normal priority' },
  { value: 'maybe', label: 'Maybe', description: 'Might read someday' },
];

export function ManualAddScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const addFromManualEntry = useWishlistStore((s) => s.addFromManualEntry);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    title: '',
    author: '',
    narrator: '',
    series: '',
    seriesSequence: '',
    notes: '',
  });
  const [priority, setPriority] = useState<WishlistPriority>('want-to-read');
  const [errors, setErrors] = useState<{ title?: string; author?: string }>({});

  // Go back
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Update form field
  const updateField = useCallback((field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (field === 'title' || field === 'author') {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }, []);

  // Validate and submit
  const handleSubmit = useCallback(() => {
    const newErrors: { title?: string; author?: string } = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.author.trim()) {
      newErrors.author = 'Author is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // Add to wishlist
    addFromManualEntry(
      {
        title: formData.title.trim(),
        author: formData.author.trim(),
        narrator: formData.narrator.trim() || undefined,
        series: formData.series.trim() || undefined,
        seriesSequence: formData.seriesSequence.trim() || undefined,
      },
      priority,
      formData.notes.trim() || undefined
    );

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  }, [formData, priority, addFromManualEntry, navigation]);

  // Select priority
  const handlePrioritySelect = useCallback((value: WishlistPriority) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPriority(value);
  }, []);

  const isValid = formData.title.trim() && formData.author.trim();

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background.primary }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border.default }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={28} color={colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Add to Wishlist</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={24} color={colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + scale(100) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title Field */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldLabel}>
              <Bookmark size={scale(16)} color={colors.text.secondary} strokeWidth={2} />
              <Text style={[styles.fieldLabelText, { color: colors.text.secondary }]}>Title *</Text>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.border.default, color: colors.text.primary }, errors.title && styles.inputError]}
              value={formData.title}
              onChangeText={(v) => updateField('title', v)}
              placeholder="Book title"
              placeholderTextColor={colors.text.tertiary}
              autoCapitalize="words"
              returnKeyType="next"
            />
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          </View>

          {/* Author Field */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldLabel}>
              <User size={scale(16)} color={colors.text.secondary} strokeWidth={2} />
              <Text style={[styles.fieldLabelText, { color: colors.text.secondary }]}>Author *</Text>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.border.default, color: colors.text.primary }, errors.author && styles.inputError]}
              value={formData.author}
              onChangeText={(v) => updateField('author', v)}
              placeholder="Author name"
              placeholderTextColor={colors.text.tertiary}
              autoCapitalize="words"
              returnKeyType="next"
            />
            {errors.author && <Text style={styles.errorText}>{errors.author}</Text>}
          </View>

          {/* Narrator Field */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldLabel}>
              <Mic size={scale(16)} color={colors.text.secondary} strokeWidth={2} />
              <Text style={[styles.fieldLabelText, { color: colors.text.secondary }]}>Narrator</Text>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.border.default, color: colors.text.primary }]}
              value={formData.narrator}
              onChangeText={(v) => updateField('narrator', v)}
              placeholder="Narrator name (optional)"
              placeholderTextColor={colors.text.tertiary}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          {/* Series Row */}
          <View style={styles.rowContainer}>
            <View style={[styles.fieldContainer, { flex: 2 }]}>
              <View style={styles.fieldLabel}>
                <Library size={scale(16)} color={colors.text.secondary} strokeWidth={2} />
                <Text style={[styles.fieldLabelText, { color: colors.text.secondary }]}>Series</Text>
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: colors.border.default, color: colors.text.primary }]}
                value={formData.series}
                onChangeText={(v) => updateField('series', v)}
                placeholder="Series name (optional)"
                placeholderTextColor={colors.text.tertiary}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
            <View style={[styles.fieldContainer, { flex: 1, marginLeft: spacing.sm }]}>
              <View style={styles.fieldLabel}>
                <Hash size={scale(16)} color={colors.text.secondary} strokeWidth={2} />
                <Text style={[styles.fieldLabelText, { color: colors.text.secondary }]}>#</Text>
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: colors.border.default, color: colors.text.primary }]}
                value={formData.seriesSequence}
                onChangeText={(v) => updateField('seriesSequence', v)}
                placeholder="1"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="numeric"
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Notes Field */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldLabel}>
              <FileText size={scale(16)} color={colors.text.secondary} strokeWidth={2} />
              <Text style={[styles.fieldLabelText, { color: colors.text.secondary }]}>Notes</Text>
            </View>
            <TextInput
              style={[styles.input, styles.inputMultiline, { backgroundColor: colors.border.default, color: colors.text.primary }]}
              value={formData.notes}
              onChangeText={(v) => updateField('notes', v)}
              placeholder="Why do you want to read this? (optional)"
              placeholderTextColor={colors.text.tertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Priority Selector */}
          <View style={styles.prioritySection}>
            <Text style={[styles.prioritySectionTitle, { color: colors.text.secondary }]}>Priority</Text>
            <View style={styles.priorityOptions}>
              {PRIORITY_OPTIONS.map((option) => {
                const isActive = priority === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.priorityOption,
                      { backgroundColor: colors.border.default },
                      isActive && styles.priorityOptionActive,
                      option.value === 'must-read' && isActive && styles.priorityOptionMustRead,
                    ]}
                    onPress={() => handlePrioritySelect(option.value)}
                    activeOpacity={0.7}
                  >
                    {option.value === 'must-read' ? (
                      <Star
                        size={scale(16)}
                        color={isActive ? colors.text.inverse : colors.text.secondary}
                        fill={isActive ? colors.text.inverse : 'transparent'}
                        strokeWidth={2}
                      />
                    ) : (
                      <Bookmark
                        size={scale(16)}
                        color={isActive ? colors.text.inverse : colors.text.secondary}
                        fill={isActive ? colors.text.inverse : 'transparent'}
                        strokeWidth={2}
                      />
                    )}
                    <View style={styles.priorityTextContainer}>
                      <Text style={[
                        styles.priorityLabel,
                        { color: colors.text.primary },
                        isActive && styles.priorityLabelActive,
                      ]}>
                        {option.label}
                      </Text>
                      <Text style={[
                        styles.priorityDescription,
                        { color: colors.text.tertiary },
                        isActive && styles.priorityDescriptionActive,
                      ]}>
                        {option.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Submit Button - Fixed at bottom */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md, borderTopColor: colors.border.default, backgroundColor: colors.background.primary }]}>
        <TouchableOpacity
          style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!isValid}
          activeOpacity={0.7}
        >
          <Plus size={scale(20)} color={colors.text.inverse} strokeWidth={2.5} />
          <Text style={styles.submitButtonText}>Add to Wishlist</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor set via colors.background.primary in JSX
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    // borderBottomColor set via colors.border.default in JSX
  },
  backButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    // color set via colors.text.primary in JSX
  },
  closeButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  fieldLabelText: {
    fontSize: scale(13),
    fontWeight: '500',
    // color set via colors.text.secondary in JSX
  },
  input: {
    // backgroundColor set via colors.border.default in JSX
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: scale(15),
    // color set via colors.text.primary in JSX
    minHeight: scale(48),
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#FF6B6B', // Error color - intentional
  },
  inputMultiline: {
    minHeight: scale(100),
    paddingTop: spacing.md,
  },
  errorText: {
    fontSize: scale(12),
    color: '#FF6B6B', // Error color - intentional
    marginTop: spacing.xs,
  },
  rowContainer: {
    flexDirection: 'row',
  },
  prioritySection: {
    marginTop: spacing.md,
  },
  prioritySectionTitle: {
    fontSize: scale(13),
    fontWeight: '600',
    // color set via colors.text.secondary in JSX
    marginBottom: spacing.sm,
  },
  priorityOptions: {
    gap: spacing.sm,
  },
  priorityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    // backgroundColor set via colors.border.default in JSX
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  priorityOptionActive: {
    backgroundColor: ACCENT,
  },
  priorityOptionMustRead: {
    backgroundColor: '#FF6B6B',
  },
  priorityTextContainer: {
    flex: 1,
  },
  priorityLabel: {
    fontSize: scale(14),
    fontWeight: '600',
    // color set via colors.text.primary in JSX
  },
  priorityLabelActive: {
    color: '#000', // Black text on accent
  },
  priorityDescription: {
    fontSize: scale(12),
    // color set via colors.text.tertiary in JSX
    marginTop: scale(1),
  },
  priorityDescriptionActive: {
    color: 'rgba(0,0,0,0.6)', // Intentional: dark text on accent
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    // borderTopColor set via colors.border.default in JSX
    // backgroundColor set via colors.background.primary in JSX
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: ACCENT,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: '#000', // Black text on accent
  },
});

export default ManualAddScreen;
