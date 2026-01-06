# Edit Specification: Queue & Wishlist Screens

**Covers Action Plan Items:** 3.6, 3.11, 4.19
**Priority:** Low (Phase 3-4)
**Effort:** S (Small) - 2-4 hours

---

## Current State

### QueueScreen.tsx
- **File:** `src/features/queue/screens/QueueScreen.tsx`
- **Lines:** ~400
- **`as any` casts:** 2 occurrences
- **Status:** Well-organized

### WishlistScreen.tsx
- **File:** `src/features/wishlist/screens/WishlistScreen.tsx`
- **Lines:** 648
- **TODO:** Line 125 - "TODO: Implement edit sheet"
- **Features:** Tab bar with badges, sort picker, priority stars, swipe actions

---

## Issues Identified

| Issue | Source | Severity |
|-------|--------|----------|
| Queue: "Play Next" vs "Up Next" distinction unclear | [27] | Low |
| Wishlist: Priority editing could be more intuitive | [27] | Low |
| Wishlist: Edit sheet TODO not implemented | [28] | Low |

---

## Specific Changes

### 3.6: Improve Queue Visual Distinction

**File:** `src/features/queue/screens/QueueScreen.tsx`

**Current:** Both sections have similar styling
**Target:** Clear visual differentiation

```typescript
// Play Next section - more prominent
<View style={styles.playNextSection}>
  <View style={styles.playNextHeader}>
    <View style={styles.playNextBadge}>
      <Play size={scale(14)} color="#000" fill="#000" />
    </View>
    <Text style={styles.playNextTitle}>Play Next</Text>
    <Text style={styles.playNextSubtitle}>Will play after current book</Text>
  </View>

  {playNextItems.length > 0 ? (
    playNextItems.map(item => (
      <QueueItem key={item.id} item={item} isPlayNext />
    ))
  ) : (
    <Text style={styles.emptyText}>No items queued to play next</Text>
  )}
</View>

// Divider
<View style={styles.sectionDivider}>
  <View style={styles.dividerLine} />
  <Text style={styles.dividerText}>Up Next</Text>
  <View style={styles.dividerLine} />
</View>

// Up Next section - standard styling
<View style={styles.upNextSection}>
  {upNextItems.map(item => (
    <QueueItem key={item.id} item={item} />
  ))}
</View>

const styles = StyleSheet.create({
  playNextSection: {
    backgroundColor: colors.accent + '15',  // 15% opacity gold
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  playNextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  playNextBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  playNextTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  playNextSubtitle: {
    fontSize: scale(12),
    color: colors.textSecondary,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: scale(12),
    color: colors.textTertiary,
    paddingHorizontal: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  upNextSection: {
    paddingHorizontal: spacing.lg,
  },
});
```

### 3.11: Improve Wishlist Priority Editing

**File:** `src/features/wishlist/screens/WishlistScreen.tsx`

**Current:** Stars that are hard to tap
**Target:** More intuitive priority control

```typescript
// Option A: Slider approach
<View style={styles.priorityContainer}>
  <Text style={styles.priorityLabel}>Priority</Text>
  <View style={styles.prioritySlider}>
    {[1, 2, 3, 4, 5].map(level => (
      <TouchableOpacity
        key={level}
        onPress={() => setPriority(item.id, level)}
        style={styles.priorityStar}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      >
        <Star
          size={scale(24)}
          color={level <= item.priority ? colors.accent : colors.textTertiary}
          fill={level <= item.priority ? colors.accent : 'none'}
        />
      </TouchableOpacity>
    ))}
  </View>
</View>

// Option B: Quick action buttons
<View style={styles.priorityQuickActions}>
  <TouchableOpacity
    style={styles.priorityButton}
    onPress={() => decreasePriority(item.id)}
    disabled={item.priority === 1}
  >
    <ChevronDown size={scale(20)} color={colors.textSecondary} />
  </TouchableOpacity>

  <View style={styles.priorityDisplay}>
    {[...Array(item.priority)].map((_, i) => (
      <Star key={i} size={scale(14)} color={colors.accent} fill={colors.accent} />
    ))}
  </View>

  <TouchableOpacity
    style={styles.priorityButton}
    onPress={() => increasePriority(item.id)}
    disabled={item.priority === 5}
  >
    <ChevronUp size={scale(20)} color={colors.textSecondary} />
  </TouchableOpacity>
</View>
```

