# Placeholder Book Cover Image

The BookCard component references a placeholder image at:
`assets/placeholder-book.png`

## How to Add This Image

1. Create the `assets` directory in your project root (if it doesn't exist)
2. Add a placeholder book cover image named `placeholder-book.png`
3. Recommended size: 150x200 pixels
4. You can use any simple book icon or cover image

## Temporary Solution

If you don't have a placeholder image yet, you can:

1. **Comment out the defaultSource prop** in BookCard.tsx:
```typescript
<Image
  source={{ uri: coverUrl }}
  style={styles.cover}
  resizeMode="cover"
  // defaultSource={require('../../../../assets/placeholder-book.png')}
/>
```

2. **Or download a placeholder image:**
   - Search for "book cover placeholder" or "book icon"
   - Save as `placeholder-book.png` in the `assets` folder
   - Recommended: Use a simple gray book icon

## Alternative: Use Emoji Placeholder

You could also modify BookCard to use a text-based placeholder:

```typescript
{!coverUrl && (
  <View style={styles.placeholderCover}>
    <Text style={styles.placeholderText}>📖</Text>
  </View>
)}
```

This is just for missing covers - most books should have cover images from AudiobookShelf.
