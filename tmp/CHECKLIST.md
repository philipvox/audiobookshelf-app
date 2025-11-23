# Stage 3 Installation & Testing Checklist

## 📋 Pre-Installation Checklist

Before installing Stage 3, verify:

- [ ] ✅ Stage 1 (API Client) is complete and working
- [ ] ✅ Stage 2 (Authentication) is complete and working
- [ ] ✅ You can successfully login to your AudiobookShelf account
- [ ] ✅ App runs without TypeScript errors
- [ ] ✅ All dependencies from package.json are installed

## 📦 Installation Checklist

### Step 1: Backup (Recommended)
- [ ] Commit current code to git
- [ ] Or create a backup of your project folder

### Step 2: Copy Files

**Shared Components:**
- [ ] Copy `LoadingSpinner.tsx` to `src/shared/components/`
- [ ] Copy `ErrorView.tsx` to `src/shared/components/`
- [ ] Copy `EmptyState.tsx` to `src/shared/components/`
- [ ] Update `src/shared/components/index.ts` with new exports

**Library Feature:**
- [ ] Create `src/features/library/components/` directory (if needed)
- [ ] Copy `BookCard.tsx` to `src/features/library/components/`
- [ ] Create `src/features/library/hooks/` directory (if needed)
- [ ] Copy `useDefaultLibrary.ts` to `src/features/library/hooks/`
- [ ] Copy `useLibraryItems.ts` to `src/features/library/hooks/`
- [ ] Create `src/features/library/screens/` directory (if needed)
- [ ] Copy `LibraryItemsScreen.tsx` to `src/features/library/screens/`
- [ ] Copy `index.ts` to `src/features/library/`

**Navigation:**
- [ ] Backup existing `src/navigation/AppNavigator.tsx` (optional)
- [ ] Copy new `AppNavigator.tsx` to `src/navigation/`

### Step 3: Handle Placeholder Image

**Choose one option:**

**Option A: Comment out placeholder (Quick)**
- [ ] Open `src/features/library/components/BookCard.tsx`
- [ ] Find line ~44 with `defaultSource={require(...)}` 
- [ ] Comment it out: `// defaultSource={require(...)}`

**Option B: Add placeholder image (Better UX)**
- [ ] Create `assets/` directory in project root
- [ ] Add `placeholder-book.png` file (150x200 recommended)
- [ ] Keep defaultSource line as-is

### Step 4: Compile and Run

- [ ] Run `npm start` (or `npm start -- --clear` if issues)
- [ ] App compiles without TypeScript errors
- [ ] App builds successfully
- [ ] No runtime errors in console

## 🧪 Testing Checklist

### Test 1: Initial Load
- [ ] Start app after login
- [ ] Loading spinner appears
- [ ] Loading text shows "Loading library..."
- [ ] Books display in 2-column grid
- [ ] Grid layout looks correct (2 columns, evenly spaced)

### Test 2: Book Display
- [ ] Book covers load and display
- [ ] Covers are 150x200 pixels
- [ ] Book titles are visible (max 2 lines)
- [ ] Author names are visible (max 1 line)
- [ ] Text is readable and not cut off

### Test 3: Progress Bars
- [ ] In-progress books show progress bar
- [ ] Progress bar is at bottom of cover
- [ ] Progress bar width is correct (0-100%)
- [ ] Progress bar is blue color
- [ ] Books without progress don't show bar

### Test 4: Pull-to-Refresh
- [ ] Pull down on library list
- [ ] Refresh spinner appears at top
- [ ] List updates after refresh
- [ ] Refresh spinner disappears
- [ ] Books maintain their positions

### Test 5: Book Interaction
- [ ] Tap a book card
- [ ] Card opacity changes to 0.7 on press
- [ ] Alert shows "Coming Soon" message
- [ ] Alert can be dismissed
- [ ] Console logs book ID (check dev tools)

### Test 6: Scrolling Performance
- [ ] Scroll through library smoothly
- [ ] No stuttering or lag
- [ ] Frame rate stays at ~60fps
- [ ] Images load progressively
- [ ] No white flashes or jumps

### Test 7: Error Handling
- [ ] Turn off WiFi/network
- [ ] Try to load library (or pull-to-refresh)
- [ ] Error view appears
- [ ] Error message is clear and helpful
- [ ] "Retry" button is visible
- [ ] Turn on WiFi
- [ ] Press "Retry" button
- [ ] Books load successfully

### Test 8: Empty State (if applicable)
- [ ] Login to account with no libraries
- [ ] See "No libraries found" message
- [ ] Icon (📚) is displayed
- [ ] Message is clear
- [ ] OR login to account with empty library
- [ ] See "Your library is empty" message
- [ ] Appropriate icon is displayed

### Test 9: Large Library Performance
- [ ] Test with library of 100+ books
- [ ] Initial load is reasonable (<3 seconds)
- [ ] Scrolling remains smooth
- [ ] Memory usage is reasonable
- [ ] No crashes or freezes

### Test 10: Edge Cases
- [ ] Books with no covers → Placeholder or gray box
- [ ] Books with very long titles → Ellipsis after 2 lines
- [ ] Books with no author → Shows "Unknown Author"
- [ ] Pull-to-refresh while loading → Handles gracefully
- [ ] Rapid tapping → No crashes

## 🐛 Troubleshooting Checklist

### If Books Don't Show

