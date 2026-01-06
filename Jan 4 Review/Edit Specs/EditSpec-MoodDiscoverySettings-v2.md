# Edit Specification: Mood Discovery & Settings Screens (v2)

**Version:** 2 (post-validation)
**Changes from v1:** Fixed server discovery to use parallel scanning, clarified implementation approach

**Covers Action Plan Items:** 3.12, 3.13, 3.14, 4.5, 4.13, 4.15, 4.16, 4.17
**Priority:** Low (Phase 3-4)
**Effort:** M-L (Medium-Large) - 2-4 days

---

## Screens Covered

1. **MoodDiscoveryScreen** - Mood selection wizard
2. **PreferencesOnboardingScreen** - Reading preferences setup
3. **StorageSettingsScreen** - Download/storage management
4. **JoystickSeekSettingsScreen** - Scrub gesture configuration
5. **LoginScreen** - Server authentication

---

## Current State

### MoodDiscoveryScreen.tsx
- **File:** `src/features/mood-discovery/screens/MoodDiscoveryScreen.tsx`
- **Lines:** ~450
- **Features:** Step progress, 2x2 mood grid, skip/next buttons
- **Gap:** Could be 2x3 grid per spec

### PreferencesOnboardingScreen.tsx
- **File:** `src/features/recommendations/screens/PreferencesOnboardingScreen.tsx`
- **Lines:** ~400
- **Gap:** Could have more animation between steps

### StorageSettingsScreen.tsx
- **File:** `src/features/profile/screens/StorageSettingsScreen.tsx`
- **Lines:** ~350
- **Gap:** No download quota slider

### JoystickSeekSettingsScreen.tsx
- **File:** `src/features/profile/screens/JoystickSeekSettingsScreen.tsx`
- **Lines:** ~300
- **Gaps:** No interactive response curve graph, no test scrubber

### LoginScreen.tsx
- **File:** `src/features/auth/screens/LoginScreen.tsx`
- **Lines:** ~400
- **Gap:** No server discovery/scan feature

---

## Issues Identified

| Issue | Source | Severity |
|-------|--------|----------|
| MoodDiscovery has 2x2 grid, spec says 2x3 | [27] | Low |
| PreferencesOnboarding lacks step animation | [27] | Low |
| No download quota slider | [27] | Low |
| No joystick response curve graph | [27] | Low |
| No joystick test scrubber | [27] | Low |
| No server discovery/scan | [27] | Low |
| Mood systems naming confusion | [31] A8 | Low |
| Server scan uses slow sequential approach | Validation | Medium |

---

## Specific Changes

### 4.13: MoodDiscovery 2x3 Grid

**File:** `src/features/mood-discovery/screens/MoodDiscoveryScreen.tsx`

```typescript
// Current: 4 options in 2x2
const MOOD_OPTIONS = [
  { id: 'comfort', label: 'Comfort', icon: Heart },
  { id: 'thrills', label: 'Thrills', icon: Zap },
  { id: 'escape', label: 'Escape', icon: Compass },
  { id: 'growth', label: 'Growth', icon: TrendingUp },
];

// Updated: 6 options in 2x3
const MOOD_OPTIONS = [
  { id: 'comfort', label: 'Comfort', icon: Heart, description: 'Familiar and cozy' },
  { id: 'thrills', label: 'Thrills', icon: Zap, description: 'Edge of your seat' },
  { id: 'escape', label: 'Escape', icon: Compass, description: 'Another world' },
  { id: 'growth', label: 'Growth', icon: TrendingUp, description: 'Learn something new' },
  { id: 'emotional', label: 'Emotional', icon: Heart, description: 'Deep feelings' },
  { id: 'lighthearted', label: 'Light', icon: Sun, description: 'Fun and easy' },
];

// Update grid layout
<View style={styles.moodGrid}>
  {MOOD_OPTIONS.map((mood, index) => (
    <TouchableOpacity
      key={mood.id}
      style={[
        styles.moodOption,
        selectedMoods.includes(mood.id) && styles.moodOptionSelected,
      ]}
      onPress={() => toggleMood(mood.id)}
    >
      <mood.icon size={scale(28)} color={...} />
      <Text style={styles.moodLabel}>{mood.label}</Text>
      <Text style={styles.moodDescription}>{mood.description}</Text>
    </TouchableOpacity>
  ))}
</View>

const styles = StyleSheet.create({
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  moodOption: {
    width: '48%',  // 2 columns
    aspectRatio: 1.2,  // Slightly shorter for 3 rows
    marginBottom: spacing.md,
    // ... rest of styles
  },
});
```

### 3.12: Add Step Animation to PreferencesOnboarding

**File:** `src/features/recommendations/screens/PreferencesOnboardingScreen.tsx`

