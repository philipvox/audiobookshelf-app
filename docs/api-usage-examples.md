# API Client Usage Examples

## Configuration

First, configure the API client with your AudiobookShelf server URL:

```typescript
import { apiClient } from '@/core/api';

// Configure the client
apiClient.configure({
  baseURL: 'http://your-server:13378',
  timeout: 30000 // optional, defaults to 30 seconds
});
```

## Authentication

### Login

```typescript
try {
  const response = await apiClient.login('username', 'password');
  
  console.log('User:', response.user);
  console.log('Default library:', response.userDefaultLibraryId);
  console.log('Server settings:', response.serverSettings);
  
  // Token is automatically stored in the client for subsequent requests
} catch (error) {
  console.error('Login failed:', error.message);
}
```

### Logout

```typescript
try {
  await apiClient.logout();
  // Token is automatically cleared
} catch (error) {
  console.error('Logout failed:', error.message);
}
```

### Manual Token Management

```typescript
// Set token manually (e.g., from secure storage)
apiClient.setAuthToken('your-token-here');

// Clear token
apiClient.clearAuthToken();
```

## User Operations

### Get Current User

```typescript
try {
  const user = await apiClient.getCurrentUser();
  console.log('User:', user.username, user.email);
  console.log('Permissions:', user.permissions);
} catch (error) {
  console.error('Failed to get user:', error.message);
}
```

### Get User Progress

```typescript
try {
  const progress = await apiClient.getUserProgress();
  
  progress.forEach(item => {
    console.log(`${item.libraryItemId}: ${item.progress * 100}% complete`);
  });
} catch (error) {
  console.error('Failed to get progress:', error.message);
}
```

## Library Operations

### Get All Libraries

```typescript
try {
  const libraries = await apiClient.getLibraries();
  
  libraries.forEach(lib => {
    console.log(`${lib.name} (${lib.mediaType})`);
  });
} catch (error) {
  console.error('Failed to get libraries:', error.message);
}
```

### Get Library Items

```typescript
try {
  // Basic request
  const response = await apiClient.getLibraryItems('library-id');
  
  // With pagination and filters
  const filtered = await apiClient.getLibraryItems('library-id', {
    limit: 20,
    page: 0,
    sort: 'media.metadata.title',
    filter: 'progress',
    minified: true,
    include: 'progress'
  });
  
  console.log(`Total items: ${response.total}`);
  console.log(`Current page: ${response.page}`);
  response.results.forEach(item => {
    console.log(item.media.metadata.title);
  });
} catch (error) {
  console.error('Failed to get library items:', error.message);
}
```

## Item Operations

### Get Item Details

```typescript
try {
  // Basic item
  const item = await apiClient.getItem('item-id');
  
  // With additional data
  const fullItem = await apiClient.getItem('item-id', 'progress,rssfeed');
  
  console.log('Title:', item.media.metadata.title);
  console.log('Author:', item.media.metadata.authors[0]?.name);
  console.log('Duration:', item.media.duration);
} catch (error) {
  console.error('Failed to get item:', error.message);
}
```

### Get Cover URL

```typescript
const coverUrl = apiClient.getItemCoverUrl('item-id');
console.log('Cover URL:', coverUrl);

// Use in React Native Image component
<Image source={{ uri: coverUrl }} />
```

## Progress Tracking

### Update Progress

```typescript
try {
  const progress = await apiClient.updateProgress('item-id', {
    currentTime: 3600, // 1 hour in seconds
    duration: 7200, // 2 hours total
    progress: 0.5, // 50% complete
    isFinished: false
  });
  
  console.log('Progress updated:', progress.progress);
} catch (error) {
  console.error('Failed to update progress:', error.message);
}
```

### Mark as Finished

```typescript
try {
  await apiClient.updateProgress('item-id', {
    currentTime: 7200,
    duration: 7200,
    progress: 1.0,
    isFinished: true
  });
} catch (error) {
  console.error('Failed to mark as finished:', error.message);
}
```

## Playback Sessions

### Create Playback Session

```typescript
try {
  const session = await apiClient.createPlaybackSession('item-id', {
    deviceInfo: {
      clientName: 'AudiobookShelf Mobile',
      clientVersion: '1.0.0',
      deviceId: 'unique-device-id',
      manufacturer: 'Apple',
      model: 'iPhone 14',
      sdkVersion: 33,
    },
    supportedMimeTypes: [
      'audio/mpeg',
      'audio/mp4',
      'audio/m4a',
      'audio/webm'
    ],
    mediaPlayer: 'expo-av'
  });
  
  console.log('Session ID:', session.id);
  console.log('Current time:', session.currentTime);
} catch (error) {
  console.error('Failed to create session:', error.message);
}
```

