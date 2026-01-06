# Edit Specification: Profile Screen (v2)

**Version:** 2 (post-validation)
**Changes from v1:** Corrected effort estimate, added secure PIN hashing with expo-crypto

**Covers Action Plan Items:** 1.8, 2.18
**Priority:** Critical (1.8) / High (2.18)
**Effort:** M (Medium) - 6-8 hours

---

## Dependencies

| This Spec | Depends On |
|-----------|------------|
| 2.18 Kid Mode PIN | 0.1 SharedUtilities (PinInput component) |
| 2.18 Kid Mode PIN | 2.1 Cross-feature imports (kidModeStore moved) |

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

## Specific Changes

### 1.8: Add Wishlist Link to Profile

**File:** `src/features/profile/screens/ProfileScreen.tsx`

**Add after Reading History link:**
```typescript
import { Heart } from 'lucide-react-native';
import { useWishlistStore } from '@/features/wishlist/stores/wishlistStore';

// In component
const { items: wishlistItems } = useWishlistStore();
const wishlistCount = wishlistItems.length;

// In render, after Reading History
<MenuRow
  icon={Heart}
  title="Wishlist"
  subtitle={wishlistCount > 0 ? `${wishlistCount} items` : 'Track books you want'}
  onPress={() => navigation.navigate('Wishlist')}
/>
```

---

### 2.18: Add Kid Mode PIN Protection

#### Step 1: Update kidModeStore with PIN state

**File:** `src/shared/stores/kidModeStore.ts` (after 2.1 moves it)

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

interface KidModeSettings {
  hideExplicitContent: boolean;
  hideAbridged: boolean;
  maxDuration: number | null;
  allowedGenres: string[] | null;
}

interface KidModeState {
  isEnabled: boolean;
  settings: KidModeSettings;
  // PIN protection
  pinHash: string | null;
  isPinRequired: boolean;
  lastUnlockTime: number | null;
  unlockDurationMinutes: number;
}

interface KidModeActions {
  setEnabled: (enabled: boolean) => void;
  updateSettings: (settings: Partial<KidModeSettings>) => void;
  // PIN actions
  setPin: (pin: string) => Promise<void>;
  removePin: () => void;
  verifyPin: (pin: string) => Promise<boolean>;
  unlock: () => void;
  isUnlocked: () => boolean;
}

const defaultSettings: KidModeSettings = {
  hideExplicitContent: true,
  hideAbridged: false,
  maxDuration: null,
  allowedGenres: null,
};

// Secure PIN hashing using expo-crypto
async function hashPin(pin: string): Promise<string> {
  // Add salt for additional security
  const saltedPin = `kidmode_salt_${pin}_audiobookshelf`;
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    saltedPin
  );
  return hash;
}

