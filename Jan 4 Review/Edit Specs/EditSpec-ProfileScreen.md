# Edit Specification: Profile Screen

**Covers Action Plan Items:** 1.8, 2.11
**Priority:** Critical (1.8) / High (2.11)
**Effort:** S-M (Small-Medium) - 2-6 hours

---

## Current State

### ProfileScreen.tsx
- **File:** `src/features/profile/screens/ProfileScreen.tsx`
- **Lines:** ~400
- **Status:** Well-organized, clean structure

### KidModeSettingsScreen.tsx
- **File:** `src/features/profile/screens/KidModeSettingsScreen.tsx`
- **Status:** Exists but has no PIN protection

### Current Profile Menu Items
- User avatar and info
- Downloads (with count/size)
- Listening Stats
- Reading History
- Reading Preferences
- Playback settings
- Storage settings
- Chapter Names settings
- Dark Mode toggle
- Kid Mode link
- Sign Out
- Version info

### Missing
- Wishlist link (feature exists but hidden)
- Kid Mode PIN protection

---

## Issues Identified

| Issue | Source | Severity |
|-------|--------|----------|
| Wishlist not accessible from Profile | [27], [30] Quick Win #8 | Low |
| Kid Mode has no PIN - children can toggle off | [30] Quick Win #7, [31] §3.5 | Medium |

---

## Alignment Requirements

From [30] Executive Summary:
- Quick Win #8: "Add Wishlist link - 30 minutes"
- Quick Win #7: "Kid Mode PIN protection - 4-6 hours"

From [27] Implementation Completeness:
- ProfileScreen 88% complete
- Wishlist 85% complete but not discoverable

---

## Specific Changes

### 1.8: Add Wishlist Link to Profile

**File:** `src/features/profile/screens/ProfileScreen.tsx`

**Add after Reading History link:**
```typescript
// Existing
<MenuRow
  icon={BookOpen}
  title="Reading History"
  subtitle="Books you've finished"
  onPress={() => navigation.navigate('ReadingHistory')}
/>

// ADD THIS
<MenuRow
  icon={Heart}
  title="Wishlist"
  subtitle={wishlistCount > 0 ? `${wishlistCount} items` : 'Track books you want'}
  onPress={() => navigation.navigate('Wishlist')}
/>
```

**Get wishlist count:**
```typescript
import { useWishlistStore } from '@/features/wishlist/stores/wishlistStore';

const { items: wishlistItems } = useWishlistStore();
const wishlistCount = wishlistItems.length;
```

### 2.11: Add Kid Mode PIN Protection

**File:** `src/features/profile/stores/kidModeStore.ts`

**Add PIN state:**
```typescript
interface KidModeState {
  isEnabled: boolean;
  settings: KidModeSettings;
  // NEW: PIN protection
  pin: string | null;
  isPinRequired: boolean;
  lastUnlockTime: number | null;
  unlockDurationMinutes: number;  // How long before requiring PIN again
}

interface KidModeActions {
  // Existing
  setEnabled: (enabled: boolean) => void;
  updateSettings: (settings: Partial<KidModeSettings>) => void;
  // NEW
  setPin: (pin: string) => void;
  removePin: () => void;
  verifyPin: (pin: string) => boolean;
  unlock: () => void;
  isUnlocked: () => boolean;
}
```

**Implementation:**
```typescript
export const useKidModeStore = create<KidModeState & KidModeActions>()(
  persist(
    (set, get) => ({
      isEnabled: false,
      settings: defaultSettings,
      pin: null,
      isPinRequired: false,
      lastUnlockTime: null,
      unlockDurationMinutes: 15,  // Stay unlocked for 15 min

      setPin: (pin: string) => {
        // Hash the PIN for storage
        const hashedPin = hashPin(pin);
        set({ pin: hashedPin, isPinRequired: true });
      },

      removePin: () => {
        set({ pin: null, isPinRequired: false });
      },

      verifyPin: (enteredPin: string) => {
        const { pin } = get();
        if (!pin) return true;
        return hashPin(enteredPin) === pin;
      },

      unlock: () => {
        set({ lastUnlockTime: Date.now() });
      },

      isUnlocked: () => {
        const { lastUnlockTime, unlockDurationMinutes, isPinRequired } = get();
        if (!isPinRequired) return true;
        if (!lastUnlockTime) return false;

        const elapsed = Date.now() - lastUnlockTime;
        const duration = unlockDurationMinutes * 60 * 1000;
        return elapsed < duration;
      },

      setEnabled: (enabled: boolean) => {
        const { isPinRequired, isUnlocked } = get();

        // If disabling and PIN required, must be unlocked
        if (!enabled && isPinRequired && !isUnlocked()) {
          return;  // Block - PIN required
        }

        set({ isEnabled: enabled });
      },
    }),
    {
      name: 'kid-mode-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Simple hash function (use proper crypto in production)
function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
}
```

