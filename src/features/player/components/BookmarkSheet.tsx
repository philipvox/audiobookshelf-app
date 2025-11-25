// File: src/features/player/components/BookmarkSheet.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '../stores/playerStore';
import { Icon } from '@/shared/components/Icon';
import { theme } from '@/shared/theme';

interface Bookmark {
  id: string;
  title: string;
  time: number;
  createdAt: number;
}

interface BookmarkSheetProps {
  visible: boolean;
  onClose: () => void;
}

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
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  
  const { 
    position, 
    bookmarks, 
    addBookmark, 
    removeBookmark, 
    seekTo,
    currentBook,
  } = usePlayerStore();

  const currentBookmarks = currentBook 
    ? bookmarks.filter(b => b.id.startsWith(currentBook.id))
    : [];

  const handleAddBookmark = () => {
    if (!currentBook) return;
    
    const title = newTitle.trim() || `Bookmark at ${formatTime(position)}`;
    addBookmark({
      id: `${currentBook.id}-${Date.now()}`,
      title,
      time: position,
      createdAt: Date.now(),
    });
    setNewTitle('');
    setIsAdding(false);
  };

  const handleSelectBookmark = async (bookmark: Bookmark) => {
    await seekTo(bookmark.time);
    onClose();
  };

  const handleDeleteBookmark = (bookmark: Bookmark) => {
    Alert.alert(
      'Delete Bookmark',
      `Delete "${bookmark.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => removeBookmark(bookmark.id),
        },
      ]
    );
  };

  const renderBookmark = ({ item }: { item: Bookmark }) => (
    <TouchableOpacity
      style={styles.bookmarkItem}
      onPress={() => handleSelectBookmark(item)}
      onLongPress={() => handleDeleteBookmark(item)}
      activeOpacity={0.7}
    >
      <Icon name="bookmark" size={18} color={theme.colors.primary[500]} set="ionicons" />
      <View style={styles.bookmarkInfo}>
        <Text style={styles.bookmarkTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.bookmarkTime}>{formatTime(item.time)}</Text>
      </View>
      <TouchableOpacity 
        onPress={() => handleDeleteBookmark(item)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon name="trash-outline" size={18} color={theme.colors.text.tertiary} set="ionicons" />
      </TouchableOpacity>
    </TouchableOpacity>
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
              <Text style={styles.title}>Bookmarks</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="close" size={22} color={theme.colors.text.secondary} set="ionicons" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Add Bookmark Section */}
          {isAdding ? (
            <View style={styles.addSection}>
              <TextInput
                style={styles.input}
                placeholder={`Bookmark at ${formatTime(position)}`}
                placeholderTextColor={theme.colors.text.tertiary}
                value={newTitle}
                onChangeText={setNewTitle}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleAddBookmark}
              />
              <View style={styles.addActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => { setIsAdding(false); setNewTitle(''); }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={handleAddBookmark}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setIsAdding(true)}
              activeOpacity={0.7}
            >
              <Icon name="add-circle-outline" size={20} color={theme.colors.primary[500]} set="ionicons" />
              <Text style={styles.addButtonText}>Add bookmark at {formatTime(position)}</Text>
            </TouchableOpacity>
          )}

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
              <Icon name="bookmark-outline" size={32} color={theme.colors.text.tertiary} set="ionicons" />
              <Text style={styles.emptyText}>No bookmarks yet</Text>
              <Text style={styles.emptySubtext}>Long press to delete</Text>
            </View>
          )}
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
    paddingHorizontal: theme.spacing[4],
    maxHeight: '50%',
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
  title: {
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
  addSection: {
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
  addActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing[2],
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
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
    gap: theme.spacing[3],
  },
  bookmarkInfo: {
    flex: 1,
  },
  bookmarkTitle: {
    ...theme.textStyles.bodySmall,
    color: theme.colors.text.primary,
  },
  bookmarkTime: {
    ...theme.textStyles.caption,
    color: theme.colors.text.tertiary,
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