### Sync Playback Session

```typescript
try {
  await apiClient.syncPlaybackSession(
    'session-id',
    3600, // current time in seconds
    300   // time listened this session
  );
} catch (error) {
  console.error('Failed to sync session:', error.message);
}
```

### Close Playback Session

```typescript
try {
  await apiClient.closePlaybackSession('session-id');
} catch (error) {
  console.error('Failed to close session:', error.message);
}
```

## Search

### Search Library

```typescript
try {
  const results = await apiClient.searchLibrary('library-id', {
    q: 'harry potter',
    limit: 10
  });
  
  console.log('Books:', results.book.length);
  console.log('Authors:', results.authors.length);
  console.log('Series:', results.series.length);
  console.log('Tags:', results.tags);
} catch (error) {
  console.error('Search failed:', error.message);
}
```

## Series

### Get Series

```typescript
try {
  const series = await apiClient.getLibrarySeries('library-id');
  
  series.forEach(s => {
    console.log(`${s.name}: ${s.books?.length || 0} books`);
  });
  
  // Get specific series
  const singleSeries = await apiClient.getSeries('series-id');
  console.log('Books in series:', singleSeries.books);
} catch (error) {
  console.error('Failed to get series:', error.message);
}
```

## Authors

### Get Authors

```typescript
try {
  const authors = await apiClient.getLibraryAuthors('library-id');
  
  authors.forEach(author => {
    console.log(author.name);
  });
  
  // Get specific author with books
  const author = await apiClient.getAuthor('author-id', {
    include: 'items,series'
  });
  
  console.log('Author:', author.name);
  console.log('Description:', author.description);
} catch (error) {
  console.error('Failed to get authors:', error.message);
}
```

### Get Author Image

```typescript
const imageUrl = apiClient.getAuthorImageUrl('author-id');
console.log('Author image:', imageUrl);
```

## Collections

### Manage Collections

```typescript
try {
  // Get all collections
  const collections = await apiClient.getCollections();
  
  // Create new collection
  const newCollection = await apiClient.createCollection({
    libraryId: 'library-id',
    name: 'My Favorites',
    description: 'Books I love',
    books: []
  });
  
  // Update collection
  const updated = await apiClient.updateCollection(newCollection.id, {
    name: 'Updated Name'
  });
  
  // Delete collection
  await apiClient.deleteCollection(newCollection.id);
} catch (error) {
  console.error('Collection operation failed:', error.message);
}
```

## Playlists

### Manage Playlists

```typescript
try {
  // Get all playlists
  const playlists = await apiClient.getPlaylists();
  
  // Create new playlist
  const newPlaylist = await apiClient.createPlaylist({
    libraryId: 'library-id',
    name: 'Road Trip',
    description: 'Books for the road',
    items: [
      { libraryItemId: 'item-1' },
      { libraryItemId: 'item-2' }
    ]
  });
  
  // Update playlist
  const updated = await apiClient.updatePlaylist(newPlaylist.id, {
    name: 'Updated Road Trip'
  });
  
  // Delete playlist
  await apiClient.deletePlaylist(newPlaylist.id);
} catch (error) {
  console.error('Playlist operation failed:', error.message);
}
```

## Error Handling

All API methods throw errors that should be caught:

```typescript
try {
  const item = await apiClient.getItem('invalid-id');
} catch (error) {
  // Error messages are user-friendly
  if (error.message.includes('Unauthorized')) {
    // Token expired, need to re-login
    navigation.navigate('Login');
  } else if (error.message.includes('Network error')) {
    // No internet connection
    showOfflineMode();
  } else if (error.message.includes('not found')) {
    // Item doesn't exist
    showNotFoundMessage();
  } else {
    // Generic error
    showErrorToast(error.message);
  }
}
```

## Integration with React Query

The API client works perfectly with TanStack Query:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api';

// Fetch library items
function useLibraryItems(libraryId: string) {
  return useQuery({
    queryKey: ['library', libraryId, 'items'],
    queryFn: () => apiClient.getLibraryItems(libraryId),
  });
}

// Update progress
function useUpdateProgress() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ itemId, data }) => 
      apiClient.updateProgress(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
  });
}
```
