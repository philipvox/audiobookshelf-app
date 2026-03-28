/**
 * src/core/services/__tests__/sqliteCache.test.ts
 *
 * Tests for SQLiteCache — the persistent storage layer.
 * Uses an in-memory mock that simulates real SQLite behavior
 * (row storage, parameterized queries, transactions).
 */

// ---------------------------------------------------------------------------
// In-memory SQLite mock
// ---------------------------------------------------------------------------

/** Simple in-memory table store for testing */
type Row = Record<string, any>;
interface Table {
  rows: Row[];
  columns: string[];
}

function createInMemoryDb() {
  const tables: Record<string, Table> = {};

  /** Minimal SQL parser for our test queries */
  function parseInsert(sql: string, params: any[]): void {
    // INSERT INTO tableName (col1, col2) VALUES (?, ?), (?, ?)
    const match = sql.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s+(.*)/is);
    if (!match) return;
    const tableName = match[1];
    const columns = match[2].split(',').map(c => c.trim());
    const valueSets = match[3].split(/\)\s*,\s*\(/).length;

    if (!tables[tableName]) {
      tables[tableName] = { rows: [], columns };
    }

    const colCount = columns.length;
    for (let i = 0; i < valueSets; i++) {
      const row: Row = {};
      for (let j = 0; j < colCount; j++) {
        row[columns[j]] = params[i * colCount + j];
      }
      // Handle OR REPLACE — remove existing row with same primary key
      if (sql.includes('OR REPLACE') || sql.includes('or replace')) {
        const pkCol = columns[0]; // Assume first column is PK
        tables[tableName].rows = tables[tableName].rows.filter(
          r => r[pkCol] !== row[pkCol]
        );
      }
      tables[tableName].rows.push(row);
    }
  }

  function parseSelect(sql: string, params: any[]): Row[] {
    // SELECT ... FROM tableName WHERE col = ?
    const fromMatch = sql.match(/FROM\s+(\w+)/i);
    if (!fromMatch) return [];
    const tableName = fromMatch[1];
    if (!tables[tableName]) return [];

    let rows = [...tables[tableName].rows];

    // Handle WHERE clauses
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|\s+GROUP|\s*$)/is);
    if (whereMatch && params.length > 0) {
      const conditions = whereMatch[1];
      // Simple single-condition WHERE: col = ? or col > ? etc.
      const condMatch = conditions.match(/(\w+)\s*(=|>|>=|<|<=|!=)\s*\?/);
      if (condMatch) {
        const [, col, op] = condMatch;
        const val = params[0];
        rows = rows.filter(r => {
          switch (op) {
            case '=': return r[col] === val || r[col] == val;
            case '>': return r[col] > val;
            case '>=': return r[col] >= val;
            case '<': return r[col] < val;
            case '<=': return r[col] <= val;
            case '!=': return r[col] !== val;
            default: return true;
          }
        });
      }
    }

    // Handle COUNT(*)
    if (sql.match(/SELECT\s+COUNT\(\*\)/i)) {
      return [{ count: rows.length }];
    }

    // Handle ORDER BY
    const orderMatch = sql.match(/ORDER\s+BY\s+(\w+)\s*(ASC|DESC)?/i);
    if (orderMatch) {
      const [, col, dir] = orderMatch;
      rows.sort((a, b) => {
        const av = a[col] ?? 0, bv = b[col] ?? 0;
        return dir?.toUpperCase() === 'DESC' ? (bv > av ? 1 : -1) : (av > bv ? 1 : -1);
      });
    }

    // Handle LIMIT
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      rows = rows.slice(0, parseInt(limitMatch[1]));
    }

    return rows;
  }

  function parseDelete(sql: string, params: any[]): { changes: number } {
    const match = sql.match(/DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(\w+)\s*=\s*\?)?/i);
    if (!match) return { changes: 0 };
    const [, tableName, col] = match;
    if (!tables[tableName]) return { changes: 0 };

    if (col && params.length > 0) {
      const before = tables[tableName].rows.length;
      tables[tableName].rows = tables[tableName].rows.filter(r => r[col] !== params[0]);
      return { changes: before - tables[tableName].rows.length };
    } else if (!col) {
      const count = tables[tableName].rows.length;
      tables[tableName].rows = [];
      return { changes: count };
    }
    return { changes: 0 };
  }

  function parseUpdate(sql: string, params: any[]): { changes: number } {
    // UPDATE tableName SET col1 = ?, col2 = ? WHERE pk = ?
    const match = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(\w+)\s*=\s*\?/is);
    if (!match) return { changes: 0 };
    const [, tableName, setClauses, whereCol] = match;
    if (!tables[tableName]) return { changes: 0 };

    const sets = setClauses.split(',').map(s => s.trim().split(/\s*=\s*/));
    const whereVal = params[params.length - 1];
    let changes = 0;

    tables[tableName].rows.forEach(row => {
      if (row[whereCol] === whereVal || row[whereCol] == whereVal) {
        let paramIdx = 0;
        for (const [col, val] of sets) {
          if (val === '?') {
            row[col] = params[paramIdx++];
          } else {
            // Expression like datetime('now')
            row[col] = val.replace(/'/g, '');
          }
        }
        changes++;
      }
    });
    return { changes };
  }

  const db = {
    execAsync: jest.fn(async (sql: string) => {
      // Handle CREATE TABLE, CREATE INDEX, PRAGMA, etc.
      const createMatches = sql.matchAll(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)\s*\(([^;]+)\)/gi);
      for (const m of createMatches) {
        const tableName = m[1];
        if (!tables[tableName]) {
          const cols = m[2].split(',')
            .map(c => c.trim().split(/\s+/)[0])
            .filter(c => !c.startsWith('--') && !c.startsWith('CREATE') && c.length > 0);
          tables[tableName] = { rows: [], columns: cols };
        }
      }
    }),
    getAllAsync: jest.fn(async (sql: string, params: any[] = []) => {
      return parseSelect(sql, params);
    }),
    getFirstAsync: jest.fn(async (sql: string, params: any[] = []) => {
      const rows = parseSelect(sql, params);
      return rows.length > 0 ? rows[0] : null;
    }),
    runAsync: jest.fn(async (sql: string, params: any[] = []) => {
      if (sql.trim().toUpperCase().startsWith('INSERT')) {
        parseInsert(sql, params);
        return { changes: 1, lastInsertRowId: Math.floor(Math.random() * 10000) };
      }
      if (sql.trim().toUpperCase().startsWith('DELETE')) {
        return parseDelete(sql, params);
      }
      if (sql.trim().toUpperCase().startsWith('UPDATE')) {
        return parseUpdate(sql, params);
      }
      return { changes: 0 };
    }),
    withTransactionAsync: jest.fn(async (fn: () => Promise<void>) => {
      await fn();
    }),
    closeAsync: jest.fn(),
  };

  return { db, tables };
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