**File:** `src/features/profile/screens/KidModeSettingsScreen.tsx`

**Add PIN UI:**
```typescript
import { PinInputModal } from '../components/PinInputModal';

const [showPinModal, setShowPinModal] = useState(false);
const [pinAction, setPinAction] = useState<'set' | 'verify' | 'remove'>('set');

// When toggling Kid Mode OFF
const handleToggleKidMode = useCallback(() => {
  if (isEnabled && isPinRequired && !isUnlocked()) {
    setPinAction('verify');
    setShowPinModal(true);
    return;
  }
  setEnabled(!isEnabled);
}, [isEnabled, isPinRequired, isUnlocked]);

// In render
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Parental Lock</Text>

  <MenuRow
    icon={Lock}
    title="PIN Protection"
    subtitle={isPinRequired ? 'PIN required to disable' : 'Not set'}
    onPress={() => {
      if (isPinRequired) {
        setPinAction('remove');
      } else {
        setPinAction('set');
      }
      setShowPinModal(true);
    }}
    rightElement={
      <Switch
        value={isPinRequired}
        onValueChange={(value) => {
          if (value) {
            setPinAction('set');
            setShowPinModal(true);
          } else {
            setPinAction('remove');
            setShowPinModal(true);
          }
        }}
      />
    }
  />
</View>

<PinInputModal
  visible={showPinModal}
  action={pinAction}
  onSuccess={() => {
    setShowPinModal(false);
    if (pinAction === 'verify') {
      unlock();
      setEnabled(false);
    }
  }}
  onCancel={() => setShowPinModal(false)}
/>
```

**New file:** `src/features/profile/components/PinInputModal.tsx`

```typescript
interface PinInputModalProps {
  visible: boolean;
  action: 'set' | 'verify' | 'remove';
  onSuccess: () => void;
  onCancel: () => void;
}

export const PinInputModal: React.FC<PinInputModalProps> = ({
  visible,
  action,
  onSuccess,
  onCancel,
}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');

  const { setPin: savePin, verifyPin, removePin } = useKidModeStore();

  const handleSubmit = useCallback(() => {
    if (action === 'set') {
      if (step === 'enter') {
        if (pin.length !== 4) {
          setError('PIN must be 4 digits');
          return;
        }
        setStep('confirm');
        setError(null);
      } else {
        if (pin !== confirmPin) {
          setError('PINs do not match');
          return;
        }
        savePin(pin);
        onSuccess();
      }
    } else if (action === 'verify') {
      if (!verifyPin(pin)) {
        setError('Incorrect PIN');
        haptics.notification('error');
        return;
      }
      onSuccess();
    } else if (action === 'remove') {
      if (!verifyPin(pin)) {
        setError('Incorrect PIN');
        return;
      }
      removePin();
      onSuccess();
    }
  }, [action, pin, confirmPin, step]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>
            {action === 'set' && step === 'enter' && 'Create PIN'}
            {action === 'set' && step === 'confirm' && 'Confirm PIN'}
            {action === 'verify' && 'Enter PIN'}
            {action === 'remove' && 'Enter PIN to Remove'}
          </Text>

          <Text style={styles.subtitle}>
            {action === 'set' ? 'This PIN will be required to disable Kid Mode' : 'Enter your 4-digit PIN'}
          </Text>

          <PinInput
            value={step === 'confirm' ? confirmPin : pin}
            onChange={step === 'confirm' ? setConfirmPin : setPin}
            length={4}
            secure
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.accent }]}
              onPress={handleSubmit}
            >
              <Text style={styles.submitText}>
                {action === 'set' && step === 'enter' ? 'Next' : 'Confirm'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
```

---

## Cross-Screen Dependencies

| Change | Affects |
|--------|---------|
| Wishlist link | WishlistScreen must be navigable |
| Kid Mode PIN | KidModeSettingsScreen, toggle behavior |
| PIN store | All Kid Mode toggle points |

---

## Testing Criteria

### Wishlist Link
- [ ] Wishlist appears in Profile menu
- [ ] Shows correct item count
- [ ] Navigates to WishlistScreen

### Kid Mode PIN
- [ ] Can set 4-digit PIN
- [ ] Must confirm PIN on set
- [ ] PIN required to disable Kid Mode
- [ ] Incorrect PIN shows error
- [ ] Correct PIN unlocks for 15 minutes
- [ ] Can remove PIN with correct PIN
- [ ] PIN persists across app restarts

---

## Effort Breakdown

| Task | Effort | Risk |
|------|--------|------|
| Add Wishlist link | 30 min | Low |
| Add PIN state to store | 1 hour | Low |
| Create PinInputModal | 2 hours | Low |
| Update KidModeSettingsScreen | 1 hour | Low |
| Update toggle behavior | 1 hour | Medium |
| Testing | 1 hour | - |

**Total: 2-6 hours**
