/**
 * src/features/player/components/BookmarkSheet.tsx
 *
 * Enhanced bookmark sheet with support for notes.
 * Features:
 * - Add bookmarks with title and note
 * - Edit existing bookmark titles and notes
 * - Jump to bookmark position
 * - Delete bookmarks
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore, Bookmark } from '../stores/playerStore';
import { useShallow } from 'zustand/react/shallow';
import { Icon } from '@/shared/components/Icon';
import { theme } from '@/shared/theme';

interface BookmarkSheetProps {
  visible: boolean;
  onClose: () => void;
}

type Mode = 'list' | 'add' | 'edit';

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function BookmarkSheet({ visible, onClose }: BookmarkSheetProps) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('list');
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');

  // Use useShallow to prevent infinite re-renders
  const { position, bookmarks, chapters, currentBook } = usePlayerStore(
    useShallow((s) => ({
      position: s.position,
      bookmarks: s.bookmarks,
      chapters: s.chapters,
      currentBook: s.currentBook,
    }))
  );

  // Actions - stable function references
  const addBookmark = usePlayerStore((s) => s.addBookmark);
  const updateBookmark = usePlayerStore((s) => s.updateBookmark);
  const removeBookmark = usePlayerStore((s) => s.removeBookmark);
  const seekTo = usePlayerStore((s) => s.seekTo);

  // Filter bookmarks for current book
  const currentBookmarks = currentBook
    ? bookmarks.filter((b) => b.id.startsWith(currentBook.id))
    : [];

  // Get current chapter title for the bookmark
  const getCurrentChapterTitle = useCallback(
    (time: number): string | null => {
      for (const chapter of chapters) {
        if (time >= chapter.start && time < chapter.end) {
          return chapter.title;
        }
      }
      return null;
    },
    [chapters]
  );

  const resetForm = () => {
    setTitle('');
    setNote('');
    setEditingBookmark(null);
    setMode('list');
  };

  const handleAddBookmark = async () => {
    if (!currentBook) return;

    const bookmarkTitle = title.trim() || `Bookmark at ${formatTime(position)}`;
    const chapterTitle = getCurrentChapterTitle(position);

    await addBookmark({
      title: bookmarkTitle,
      note: note.trim() || null,
      time: position,
      chapterTitle,
    });

    resetForm();
  };

  const handleEditBookmark = async () => {
    if (!editingBookmark) return;

    await updateBookmark(editingBookmark.id, {
      title: title.trim() || editingBookmark.title,
      note: note.trim() || null,
    });

    resetForm();
  };

  const handleSelectBookmark = async (bookmark: Bookmark) => {
    await seekTo(bookmark.time);
    onClose();
  };

  const handleEditPress = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark);
    setTitle(bookmark.title);
    setNote(bookmark.note || '');
    setMode('edit');
  };

  const handleDeleteBookmark = (bookmark: Bookmark) => {
    Alert.alert('Delete Bookmark', `Delete "${bookmark.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => removeBookmark(bookmark.id),
      },
    ]);
  };

  const renderBookmark = ({ item }: { item: Bookmark }) => (
    <TouchableOpacity
      style={styles.bookmarkItem}
      onPress={() => handleSelectBookmark(item)}
      onLongPress={() => handleEditPress(item)}
      activeOpacity={0.7}
    >
      <Icon name="bookmark" size={18} color={theme.colors.primary[500]} set="ionicons" />
      <View style={styles.bookmarkInfo}>
        <Text style={styles.bookmarkTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {item.note && (
          <Text style={styles.bookmarkNote} numberOfLines={2}>
            {item.note}
          </Text>
        )}
        <View style={styles.bookmarkMeta}>
          <Text style={styles.bookmarkTime}>{formatTime(item.time)}</Text>
          {item.chapterTitle && (
            <Text style={styles.bookmarkChapter} numberOfLines={1}>
              · {item.chapterTitle}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.bookmarkActions}>
        <TouchableOpacity
          onPress={() => handleEditPress(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.actionButton}
        >
          <Icon name="create-outline" size={18} color={theme.colors.text.tertiary} set="ionicons" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDeleteBookmark(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.actionButton}
        >
          <Icon name="trash-outline" size={18} color={theme.colors.text.tertiary} set="ionicons" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderForm = () => (
    <View style={styles.formSection}>
      <Text style={styles.formTitle}>
        {mode === 'add' ? `New Bookmark at ${formatTime(position)}` : 'Edit Bookmark'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Title (optional)"
        placeholderTextColor={theme.colors.text.tertiary}
        value={title}
        onChangeText={setTitle}
        autoFocus={mode === 'add'}
        returnKeyType="next"
      />

      <TextInput
        style={[styles.input, styles.noteInput]}
        placeholder="Add a note... (optional)"
        placeholderTextColor={theme.colors.text.tertiary}
        value={note}
        onChangeText={setNote}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <View style={styles.formActions}>
        <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={mode === 'add' ? handleAddBookmark : handleEditBookmark}
        >
          <Text style={styles.saveButtonText}>{mode === 'add' ? 'Save' : 'Update'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.dismissArea} onPress={onClose} activeOpacity={1} />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + theme.spacing[2] }]}>
          <View style={styles.header}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>Bookmarks</Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={22} color={theme.colors.text.secondary} set="ionicons" />
              </TouchableOpacity>
            </View>
          </View>

          {mode === 'list' ? (
            <>
              {/* Add Bookmark Button */}
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setMode('add')}
                activeOpacity={0.7}
              >
                <Icon
                  name="add-circle-outline"
                  size={20}
                  color={theme.colors.primary[500]}
                  set="ionicons"
                />
                <Text style={styles.addButtonText}>Add bookmark at {formatTime(position)}</Text>
              </TouchableOpacity>

              {/* Bookmarks List */}
              {currentBookmarks.length > 0 ? (
                <FlatList
                  data={currentBookmarks.sort((a, b) => a.time - b.time)}
                  renderItem={renderBookmark}
                  keyExtractor={(item) => item.id}
                  style={styles.list}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Icon
                    name="bookmark-outline"
                    size={32}
                    color={theme.colors.text.tertiary}
                    set="ionicons"
                  />
                  <Text style={styles.emptyText}>No bookmarks yet</Text>
                  <Text style={styles.emptySubtext}>Tap to jump, long press to edit</Text>
                </View>
              )}
            </>
          ) : (
            renderForm()
          )}
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: theme.spacing[4],
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  header: {
    alignItems: 'center',
    paddingTop: theme.spacing[2],
    paddingBottom: theme.spacing[3],
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
  },
  headerTitle: {
    ...theme.textStyles.body,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.radius.medium,
    marginBottom: theme.spacing[3],
    gap: theme.spacing[2],
  },
  addButtonText: {
    ...theme.textStyles.bodySmall,
    color: theme.colors.primary[600],
    fontWeight: '500',
  },
  formSection: {
    marginBottom: theme.spacing[3],
  },
  formTitle: {
    ...theme.textStyles.bodySmall,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing[3],
  },
  input: {
    ...theme.textStyles.body,
    backgroundColor: theme.colors.neutral[100],
    borderRadius: theme.radius.medium,
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[2],
  },
  noteInput: {
    minHeight: 80,
    paddingTop: theme.spacing[3],
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing[2],
    marginTop: theme.spacing[2],
  },
  cancelButton: {
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
  },
  cancelButtonText: {
    ...theme.textStyles.bodySmall,
    color: theme.colors.text.secondary,
  },
  saveButton: {
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.radius.medium,
  },
  saveButtonText: {
    ...theme.textStyles.bodySmall,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  bookmarkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: theme.spacing[3],
    gap: theme.spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.neutral[200],
  },
  bookmarkInfo: {
    flex: 1,
  },
  bookmarkTitle: {
    ...theme.textStyles.bodySmall,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  bookmarkNote: {
    ...theme.textStyles.caption,
    color: theme.colors.text.secondary,
    marginTop: 2,
    lineHeight: 16,
  },
  bookmarkMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  bookmarkTime: {
    ...theme.textStyles.caption,
    color: theme.colors.text.tertiary,
  },
  bookmarkChapter: {
    ...theme.textStyles.caption,
    color: theme.colors.text.tertiary,
    flex: 1,
  },
  bookmarkActions: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  actionButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing[6],
  },
  emptyText: {
    ...theme.textStyles.body,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing[2],
  },
  emptySubtext: {
    ...theme.textStyles.caption,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing[1],
  },
});