let mockDb: ReturnType<typeof createInMemoryDb>['db'];
let mockTables: ReturnType<typeof createInMemoryDb>['tables'];

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

// Must import after mock setup
const SQLite = require('expo-sqlite');
const { sqliteCache } = require('../sqliteCache');

beforeEach(async () => {
  jest.clearAllMocks();
  const memDb = createInMemoryDb();
  mockDb = memDb.db;
  mockTables = memDb.tables;
  (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(mockDb);

  // Reset singleton state via close + reinit
  await sqliteCache.close();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SQLiteCache', () => {
  // ========================================================================
  // INITIALIZATION
  // ========================================================================
  describe('init', () => {
    it('creates tables and indexes on first init', async () => {
      await sqliteCache.init();
      expect(mockDb.execAsync).toHaveBeenCalled();
      // First call is PRAGMA, second is CREATE TABLE
      const allSql = mockDb.execAsync.mock.calls.map((c: any) => c[0]).join('\n');
      expect(allSql).toContain('CREATE TABLE IF NOT EXISTS library_items');
      expect(allSql).toContain('CREATE TABLE IF NOT EXISTS user_books');
      expect(allSql).toContain('CREATE TABLE IF NOT EXISTS downloads');
      expect(allSql).toContain('CREATE TABLE IF NOT EXISTS bookmarks');
      expect(allSql).toContain('CREATE TABLE IF NOT EXISTS listening_sessions');
    });

    it('is idempotent — second call is a no-op', async () => {
      await sqliteCache.init();
      const callCount = mockDb.execAsync.mock.calls.length;
      await sqliteCache.init();
      // Should not call execAsync again
      expect(mockDb.execAsync.mock.calls.length).toBe(callCount);
    });
  });

  // ========================================================================
  // LIBRARY ITEMS (JSON blob cache)
  // ========================================================================
  describe('library items', () => {
    const libraryId = 'lib-1';
    const makeItem = (id: string, title: string) => ({
      id,
      ino: '123',
      libraryId,
      folderId: 'fold-1',
      path: `/books/${title}`,
      relPath: title,
      isFile: false,
      mtimeMs: Date.now(),
      ctimeMs: Date.now(),
      birthtimeMs: Date.now(),
      addedAt: Date.now(),
      updatedAt: Date.now(),
      mediaType: 'book' as const,
      media: { metadata: { title, authorName: 'Author' } },
    });

    it('setLibraryItems + getLibraryItems round-trip', async () => {
      await sqliteCache.init();
      const items = [makeItem('book-1', 'Book One'), makeItem('book-2', 'Book Two')];
      await sqliteCache.setLibraryItems(libraryId, items);
      const result = await sqliteCache.getLibraryItems(libraryId);
      expect(result).toHaveLength(2);
      const ids = result.map((r: any) => r.id).sort();
      expect(ids).toEqual(['book-1', 'book-2']);
      const bookOne = result.find((r: any) => r.id === 'book-1');
      expect(bookOne.media.metadata.title).toBe('Book One');
    });

    it('getLibraryItems returns empty array for unknown library', async () => {
      await sqliteCache.init();
      const result = await sqliteCache.getLibraryItems('nonexistent');
      expect(result).toEqual([]);
    });

    it('setLibraryItems replaces previous items', async () => {
      await sqliteCache.init();
      await sqliteCache.setLibraryItems(libraryId, [makeItem('book-1', 'V1')]);
      await sqliteCache.setLibraryItems(libraryId, [makeItem('book-2', 'V2')]);
      const result = await sqliteCache.getLibraryItems(libraryId);
      // Should only have the new item
      expect(result.every((r: any) => r.id === 'book-2')).toBe(true);
    });

    it('getLibraryItem returns single item', async () => {
      await sqliteCache.init();
      await sqliteCache.setLibraryItems(libraryId, [makeItem('book-1', 'Solo')]);
      const item = await sqliteCache.getLibraryItem('book-1');
      expect(item).not.toBeNull();
      expect(item.media.metadata.title).toBe('Solo');
    });

    it('getLibraryItem returns null for missing item', async () => {
      await sqliteCache.init();
      const item = await sqliteCache.getLibraryItem('missing');
      expect(item).toBeNull();
    });

    it('survives corrupt JSON in one row without losing other rows', async () => {
      await sqliteCache.init();
      // Manually inject a corrupt row
      const table = mockTables['library_items'];
      if (table) {
        table.rows.push(
          { id: 'good', library_id: libraryId, data: JSON.stringify(makeItem('good', 'Good Book')), updated_at: Date.now() },
          { id: 'bad', library_id: libraryId, data: '{corrupt json!!!', updated_at: Date.now() },
          { id: 'also-good', library_id: libraryId, data: JSON.stringify(makeItem('also-good', 'Also Good')), updated_at: Date.now() },
        );
      }
      const result = await sqliteCache.getLibraryItems(libraryId);
      // Should get 2 good items, skipping the corrupt one
      expect(result).toHaveLength(2);
      expect(result.map((r: any) => r.id).sort()).toEqual(['also-good', 'good']);
    });
  });

  // ========================================================================
  // AUTHORS / SERIES / NARRATORS / COLLECTIONS (JSON blob caches)
  // ========================================================================
  describe('entity caches', () => {
    it('authors round-trip', async () => {
      await sqliteCache.init();
      const authors = [
        { id: 'a1', name: 'Sanderson', bookCount: 20 },
        { id: 'a2', name: 'Rothfuss', bookCount: 3 },
      ];
      await sqliteCache.setAuthors('lib-1', authors);
      const result = await sqliteCache.getAuthors('lib-1');
      expect(result).toHaveLength(2);
      expect(result.find((a: any) => a.name === 'Sanderson')).toBeDefined();
    });

    it('series round-trip', async () => {
      await sqliteCache.init();
      const series = [
        { id: 's1', name: 'Stormlight', bookCount: 4, books: [] },
      ];
      await sqliteCache.setSeries('lib-1', series);
      const result = await sqliteCache.getSeries('lib-1');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Stormlight');
    });

    it('narrators round-trip', async () => {
      await sqliteCache.init();
      const narrators = [{ id: 'n1', name: 'Michael Kramer', bookCount: 15 }];
      await sqliteCache.setNarrators('lib-1', narrators);
      const result = await sqliteCache.getNarrators('lib-1');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Michael Kramer');
    });

    it('collections round-trip', async () => {
      await sqliteCache.init();
      const collections = [{ id: 'c1', libraryId: 'lib-1', name: 'Favorites', books: [] }];
      await sqliteCache.setCollections(collections);
      const result = await sqliteCache.getCollections();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Favorites');
    });

    it('corrupt JSON in authors is skipped', async () => {
      await sqliteCache.init();
      const table = mockTables['authors'];
      if (table) {
        table.rows.push(
          { id: 'a1', library_id: 'lib-1', data: JSON.stringify({ id: 'a1', name: 'Good' }), updated_at: 1 },
          { id: 'a2', library_id: 'lib-1', data: 'NOT_JSON', updated_at: 2 },
        );
      }
      const result = await sqliteCache.getAuthors('lib-1');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Good');
    });
  });

  // ========================================================================
  // DOWNLOADS
  // ========================================================================
  describe('downloads', () => {
    it('setDownload + getDownload round-trip', async () => {
      await sqliteCache.init();
      const record = {
        itemId: 'dl-1',
        status: 'complete' as const,
        progress: 1.0,
        filePath: '/data/dl-1.m4b',
        fileSize: 123456,
        downloadedAt: new Date().toISOString(),
        error: null,
        userPaused: false,
      };
      await sqliteCache.setDownload(record);
      const result = await sqliteCache.getDownload('dl-1');
      expect(result).not.toBeNull();
      expect(result.status).toBe('complete');
      expect(result.filePath).toBe('/data/dl-1.m4b');
    });

    it('getDownload returns null for missing item', async () => {
      await sqliteCache.init();
      const result = await sqliteCache.getDownload('missing');
      expect(result).toBeNull();
    });

    it('deleteDownload removes the record', async () => {
      await sqliteCache.init();
      await sqliteCache.setDownload({
        itemId: 'dl-2', status: 'complete', progress: 1, filePath: '/x',
        fileSize: 100, downloadedAt: null, error: null, userPaused: false,
      });
      await sqliteCache.deleteDownload('dl-2');
      const result = await sqliteCache.getDownload('dl-2');
      expect(result).toBeNull();
    });
  });

  // ========================================================================
  // DOWNLOAD QUEUE
  // ========================================================================
  describe('download queue', () => {
    it('addToDownloadQueue + getNextDownload', async () => {
      await sqliteCache.init();
      await sqliteCache.addToDownloadQueue('item-a', 1);
      await sqliteCache.addToDownloadQueue('item-b', 5);
      const next = await sqliteCache.getNextDownload();
      // Higher priority first
      expect(next).toBe('item-b');
    });

    it('removeFromDownloadQueue removes item', async () => {
      await sqliteCache.init();
      await sqliteCache.addToDownloadQueue('item-c', 0);
      await sqliteCache.removeFromDownloadQueue('item-c');
      const count = await sqliteCache.getDownloadQueueCount();
      expect(count).toBe(0);
    });
  });

  // ========================================================================
  // PLAYBACK QUEUE
  // ========================================================================
  describe('playback queue', () => {
    it('addToQueue + getQueue round-trip', async () => {
      await sqliteCache.init();
      const bookData = JSON.stringify({ id: 'b1', title: 'Test Book' });
      const id = await sqliteCache.addToQueue('b1', bookData);
      expect(typeof id).toBe('string');
      const queue = await sqliteCache.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].bookId).toBe('b1');
    });

    it('removeFromQueue removes by bookId', async () => {
      await sqliteCache.init();
      await sqliteCache.addToQueue('b1', '{}');
      await sqliteCache.addToQueue('b2', '{}');
      await sqliteCache.removeFromQueue('b1');
      const queue = await sqliteCache.getQueue();
      expect(queue.every((q: any) => q.bookId !== 'b1')).toBe(true);
    });

    it('isInQueue returns correct boolean', async () => {
      await sqliteCache.init();
      await sqliteCache.addToQueue('b1', '{}');
      expect(await sqliteCache.isInQueue('b1')).toBe(true);
      expect(await sqliteCache.isInQueue('b99')).toBe(false);
    });

    it('clearQueue removes all items', async () => {
      await sqliteCache.init();
      await sqliteCache.addToQueue('b1', '{}');
      await sqliteCache.addToQueue('b2', '{}');
      await sqliteCache.clearQueue();
      expect(await sqliteCache.getQueueCount()).toBe(0);
    });
  });

  // ========================================================================
  // BOOKMARKS
  // ========================================================================
  describe('bookmarks', () => {
    const bookmark = {
      id: 'bm-1',
      bookId: 'book-1',
      title: 'Great passage',
      note: 'Remember this part',
      time: 3600.5,
      chapterTitle: 'Chapter 12',
      createdAt: Date.now(),
    };

    it('addBookmark + getBookmarks round-trip', async () => {
      await sqliteCache.init();
      await sqliteCache.addBookmark(bookmark);
      const result = await sqliteCache.getBookmarks('book-1');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Great passage');
      expect(result[0].time).toBe(3600.5);
      expect(result[0].note).toBe('Remember this part');
    });

    it('removeBookmark deletes by id', async () => {
      await sqliteCache.init();
      await sqliteCache.addBookmark(bookmark);
      await sqliteCache.removeBookmark('bm-1');
      const result = await sqliteCache.getBookmarks('book-1');
      expect(result).toHaveLength(0);
    });

    it('getBookmarkCount returns correct count', async () => {
      await sqliteCache.init();
      await sqliteCache.addBookmark(bookmark);
      await sqliteCache.addBookmark({ ...bookmark, id: 'bm-2', time: 7200 });
      const count = await sqliteCache.getBookmarkCount('book-1');
      expect(count).toBe(2);
    });
  });

  // ========================================================================
  // SYNC QUEUE
  // ========================================================================
  describe('sync queue', () => {
    it('addToSyncQueue + getSyncQueue', async () => {
      await sqliteCache.init();
      await sqliteCache.addToSyncQueue({
        action: 'updateProgress',
        payload: JSON.stringify({ bookId: 'b1', progress: 0.5 }),
        createdAt: new Date().toISOString(),
        retryCount: 0,
      });
      const queue = await sqliteCache.getSyncQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].action).toBe('updateProgress');
    });

    it('clearSyncQueue removes all items', async () => {
      await sqliteCache.init();
      await sqliteCache.addToSyncQueue({
        action: 'test', payload: '{}', createdAt: new Date().toISOString(), retryCount: 0,
      });
      await sqliteCache.clearSyncQueue();
      const queue = await sqliteCache.getSyncQueue();
      expect(queue).toHaveLength(0);
    });
  });

  // ========================================================================
  // FAVORITES
  // ========================================================================
  describe('favorites', () => {
    it('addFavorite + isFavorite', async () => {
      await sqliteCache.init();
      await sqliteCache.addFavorite('book-1');
      expect(await sqliteCache.isFavorite('book-1')).toBe(true);
      expect(await sqliteCache.isFavorite('book-2')).toBe(false);
    });

    it('removeFavorite removes the item', async () => {
      await sqliteCache.init();
      await sqliteCache.addFavorite('book-1');
      await sqliteCache.removeFavorite('book-1');
      expect(await sqliteCache.isFavorite('book-1')).toBe(false);
    });

    it('getFavorites returns all favorites', async () => {
      await sqliteCache.init();
      await sqliteCache.addFavorite('book-1');
      await sqliteCache.addFavorite('book-2');
      const favs = await sqliteCache.getFavorites();
      expect(favs).toHaveLength(2);
    });
  });

  // ========================================================================
  // CACHE MANAGEMENT
  // ========================================================================
  describe('cache management', () => {
    it('clearLibraryCache removes items for specific library', async () => {
      await sqliteCache.init();
      const table = mockTables['library_items'];
      if (table) {
        table.rows.push(
          { id: 'a', library_id: 'lib-1', data: '{}', updated_at: 1 },
          { id: 'b', library_id: 'lib-2', data: '{}', updated_at: 1 },
        );
      }
      await sqliteCache.clearLibraryCache('lib-1');
      // runAsync DELETE was called for lib-1
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM library_items'),
        expect.arrayContaining(['lib-1'])
      );
    });

    it('close resets state', async () => {
      await sqliteCache.init();
      await sqliteCache.close();
      expect(mockDb.closeAsync).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // EDGE CASES
  // ========================================================================
  describe('edge cases', () => {
    it('safeJsonParse handles null/undefined', async () => {
      await sqliteCache.init();
      // Inject a null data row
      const table = mockTables['library_items'];
      if (table) {
        table.rows.push({ id: 'null-data', library_id: 'lib-1', data: null, updated_at: 1 });
      }
      const result = await sqliteCache.getLibraryItems('lib-1');
      // null data should be filtered out
      expect(result).toHaveLength(0);
    });

    it('empty arrays are handled gracefully', async () => {
      await sqliteCache.init();
      await sqliteCache.setLibraryItems('lib-1', []);
      await sqliteCache.setAuthors('lib-1', []);
      await sqliteCache.setSeries('lib-1', []);
      await sqliteCache.setNarrators('lib-1', []);
      await sqliteCache.setCollections([]);
      // No errors thrown
    });

    it('concurrent init calls only initialize once', async () => {
      const p1 = sqliteCache.init();
      const p2 = sqliteCache.init();
      const p3 = sqliteCache.init();
      await Promise.all([p1, p2, p3]);
      // openDatabaseAsync should only be called once
      const { openDatabaseAsync } = require('expo-sqlite');
      expect(openDatabaseAsync).toHaveBeenCalledTimes(1);
    });
  });
});