### 4.19: Implement Wishlist Edit Sheet

**File:** `src/features/wishlist/screens/WishlistScreen.tsx`
**Line:** 125

**Create edit sheet component:**
```typescript
// New file: src/features/wishlist/components/WishlistEditSheet.tsx

interface WishlistEditSheetProps {
  item: WishlistItem | null;
  visible: boolean;
  onClose: () => void;
  onSave: (updates: Partial<WishlistItem>) => void;
  onDelete: () => void;
}

export const WishlistEditSheet: React.FC<WishlistEditSheetProps> = ({
  item,
  visible,
  onClose,
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState(item?.title || '');
  const [author, setAuthor] = useState(item?.author || '');
  const [notes, setNotes] = useState(item?.notes || '');
  const [priority, setPriority] = useState(item?.priority || 3);
  const [tab, setTab] = useState<'mustRead' | 'authors' | 'series' | 'all'>(item?.tab || 'all');

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setAuthor(item.author || '');
      setNotes(item.notes || '');
      setPriority(item.priority);
      setTab(item.tab);
    }
  }, [item]);

  const handleSave = () => {
    onSave({
      title,
      author,
      notes,
      priority,
      tab,
    });
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} height={hp(60)}>
      <View style={styles.sheetContent}>
        <Text style={styles.sheetTitle}>Edit Wishlist Item</Text>

        <TextInput
          style={styles.input}
          placeholder="Title"
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          style={styles.input}
          placeholder="Author (optional)"
          value={author}
          onChangeText={setAuthor}
        />

        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        <View style={styles.prioritySection}>
          <Text style={styles.sectionLabel}>Priority</Text>
          <View style={styles.priorityStars}>
            {[1, 2, 3, 4, 5].map(level => (
              <TouchableOpacity key={level} onPress={() => setPriority(level)}>
                <Star
                  size={scale(28)}
                  color={level <= priority ? colors.accent : colors.textTertiary}
                  fill={level <= priority ? colors.accent : 'none'}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.tabSection}>
          <Text style={styles.sectionLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['all', 'mustRead', 'authors', 'series'].map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.tabChip, tab === t && styles.tabChipActive]}
                onPress={() => setTab(t)}
              >
                <Text style={[styles.tabChipText, tab === t && styles.tabChipTextActive]}>
                  {t === 'mustRead' ? 'Must Read' : t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
            <Trash2 size={scale(18)} color={colors.error} />
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
};
```

**Update WishlistScreen to use edit sheet:**
```typescript
const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);

const handleEditItem = (item: WishlistItem) => {
  setEditingItem(item);
};

const handleSaveEdit = (updates: Partial<WishlistItem>) => {
  if (editingItem) {
    updateWishlistItem(editingItem.id, updates);
  }
};

const handleDeleteItem = () => {
  if (editingItem) {
    removeFromWishlist(editingItem.id);
    setEditingItem(null);
  }
};

// In render
<WishlistEditSheet
  item={editingItem}
  visible={editingItem !== null}
  onClose={() => setEditingItem(null)}
  onSave={handleSaveEdit}
  onDelete={handleDeleteItem}
/>
```

---

## Testing Criteria

### Queue
- [ ] "Play Next" section has distinct gold-tinted background
- [ ] Divider clearly separates sections
- [ ] Section headers explain behavior

### Wishlist Priority
- [ ] Stars have adequate tap targets
- [ ] Priority changes immediately on tap
- [ ] Visual feedback on priority change

### Wishlist Edit Sheet
- [ ] Sheet opens when tapping edit
- [ ] All fields pre-populate correctly
- [ ] Changes persist on save
- [ ] Delete removes item
- [ ] Cancel closes without saving

---

## Effort Breakdown

| Task | Effort | Risk |
|------|--------|------|
| Improve Queue section styling | 1 hour | Low |
| Improve priority tap targets | 30 min | Low |
| Create WishlistEditSheet | 1.5 hours | Low |
| Integrate edit sheet | 30 min | Low |
| Testing | 1 hour | - |

**Total: 2-4 hours**