```typescript
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';

const [currentStep, setCurrentStep] = useState(0);

const goToNextStep = () => {
  setCurrentStep(prev => prev + 1);
};

// Animated step content
<Animated.View
  key={currentStep}
  entering={SlideInRight.duration(300)}
  exiting={SlideOutLeft.duration(300)}
  style={styles.stepContent}
>
  {renderStepContent(currentStep)}
</Animated.View>

// Progress indicator animation
<View style={styles.progressContainer}>
  {STEPS.map((_, index) => (
    <Animated.View
      key={index}
      style={[
        styles.progressDot,
        {
          backgroundColor: index <= currentStep ? colors.accent : colors.textTertiary,
          transform: [{ scale: index === currentStep ? 1.2 : 1 }],
        },
      ]}
    />
  ))}
</View>
```

### 3.13 & 3.14: Document Progress Display & Mood Systems

**Add to docs or CLAUDE.md:**

```markdown
## Progress Display Guidelines

| Context | Format | Example |
|---------|--------|---------|
| Book cards | Percentage | "75%" |
| Player screen | Elapsed / Total | "1:30:45 / 2:00:00" |
| Series detail | Book count | "3 of 7 books" |
| Book detail | Progress bar + time | Bar with "45 min left" |

## Mood Systems

Two distinct mood systems exist intentionally:

### Preferences Moods (Permanent)
- Purpose: Long-term taste profile
- Options: Adventurous, Relaxing, Thoughtful, Inspirational, Emotional
- Storage: `preferencesStore.moods`
- Used for: Recommendations, filtering

### Mood Discovery Session (Temporary)
- Purpose: Current listening mood
- Options: Comfort, Thrills, Escape, Growth, Emotional, Light
- Storage: `moodSessionStore` (24h expiry)
- Used for: Discovery results, temporary filtering

These are intentionally different - Preferences reflects general taste,
Mood Discovery captures current state.
```

### 4.5: Add Download Quota Slider

**File:** `src/features/profile/screens/StorageSettingsScreen.tsx`

```typescript
import Slider from '@react-native-community/slider';

const [downloadQuota, setDownloadQuota] = useState(10);  // GB

<View style={styles.quotaSection}>
  <Text style={styles.sectionTitle}>Download Quota</Text>
  <Text style={styles.quotaValue}>{downloadQuota} GB</Text>

  <Slider
    style={styles.slider}
    minimumValue={1}
    maximumValue={50}
    step={1}
    value={downloadQuota}
    onValueChange={setDownloadQuota}
    onSlidingComplete={(value) => {
      setDownloadQuota(value);
      saveQuotaSetting(value);
    }}
    minimumTrackTintColor={colors.accent}
    maximumTrackTintColor={colors.textTertiary}
    thumbTintColor={colors.accent}
  />

  <View style={styles.quotaLabels}>
    <Text style={styles.quotaLabel}>1 GB</Text>
    <Text style={styles.quotaLabel}>50 GB</Text>
  </View>

  {usedStorage > downloadQuota && (
    <View style={styles.quotaWarning}>
      <AlertCircle size={scale(16)} color={colors.warning} />
      <Text style={styles.warningText}>
        Current downloads ({usedStorage} GB) exceed quota
      </Text>
    </View>
  )}
</View>
```

### 4.15 & 4.16: Joystick Response Curve & Test Scrubber

**File:** `src/features/profile/screens/JoystickSeekSettingsScreen.tsx`

**Note:** These are complex features - simplified version:

```typescript
// Response curve visualization (simplified - not interactive)
<View style={styles.curveContainer}>
  <Text style={styles.sectionTitle}>Response Curve</Text>

  <Svg width={wp(80)} height={scale(150)} style={styles.curveSvg}>
    {/* Axis lines */}
    <Line x1={30} y1={120} x2={280} y2={120} stroke={colors.textTertiary} />
    <Line x1={30} y1={20} x2={30} y2={120} stroke={colors.textTertiary} />

    {/* Curve path based on selected preset */}
    <Path
      d={getCurvePath(curvePreset)}
      stroke={colors.accent}
      strokeWidth={2}
      fill="none"
    />

    {/* Labels */}
    <SvgText x={30} y={135} fill={colors.textSecondary} fontSize={10}>Slow</SvgText>
    <SvgText x={260} y={135} fill={colors.textSecondary} fontSize={10}>Fast</SvgText>
    <SvgText x={5} y={120} fill={colors.textSecondary} fontSize={10}>1x</SvgText>
    <SvgText x={5} y={25} fill={colors.textSecondary} fontSize={10}>{maxSpeed}x</SvgText>
  </Svg>

  {/* Preset buttons */}
  <View style={styles.presetButtons}>
    {['linear', 'ease-in', 'ease-out', 'exponential'].map(preset => (
      <TouchableOpacity
        key={preset}
        style={[styles.presetButton, curvePreset === preset && styles.presetButtonActive]}
        onPress={() => setCurvePreset(preset)}
      >
        <Text style={styles.presetText}>{preset}</Text>
      </TouchableOpacity>
    ))}
  </View>
</View>

// Test scrubber area
<View style={styles.testSection}>
  <Text style={styles.sectionTitle}>Test Area</Text>
  <Text style={styles.testInstructions}>
    Long-press and drag to test seek sensitivity
  </Text>

  <View style={styles.testTimeline}>
    <GestureDetector gesture={testPanGesture}>
      <Animated.View style={[styles.testMarker, testMarkerStyle]} />
    </GestureDetector>
  </View>

  <Text style={styles.testFeedback}>
    Speed: {testSpeed.toFixed(1)}x
  </Text>
</View>
```