**Check:**
- [ ] Console has no errors
- [ ] Authentication is working (can see auth state)
- [ ] AudiobookShelf server has books
- [ ] Network requests are successful (check Network tab)
- [ ] API client is configured correctly
- [ ] Library ID is valid

**Try:**
- [ ] Logout and login again
- [ ] Restart the app
- [ ] Clear cache: `npm start -- --clear`
- [ ] Check `useDefaultLibrary` returns a library
- [ ] Check `useLibraryItems` returns items

### If Covers Don't Load

**Check:**
- [ ] Server URL is correct in auth
- [ ] Network connectivity is working
- [ ] Cover URLs in console are valid
- [ ] Images aren't blocked by CORS

**Try:**
- [ ] Check image URL directly in browser
- [ ] Verify apiClient.getItemCoverUrl() returns URL
- [ ] Add console.log in BookCard for cover URLs
- [ ] Check AudiobookShelf server allows image access

### If Pull-to-Refresh Doesn't Work

**Check:**
- [ ] RefreshControl is in FlatList
- [ ] refreshing prop is set to isLoading
- [ ] onRefresh calls refetch function

**Try:**
- [ ] Pull down harder/farther
- [ ] Check FlatList has correct props
- [ ] Verify refetch function exists
- [ ] Check console for errors

### If Performance is Poor

**Check:**
- [ ] FlatList props are set correctly
- [ ] removeClippedSubviews is true
- [ ] maxToRenderPerBatch is 10
- [ ] windowSize is set

**Try:**
- [ ] Reduce image sizes if very large
- [ ] Check React Query cache settings
- [ ] Profile with React DevTools
- [ ] Test on different device

### If TypeScript Errors

**Check:**
- [ ] Path aliases in tsconfig.json
- [ ] All imports are correct
- [ ] Types from core/types exist
- [ ] No missing dependencies

**Try:**
- [ ] Restart TypeScript server
- [ ] Run `npm run tsc` to see errors
- [ ] Check all file paths are correct
- [ ] Verify all types are imported

## ✅ Success Criteria

Your installation is successful when:

### Functional Requirements
- [ ] ✅ App compiles without errors
- [ ] ✅ Can see library after login
- [ ] ✅ Books display in 2-column grid
- [ ] ✅ Book covers load correctly
- [ ] ✅ Titles and authors are readable
- [ ] ✅ Progress bars show correctly
- [ ] ✅ Pull-to-refresh works
- [ ] ✅ Tapping books shows alert
- [ ] ✅ Scrolling is smooth
- [ ] ✅ Error states work
- [ ] ✅ Empty states work

### Code Quality
- [ ] ✅ No TypeScript errors
- [ ] ✅ No console errors
- [ ] ✅ All files under 400 lines
- [ ] ✅ Following project patterns
- [ ] ✅ Proper error handling

### Performance
- [ ] ✅ Initial load < 3 seconds
- [ ] ✅ Smooth scrolling (60fps)
- [ ] ✅ No memory leaks
- [ ] ✅ Works with 100+ books

### User Experience
- [ ] ✅ Loading states are clear
- [ ] ✅ Error messages are helpful
- [ ] ✅ Empty states are informative
- [ ] ✅ UI is responsive and polished

## 📝 Post-Installation Notes

### What to Update in docs/

After successful installation:
- [ ] Update `docs/current-work.md` with Stage 3 completion
- [ ] Mark Stage 3 as complete in project tracker
- [ ] Note any issues encountered
- [ ] Add any custom modifications made

### Known Limitations to Document

- [ ] No book detail screen (Stage 4)
- [ ] No filters/sorting (future)
- [ ] No search (Stage 5)
- [ ] Only first library shown
- [ ] No pagination UI (loads 50 max)

### Prepare for Stage 4

- [ ] Understand navigation patterns
- [ ] Review book detail requirements
- [ ] Plan component structure
- [ ] Identify reusable components

## 🎯 Next Steps

Once all checklists are complete:

1. **Test Thoroughly**
   - Run through all test scenarios
   - Try different edge cases
   - Test on different devices/emulators

2. **Document Issues**
   - Note any bugs found
   - List any customizations made
   - Document workarounds used

3. **Prepare for Stage 4**
   - Read Stage 4 requirements
   - Understand book detail screen
   - Plan implementation approach

4. **Commit Your Work**
   - Commit Stage 3 implementation
   - Use descriptive commit message
   - Tag as "stage-3-complete"

## 🎊 Completion

When all boxes are checked:

**🎉 Congratulations! Stage 3 is Complete! 🎉**

You now have:
- ✅ Beautiful library browser
- ✅ 2-column grid with covers
- ✅ Progress tracking
- ✅ Pull-to-refresh
- ✅ Error handling
- ✅ Professional UI

**Ready for Stage 4: Book Detail Screen! 🚀**

---

## Quick Reference

**Installation Time:** ~10 minutes
**Testing Time:** ~15 minutes
**Total Time:** ~25 minutes

**Files Created:** 10
**Lines of Code:** 582
**Documentation Files:** 7

**Support Files:**
- README.md - Main guide
- QUICK_INSTALL.md - Fast setup
- STAGE3_COMPLETE.md - Full details
- FILE_STRUCTURE.md - File listing
- SUMMARY.md - Quick overview

---

**Print this checklist and check off items as you go! ✓**
