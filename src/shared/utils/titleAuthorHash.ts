/**
 * src/shared/utils/titleAuthorHash.ts
 *
 * Fuzzy title+author hash for matching books across different ABS instances.
 * Must produce identical output to the Python version on the community spine server.
 *
 * Normalization: lowercase → NFKD decompose → strip combining marks → keep only [a-z0-9]
 * Hash: sha256(normalizedTitle + "|" + normalizedAuthor)[:16]
 */

import * as Crypto from 'expo-crypto';

/**
 * Normalize text for fuzzy matching.
 * Strips ALL non-alphanumeric characters (spaces, periods, accents, etc.)
 * so that "V. E. Schwab", "V.E. Schwab", and "V E Schwab" all become "veschwab".
 */
function normalizeText(s: string): string {
  let result = s.toLowerCase().trim();
  // NFKD decomposition splits accented chars (é → e + combining accent)
  result = result.normalize('NFKD');
  // Strip combining diacritical marks (accents, tildes, etc.)
  result = result.replace(/[\u0300-\u036f]/g, '');
  // Keep ONLY lowercase letters and digits — remove everything else
  result = result.replace(/[^a-z0-9]/g, '');
  return result;
}

/**
 * Compute a fuzzy hash for a title+author pair.
 * Returns a 16-character hex string.
 *
 * This MUST match the Python `title_author_hash()` on the community server exactly.
 */
export async function titleAuthorHash(title: string, author: string): Promise<string> {
  const key = normalizeText(title) + '|' + normalizeText(author);
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    key
  );
  return digest.slice(0, 16).toLowerCase();
}

/**
 * Batch compute hashes for multiple books.
 * More efficient than calling titleAuthorHash one at a time.
 */
export async function batchTitleAuthorHash(
  books: { id: string; title: string; author: string }[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  // Process in batches of 100 to avoid blocking
  const BATCH_SIZE = 100;
  for (let i = 0; i < books.length; i += BATCH_SIZE) {
    const batch = books.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (book) => {
      const hash = await titleAuthorHash(book.title, book.author);
      result.set(book.id, hash);
    });
    await Promise.all(promises);
  }
  return result;
}
