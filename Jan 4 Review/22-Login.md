# Login Documentation

## Overview

The Login system handles authentication with AudiobookShelf servers. It provides server URL discovery/normalization, credential validation, secure token storage, and session restoration.

**Screen:** `src/features/auth/screens/LoginScreen.tsx`
**Service:** `src/core/auth/authService.ts`
**Context:** `src/core/auth/authContext.tsx`

---

## Server Discovery

### URL Input & Normalization

The login screen accepts server URLs in flexible formats and normalizes them:

```typescript
function normalizeServerUrl(url: string): { normalized: string; corrected: boolean; error?: string }
```

**Normalization Rules:**
1. **Add protocol** - If missing, defaults to `https://`
2. **Remove trailing slashes** - Strips `/` from end
3. **Validate structure** - Uses `new URL()` to validate

**Examples:**
| User Input | Normalized Output |
|------------|-------------------|
| `server.example.com` | `https://server.example.com` |
| `http://192.168.1.100:13378/` | `http://192.168.1.100:13378` |
| `my-server.com:13378` | `https://my-server.com:13378` |

### Real-Time URL Validation

The UI provides live feedback as the user types:

| Status | Icon | Border Color | Message |
|--------|------|--------------|---------|
| `empty` | None | Default | None |
| `valid` | ✓ Green | Green | "URL looks good" |
| `correctable` | ⚠ Gold | Green | "Will connect to https://..." |
| `invalid` | ✕ Red | Red | Error message |

### Last Server Memory

On screen mount, the last used server URL is loaded:

```typescript
useEffect(() => {
  loadLastServerUrl();
}, []);

const loadLastServerUrl = async () => {
  const lastUrl = await authService.getStoredServerUrl();
  if (lastUrl) {
    setServerUrl(lastUrl);
  }
};
```

---

## Credential Validation

### Client-Side Validation

Before sending to server, the login form validates:

1. **Server URL** - Not empty, valid format
2. **Username** - Not empty (whitespace trimmed)
3. **Password** - Not empty

### Server-Side Validation

The `authService.login()` method handles server responses:

```typescript
async login(serverUrl: string, username: string, password: string): Promise<User> {
  // 1. Configure API client with server URL
  apiClient.configure({ baseURL: serverUrl });

  // 2. Send POST /login request
  const response = await apiClient.login(username, password);

  // 3. Validate response has user object
  if (!response.user) {
    throw new Error('Invalid response from server');
  }

  // 4. Store credentials and return user
  await this.storeToken(user.token);
  await this.storeServerUrl(serverUrl);
  await this.storeUser(user);

  return user;
}
```

### Login Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        LOGIN FLOW                               │
└─────────────────────────────────────────────────────────────────┘

User enters:                    LoginScreen
  • Server URL                       │
  • Username                         │ validateInputs()
  • Password                         │
         │                           ▼
         │                  ┌─────────────────┐
         │                  │ Normalize URL   │
         │                  │ Check required  │
         │                  └────────┬────────┘
         │                           │
         │                           ▼
         │                  ┌─────────────────┐
         │                  │ useAuth.login() │
         │                  └────────┬────────┘
         │                           │
         │                           ▼
         │              ┌────────────────────────┐
         │              │  authService.login()   │
         │              └────────────┬───────────┘
         │                           │
         │    ┌──────────────────────┼──────────────────────┐
         │    │                      │                      │
         │    ▼                      ▼                      ▼
         │  apiClient           apiClient.login()      On Success:
         │  .configure()        POST /login            • storeToken()
         │  (set baseURL)            │                 • storeServerUrl()
         │                           │                 • storeUser()
         │                           ▼
         │              ┌────────────────────────┐
         │              │   Server Response      │
         │              │   { user, token }      │
         │              └────────────┬───────────┘
         │                           │
         │                           ▼
         │              ┌────────────────────────┐
         │              │  AuthContext updates   │
         │              │  user, serverUrl       │
         │              └────────────┬───────────┘
         │                           │
         │                           ▼
         │              ┌────────────────────────┐
         │              │  Connect WebSocket     │
         │              │  Prefetch main tab     │
         │              └────────────────────────┘
         │                           │
         │                           ▼
         │              ┌────────────────────────┐
         │              │  Navigate to Home      │
         │              │  (isAuthenticated=true)│
         │              └────────────────────────┘