export const useKidModeStore = create<KidModeState & KidModeActions>()(
  persist(
    (set, get) => ({
      isEnabled: false,
      settings: defaultSettings,
      pinHash: null,
      isPinRequired: false,
      lastUnlockTime: null,
      unlockDurationMinutes: 15, // Stay unlocked for 15 min

      setPin: async (pin: string) => {
        const hash = await hashPin(pin);
        set({ pinHash: hash, isPinRequired: true });
      },

      removePin: () => {
        set({ pinHash: null, isPinRequired: false, lastUnlockTime: null });
      },

      verifyPin: async (enteredPin: string) => {
        const { pinHash } = get();
        if (!pinHash) return true;

        const enteredHash = await hashPin(enteredPin);
        return enteredHash === pinHash;
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
          return; // Block - PIN required
        }

        set({ isEnabled: enabled });
      },

      updateSettings: (updates: Partial<KidModeSettings>) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }));
      },
    }),
    {
      name: 'kid-mode-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

#### Step 2: Create PinInputModal Component

**File:** `src/features/profile/components/PinInputModal.tsx`

```typescript
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { PinInput } from '@/shared/components/PinInput';
import { useKidModeStore } from '@/shared/stores/kidModeStore';
import { haptics } from '@/core/native/haptics';
import { scale, spacing, colors, radius } from '@/shared/theme';
import { useThemeColors } from '@/shared/theme/themeStore';

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
  const themeColors = useThemeColors();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [isLoading, setIsLoading] = useState(false);

  const { setPin: savePin, verifyPin, removePin } = useKidModeStore();

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setPin('');
      setConfirmPin('');
      setError(null);
      setStep('enter');
    }
  }, [visible]);

  const handleSubmit = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (action === 'set') {
        if (step === 'enter') {
          if (pin.length !== 4) {
            setError('PIN must be 4 digits');
            haptics.notification('error');
            return;
          }
          setStep('confirm');
        } else {
          if (pin !== confirmPin) {
            setError('PINs do not match');
            haptics.notification('error');
            setConfirmPin('');
            return;
          }
          await savePin(pin);
          haptics.notification('success');
          onSuccess();
        }
      } else if (action === 'verify') {
        const isValid = await verifyPin(pin);
        if (!isValid) {
          setError('Incorrect PIN');
          haptics.notification('error');
          setPin('');
          return;
        }
        haptics.notification('success');
        onSuccess();
      } else if (action === 'remove') {
        const isValid = await verifyPin(pin);
        if (!isValid) {
          setError('Incorrect PIN');
          haptics.notification('error');
          setPin('');
          return;
        }
        removePin();
        haptics.notification('success');
        onSuccess();
      }
    } finally {
      setIsLoading(false);
    }
  }, [action, pin, confirmPin, step, savePin, verifyPin, removePin, onSuccess]);

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (step === 'enter' && pin.length === 4 && action !== 'set') {
      handleSubmit();
    } else if (step === 'confirm' && confirmPin.length === 4) {
      handleSubmit();
    }
  }, [pin, confirmPin, step, action, handleSubmit]);

  const getTitle = () => {
    if (action === 'set' && step === 'enter') return 'Create PIN';
    if (action === 'set' && step === 'confirm') return 'Confirm PIN';
    if (action === 'verify') return 'Enter PIN';
    if (action === 'remove') return 'Enter PIN to Remove';
    return 'PIN';
  };

  const getSubtitle = () => {
    if (action === 'set') return 'This PIN will be required to disable Kid Mode';
    return 'Enter your 4-digit PIN';
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
          <Text style={[styles.title, { color: themeColors.textPrimary }]}>
            {getTitle()}
          </Text>

          <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
            {getSubtitle()}
          </Text>

          <PinInput
            value={step === 'confirm' ? confirmPin : pin}
            onChange={step === 'confirm' ? setConfirmPin : setPin}
            length={4}
            secure
            autoFocus
            disabled={isLoading}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: themeColors.border }]}
              onPress={onCancel}
              disabled={isLoading}
            >
              <Text style={[styles.cancelText, { color: themeColors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.accent }]}
              onPress={handleSubmit}
              disabled={isLoading}
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: scale(22),
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: scale(14),
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  error: {
    color: '#EF4444',
    fontSize: scale(14),
    marginTop: spacing.md,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: scale(16),
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  submitText: {
    color: '#000',
    fontSize: scale(16),
    fontWeight: '600',
  },
});
```

#### Step 3: Update KidModeSettingsScreen

**File:** `src/features/profile/screens/KidModeSettingsScreen.tsx`

Add PIN UI section:
```typescript
import { PinInputModal } from '../components/PinInputModal';
import { Lock } from 'lucide-react-native';

// State
const [showPinModal, setShowPinModal] = useState(false);
const [pinAction, setPinAction] = useState<'set' | 'verify' | 'remove'>('set');

const { isEnabled, isPinRequired, isUnlocked, setEnabled, unlock } = useKidModeStore();

// When toggling Kid Mode OFF
const handleToggleKidMode = useCallback(() => {
  if (isEnabled && isPinRequired && !isUnlocked()) {
    setPinAction('verify');
    setShowPinModal(true);
    return;
  }
  setEnabled(!isEnabled);
}, [isEnabled, isPinRequired, isUnlocked, setEnabled]);

// In render, add Parental Lock section
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Parental Lock</Text>

  <MenuRow
    icon={Lock}
    title="PIN Protection"
    subtitle={isPinRequired ? 'PIN required to disable Kid Mode' : 'Not set'}
    onPress={() => {
      setPinAction(isPinRequired ? 'remove' : 'set');
      setShowPinModal(true);
    }}
    rightElement={
      <Switch
        value={isPinRequired}
        onValueChange={(value) => {
          if (value) {
            setPinAction('set');
          } else {
            setPinAction('remove');
          }
          setShowPinModal(true);
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

---

## Testing Criteria

### Wishlist Link
- [ ] Wishlist appears in Profile menu
- [ ] Shows correct item count
- [ ] Navigates to WishlistScreen

### Kid Mode PIN
- [ ] Can set 4-digit PIN
- [ ] Must confirm PIN on set (enters PIN twice)
- [ ] PIN required to disable Kid Mode
- [ ] Incorrect PIN shows error with haptic feedback
- [ ] Correct PIN unlocks for 15 minutes
- [ ] Can remove PIN with correct PIN
- [ ] PIN hash persists across app restarts (not plaintext)
- [ ] Auto-submit on 4 digits for verify/remove actions

---

## Effort Breakdown

| Task | Effort | Risk |
|------|--------|------|
| Add Wishlist link | 30 min | Low |
| Add PIN state to store with expo-crypto | 1.5 hours | Low |
| Create PinInputModal | 2 hours | Low |
| Update KidModeSettingsScreen | 1.5 hours | Low |
| Update toggle behavior | 1 hour | Medium |
| Testing | 1.5 hours | - |

**Total: 6-8 hours (M)**
