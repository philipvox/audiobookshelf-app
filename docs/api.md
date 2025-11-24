# AudiobookShelf API

Base URL stored in SecureStore after login.

## Authentication
```ts
// Login
POST /login
Body: { username, password }
Response: { user: { token }, userDefaultLibraryId }

// All subsequent requests
Header: Authorization: Bearer {token}
```

## Endpoints

### Libraries
```
GET /api/libraries                    # List all libraries
GET /api/libraries/{id}               # Get library
GET /api/libraries/{id}/items         # Get items (paginated)
GET /api/libraries/{id}/series        # Get all series
GET /api/libraries/{id}/authors       # Get all authors
GET /api/libraries/{id}/filterdata    # Get filters (genres, narrators, etc.)
GET /api/libraries/{id}/search?q=     # Search library
```

### Items
```
GET /api/items/{id}                   # Get item details
GET /api/items/{id}/cover             # Get cover image
```

### Authors
```
GET /api/authors/{id}?include=items   # Get author with books
GET /api/authors/{id}/image           # Get author image
```

### Series
```
GET /api/series/{id}                  # Get series details
```

### Progress
```
GET /api/me/progress                  # All progress
PATCH /api/me/progress/{itemId}       # Update progress
```

### Playback Sessions
```
POST /api/session/{itemId}            # Create session
POST /api/session/{id}/sync           # Sync progress
POST /api/session/{id}/close          # Close session
```

## Client Usage
```ts
import { apiClient } from '@/core/api';

// Get library items with pagination
const response = await apiClient.getLibraryItems(libraryId, {
  limit: 50,
  page: 0,
});

// Search
const results = await apiClient.searchLibrary(libraryId, { q: 'query' });

// Get author with books
const author = await apiClient.getAuthor(authorId, { include: 'items' });

// Update progress
await apiClient.updateProgress(itemId, {
  currentTime: 3600,
  progress: 0.5,
});
```

## Pagination
```ts
interface PaginatedResponse<T> {
  results: T[];
  total: number;
  limit: number;
  page: number;
}
```

## Narrator Note

No dedicated narrator endpoint. Narrators are in `item.media.metadata.narratorName` as comma-separated string. Extract and count from library items.