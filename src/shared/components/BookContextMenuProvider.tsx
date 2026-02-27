/**
 * src/shared/components/BookContextMenuProvider.tsx
 *
 * Global provider for the book long-press context menu.
 * Wrap your app with this provider, then call showMenu(book)
 * from any component via the useBookContextMenu() hook.
 *
 * Supports optional context (e.g., playlistId) to customize menu behavior.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import type { LibraryItem } from '@/core/types';
import { BookContextMenu } from './BookContextMenu';

// Error boundary to prevent malformed book data from crashing the entire app
class MenuErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) { console.warn('BookContextMenu error:', error.message); }
  render() { return this.state.hasError ? null : this.props.children; }
}

interface BookMenuContext {
  playlistId?: string;
}

interface BookContextMenuContextValue {
  showMenu: (book: LibraryItem, context?: BookMenuContext) => void;
}

const BookContextMenuContext = createContext<BookContextMenuContextValue | null>(null);

export function useBookContextMenu(): BookContextMenuContextValue {
  const ctx = useContext(BookContextMenuContext);
  if (!ctx) {
    throw new Error('useBookContextMenu must be used within BookContextMenuProvider');
  }
  return ctx;
}

export function BookContextMenuProvider({ children }: { children: React.ReactNode }) {
  const [selectedBook, setSelectedBook] = useState<LibraryItem | null>(null);
  const [visible, setVisible] = useState(false);
  const [playlistId, setPlaylistId] = useState<string | undefined>();
  const navigation = useNavigation<any>();

  const showMenu = useCallback((book: LibraryItem, context?: BookMenuContext) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedBook(book);
    setPlaylistId(context?.playlistId);
    setVisible(true);
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
  }, []);

  const handleViewDetails = useCallback((book: LibraryItem) => {
    navigation.navigate('BookDetail', { id: book.id });
  }, [navigation]);

  const contextValue = React.useMemo(() => ({ showMenu }), [showMenu]);

  return (
    <BookContextMenuContext.Provider value={contextValue}>
      {children}
      <MenuErrorBoundary>
        <BookContextMenu
          book={selectedBook}
          visible={visible}
          onClose={handleClose}
          onViewDetails={handleViewDetails}
          playlistId={playlistId}
        />
      </MenuErrorBoundary>
    </BookContextMenuContext.Provider>
  );
}
