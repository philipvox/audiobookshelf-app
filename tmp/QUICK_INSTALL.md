# Stage 3 Quick Installation Guide

## 🚀 Fast Setup (5 minutes)

### Prerequisites
✅ Stage 1 (API Client) complete
✅ Stage 2 (Authentication) complete
✅ App runs and you can login

### Step 1: Copy Files

```bash
# From the stage3 directory, copy to your project:

# Shared components
cp src/shared/components/*.tsx YOUR_PROJECT/src/shared/components/
cp src/shared/components/index.ts YOUR_PROJECT/src/shared/components/

# Library feature
mkdir -p YOUR_PROJECT/src/features/library/{components,hooks,screens}
cp src/features/library/components/*.tsx YOUR_PROJECT/src/features/library/components/
cp src/features/library/hooks/*.ts YOUR_PROJECT/src/features/library/hooks/
cp src/features/library/screens/*.tsx YOUR_PROJECT/src/features/library/screens/
cp src/features/library/index.ts YOUR_PROJECT/src/features/library/

# Navigation
cp src/navigation/AppNavigator.tsx YOUR_PROJECT/src/navigation/
```

### Step 2: Handle Placeholder Image

**Quick Fix** (comment out placeholder):
```typescript
// Open: src/features/library/components/BookCard.tsx
// Line ~44, comment out:
// defaultSource={require('../../../../assets/placeholder-book.png')}
```

**Or** add a placeholder image:
```bash
mkdir -p YOUR_PROJECT/assets
# Add placeholder-book.png (150x200) to assets/
```

### Step 3: Run

```bash
cd YOUR_PROJECT
npm start
```

### Step 4: Test

1. Login to your account
2. See your books in a grid
3. Try pull-to-refresh
4. Tap a book (shows alert)

## ✅ Verification Checklist

After setup, you should have:
- [ ] Files copied successfully
- [ ] No TypeScript errors
- [ ] App compiles and runs
- [ ] Can see library grid after login
- [ ] Book covers load
- [ ] Pull-to-refresh works

## 🐛 Quick Troubleshooting

### "Cannot find module '@/shared/components'"
```bash
# Check tsconfig.json has:
"paths": {
  "@/*": ["src/*"]
}
# Restart TS server in your IDE
```

### No books showing
```javascript
// Check console for errors
// Verify your AudiobookShelf has books
// Check authentication works
```

### Placeholder image error
```typescript
// Comment out defaultSource line in BookCard.tsx
// Or add placeholder-book.png to assets/
```

## 📁 File Locations

Files you should now have:

```
YOUR_PROJECT/
├── src/
│   ├── shared/components/
│   │   ├── LoadingSpinner.tsx     ← NEW
│   │   ├── ErrorView.tsx          ← NEW
│   │   ├── EmptyState.tsx         ← NEW
│   │   └── index.ts               ← UPDATED
│   │
│   ├── features/library/
│   │   ├── components/
│   │   │   └── BookCard.tsx       ← NEW
│   │   ├── hooks/
│   │   │   ├── useDefaultLibrary.ts   ← NEW
│   │   │   └── useLibraryItems.ts     ← NEW
│   │   ├── screens/
│   │   │   └── LibraryItemsScreen.tsx ← NEW
│   │   └── index.ts               ← NEW
│   │
│   └── navigation/
│       └── AppNavigator.tsx       ← UPDATED
│
└── assets/
    └── placeholder-book.png       ← OPTIONAL
```

## 🎯 What Works Now

- ✅ Library grid with book covers
- ✅ Progress bars on books
- ✅ Pull-to-refresh
- ✅ Loading states
- ✅ Error handling
- ✅ Empty states

## 🚫 What Doesn't Work Yet

- ❌ Book detail screen (Stage 4)
- ❌ Audio playback (Stage 5)
- ❌ Search (Stage 5)
- ❌ Filters/sorting (Future)

## 📖 Next Steps

1. Test the library browser thoroughly
2. Read STAGE3_COMPLETE.md for details
3. Ready for Stage 4: Book Detail Screen

## 💾 Files Included

| File | Lines | Purpose |
|------|-------|---------|
| LoadingSpinner.tsx | 46 | Loading indicator |
| ErrorView.tsx | 62 | Error display |
| EmptyState.tsx | 43 | Empty state |
| BookCard.tsx | 130 | Book card |
| useDefaultLibrary.ts | 40 | Library hook |
| useLibraryItems.ts | 59 | Items hook |
| LibraryItemsScreen.tsx | 137 | Main screen |
| AppNavigator.tsx | 52 | Navigation |

**Total: 582 lines across 10 files**

## 🎉 You're Done!

Your app now has:
- Beautiful library browser
- Grid layout with covers
- Progress tracking
- Pull-to-refresh
- Professional error handling

**Enjoy browsing your audiobook library! 📚**