```

---

## Token Storage

### Storage Strategy

The app uses a hybrid storage approach for security and performance:

| Data | Storage | Reason |
|------|---------|--------|
| `auth_token` | **SecureStore** | Sensitive credential |
| `server_url` | **SecureStore** | Somewhat sensitive |
| `user_data` | **AsyncStorage** | Can exceed SecureStore's 2KB limit |

### Storage Keys

```typescript
const TOKEN_KEY = 'auth_token';
const SERVER_URL_KEY = 'server_url';
const USER_KEY = 'user_data';
```

### Cross-Platform Storage Class

```typescript
class Storage {
  private canUseSecureStore(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  async setSecureItem(key: string, value: string): Promise<void> {
    if (this.canUseSecureStore()) {
      await SecureStore.setItemAsync(key, value);
    } else {
      await AsyncStorage.setItem(key);  // Web fallback
    }
  }
  // ... get, delete methods
}
```

### Session Restoration

On app launch, credentials are restored:

```typescript
async restoreSessionOptimized(): Promise<{ user: User | null; serverUrl: string | null }> {
  // Read all values in parallel (reduces latency from ~150ms to ~50ms)
  const [token, serverUrl, userJson] = await Promise.all([
    storage.getSecureItem(TOKEN_KEY),
    storage.getSecureItem(SERVER_URL_KEY),
    storage.getItem(USER_KEY),
  ]);

  if (token && serverUrl && userJson) {
    // Configure API client and return session
    apiClient.configure({ baseURL: serverUrl, token });
    return { user: JSON.parse(userJson), serverUrl };
  }

  // Handle partial data (corrupted state)
  if (token || serverUrl || userJson) {
    await this.clearStorage();
  }

  return { user: null, serverUrl: null };
}
```

**Retry Logic:** 3 attempts with exponential backoff for SecureStore reliability on Android.

---

## Multi-Server Support

### Current Implementation

**No multi-server support.** The app stores credentials for ONE server at a time.

### Behavior

| Scenario | Result |
|----------|--------|
| Login to Server A | Credentials stored for A |
| Login to Server B | Server A credentials **overwritten** |
| Log out | All credentials cleared |
| Reopen app | Last server URL pre-filled |

### What Gets Replaced

When logging into a different server:
- Previous token is overwritten
- Previous server URL is overwritten
- Previous user data is overwritten
- Downloaded books remain (but may not work with new server)

### Potential Future Enhancement

Multi-server support would require:
1. Keying storage by server URL or server ID
2. Server selection UI
3. Token management per server
4. Library isolation per server

---

## Error States

### Validation Errors (Client-Side)

| Error | Trigger |
|-------|---------|
| "Please enter a server URL" | Empty URL field |
| "Invalid URL protocol. Use http:// or https://" | Wrong protocol (ftp://, etc.) |
| "Invalid server URL" | No hostname detected |
| "Invalid server URL format" | URL parsing fails |
| "Please enter a username" | Empty username field |
| "Please enter a password" | Empty password field |

### Server Errors

| HTTP Status | Displayed Error |
|-------------|-----------------|
| 401 Unauthorized | "Invalid username or password" |
| 403 Forbidden | "Account is locked or disabled" |
| Network Error | "Cannot connect to server. Check your connection and server URL." |
| ECONNREFUSED | "Server not found. Please verify the server URL." |
| Invalid Response | "Invalid server response. Is this an AudiobookShelf server?" |
| Other | Original error message or "Login failed. Please try again." |

### Session Errors

| Error | Trigger | Handling |
|-------|---------|----------|
| Session expired | 401 from API after re-auth fails | Auto-logout, show "Your session has expired. Please log in again." |
| Partial session data | Some but not all storage keys present | Clear all storage, require fresh login |
| Storage read failure | SecureStore access fails | Retry up to 3 times with backoff |

### Error Display

Errors are shown inline in a red container:
```
┌─────────────────────────────────────────┐
│ ⚠  Invalid username or password        │
│                                         │
└─────────────────────────────────────────┘
```

Errors clear automatically when user modifies any input field.

---

## Auth Context API

### Provider

```typescript
<AuthProvider initialSession={session}>
  {children}
</AuthProvider>
```

### Hook

```typescript
const { user, isLoading, isAuthenticated, serverUrl, error, login, logout, clearError } = useAuth();
```

| Property | Type | Description |
|----------|------|-------------|
| `user` | `User \| null` | Current authenticated user |
| `isLoading` | `boolean` | Auth operation in progress |
| `isAuthenticated` | `boolean` | `!!user` |
| `serverUrl` | `string \| null` | Connected server URL |
| `error` | `string \| null` | Last error message |
| `login` | `(url, user, pass) => Promise` | Login function |
| `logout` | `() => Promise` | Logout function |
| `clearError` | `() => void` | Clear error state |

---

## Post-Login Actions

After successful login:

1. **Store Credentials** - Token, URL, user data saved
2. **Configure API Client** - Set base URL and auth token
3. **Update Auth Context** - Set user, serverUrl state
4. **Connect WebSocket** - `appInitializer.connectWebSocket()`
5. **Prefetch Data** - `prefetchMainTabData()` (non-blocking)
6. **Navigate** - App router shows authenticated screens

---

## Key Files

| File | Purpose |
|------|---------|
| `src/features/auth/screens/LoginScreen.tsx` | Login UI with URL validation |
| `src/core/auth/authService.ts` | Auth operations + storage |
| `src/core/auth/authContext.tsx` | React context for auth state |
| `src/core/auth/index.ts` | Public exports |
| `src/core/api/apiClient.ts` | HTTP client with auth token |

---

## Security Notes

1. **HTTPS Default** - URLs without protocol default to `https://`
2. **SecureStore** - Tokens stored in OS-level secure storage
3. **No Password Storage** - Password never stored, only auth token
4. **Token Expiry** - Handled by 401 response → auto-logout
5. **Server Logout** - Best-effort notification to server on logout