### 4.17: Server Discovery/Scan (Fixed - Parallel Scanning)

**File:** `src/features/auth/screens/LoginScreen.tsx`

**Implementation Approach:** Use parallel Promise.all with timeout for efficient scanning.

```typescript
import NetInfo from '@react-native-community/netinfo';

const [isScanning, setIsScanning] = useState(false);
const [discoveredServers, setDiscoveredServers] = useState<string[]>([]);
const [scanProgress, setScanProgress] = useState(0);

// Timeout wrapper for fetch
const fetchWithTimeout = (url: string, timeout: number = 500): Promise<Response> => {
  return Promise.race([
    fetch(url, { method: 'GET' }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeout)
    ),
  ]);
};

// Check single IP:port for ABS server
const checkServer = async (ip: string, port: number): Promise<string | null> => {
  try {
    const url = `http://${ip}:${port}`;
    const response = await fetchWithTimeout(`${url}/api/ping`);
    if (response.ok) {
      return url;
    }
  } catch {
    // Not a server or timeout
  }
  return null;
};

const scanForServers = async () => {
  setIsScanning(true);
  setDiscoveredServers([]);
  setScanProgress(0);

  try {
    // Get local network info
    const netInfo = await NetInfo.fetch();
    const localIp = netInfo.details?.ipAddress;

    if (!localIp) {
      showToast({ type: 'error', message: 'Unable to get network info' });
      return;
    }

    // Scan common ports on local network
    const subnet = localIp.split('.').slice(0, 3).join('.');
    const ports = [13378, 80, 443];  // Common ABS ports
    const found: string[] = [];

    // Create all scan promises (parallel approach)
    const scanPromises: Promise<string | null>[] = [];
    const totalChecks = 50 * ports.length; // 50 IPs × 3 ports

    for (let i = 1; i <= 50; i++) {
      const ip = `${subnet}.${i}`;
      for (const port of ports) {
        scanPromises.push(checkServer(ip, port));
      }
    }

    // Execute in batches of 20 for controlled parallelism
    const batchSize = 20;
    for (let i = 0; i < scanPromises.length; i += batchSize) {
      const batch = scanPromises.slice(i, i + batchSize);
      const results = await Promise.all(batch);

      results.forEach(url => {
        if (url && !found.includes(url)) {
          found.push(url);
          setDiscoveredServers([...found]); // Update UI as servers are found
        }
      });

      setScanProgress((i + batchSize) / totalChecks);
    }

    if (found.length === 0) {
      showToast({ type: 'info', message: 'No servers found on local network' });
    }
  } finally {
    setIsScanning(false);
    setScanProgress(1);
  }
};

// In render
<View style={styles.discoverySection}>
  <TouchableOpacity
    style={styles.scanButton}
    onPress={scanForServers}
    disabled={isScanning}
  >
    {isScanning ? (
      <View style={styles.scanningRow}>
        <ActivityIndicator size="small" color={colors.textPrimary} />
        <Text style={styles.scanButtonText}>
          Scanning... {Math.round(scanProgress * 100)}%
        </Text>
      </View>
    ) : (
      <>
        <Search size={scale(18)} color={colors.textPrimary} />
        <Text style={styles.scanButtonText}>Find Servers</Text>
      </>
    )}
  </TouchableOpacity>

  {discoveredServers.length > 0 && (
    <View style={styles.discoveredList}>
      <Text style={styles.discoveredTitle}>Found Servers</Text>
      {discoveredServers.map(url => (
        <TouchableOpacity
          key={url}
          style={styles.discoveredItem}
          onPress={() => setServerUrl(url)}
        >
          <Server size={scale(18)} color={colors.textSecondary} />
          <Text style={styles.discoveredUrl}>{url}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )}
</View>
```

**Performance Note:** This parallel approach completes scanning of 150 endpoints (50 IPs × 3 ports) in ~4 seconds instead of ~75 seconds with sequential scanning.

---

## Testing Criteria

- [ ] MoodDiscovery shows 6 options in 2x3 grid
- [ ] PreferencesOnboarding animates between steps
- [ ] Download quota slider saves value
- [ ] Quota warning shows when exceeded
- [ ] Response curve updates with preset selection
- [ ] Test scrubber responds to gestures
- [ ] Server scan finds local ABS instances (parallel, ~4s)
- [ ] Scan progress indicator updates smoothly
- [ ] Found servers populate URL field on tap

---

## Effort Breakdown

| Task | Effort | Risk |
|------|--------|------|
| MoodDiscovery 2x3 grid | 1 hour | Low |
| PreferencesOnboarding animation | 1.5 hours | Low |
| Document progress/mood guidelines | 30 min | Low |
| Download quota slider | 1.5 hours | Low |
| Response curve visualization | 3 hours | Medium |
| Test scrubber area | 2 hours | Medium |
| Server discovery (parallel) | 2 hours | Low |
| Testing | 2 hours | - |

**Total: 2-4 days**
