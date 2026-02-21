/**
 * src/core/api/endpoints/collections.ts
 *
 * Collections API endpoints
 */

import { apiClient } from '../apiClient';
import { Collection } from '@/core/types/library';

/**
 * Collection create/update data (uses book IDs, not full items)
 */
interface CollectionData {
  libraryId?: string;
  name?: string;
  description?: string;
  books?: string[];
}

/**
 * Collections API
 */
export const collectionsApi = {
  /**
   * Get all collections
   */
  getAll: async (): Promise<Collection[]> => {
    return apiClient.getCollections();
  },

  /**
   * Get a collection by ID
   */
  getById: async (collectionId: string): Promise<Collection> => {
    return apiClient.getCollection(collectionId);
  },

  /**
   * Create a new collection
   */
  create: async (data: {
    libraryId: string;
    name: string;
    description?: string;
    books?: string[];
  }): Promise<Collection> => {
    return apiClient.createCollection(data as Partial<Collection>);
  },

  /**
   * Update a collection
   */
  update: async (
    collectionId: string,
    data: CollectionData
  ): Promise<Collection> => {
    return apiClient.updateCollection(collectionId, data as Partial<Collection>);
  },

  /**
   * Delete a collection
   */
  delete: async (collectionId: string): Promise<void> => {
    return apiClient.deleteCollection(collectionId);
  },

  /**
   * Batch add items to a collection
   */
  batchAdd: async (collectionId: string, bookIds: string[]): Promise<Collection> => {
    return apiClient.batchAddToCollection(collectionId, bookIds);
  },

  /**
   * Batch remove items from a collection
   */
  batchRemove: async (collectionId: string, bookIds: string[]): Promise<Collection> => {
    return apiClient.batchRemoveFromCollection(collectionId, bookIds);
  },
};
