import { Collection, InsertCollection } from "@shared/schema";

export interface IStorage {
  getCollection(id: string): Promise<Collection | undefined>;
  getCollections(): Promise<Collection[]>;
  createCollection(collection: InsertCollection): Promise<Collection>;
  updateCollection(id: string, updates: Partial<Collection>): Promise<Collection | undefined>;
  deleteCollection(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private collections: Map<string, Collection>;

  constructor() {
    this.collections = new Map();
  }

  async getCollection(id: string): Promise<Collection | undefined> {
    return this.collections.get(id);
  }

  async getCollections(): Promise<Collection[]> {
    return Array.from(this.collections.values());
  }

  async createCollection(insertCollection: InsertCollection): Promise<Collection> {
    const id = `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const collection: Collection = {
      ...insertCollection,
      id,
      status: "draft",
      createdAt: new Date(),
    };
    this.collections.set(id, collection);
    return collection;
  }

  async updateCollection(id: string, updates: Partial<Collection>): Promise<Collection | undefined> {
    const collection = this.collections.get(id);
    if (!collection) return undefined;
    
    const updatedCollection = { ...collection, ...updates };
    this.collections.set(id, updatedCollection);
    return updatedCollection;
  }

  async deleteCollection(id: string): Promise<boolean> {
    return this.collections.delete(id);
  }
}

export const storage = new MemStorage();
