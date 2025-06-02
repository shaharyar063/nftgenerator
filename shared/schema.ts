import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  walletAddress: text("wallet_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const nftCollections = pgTable("nft_collections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  userId: integer("user_id").references(() => users.id),
  size: integer("size").notNull(),
  rarityDistribution: text("rarity_distribution").notNull(),
  outputFormat: text("output_format").notNull(),
  status: text("status").notNull().default("draft"), // draft, generating, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
});

export const nftAssets = pgTable("nft_assets", {
  id: serial("id").primaryKey(),
  collectionId: integer("collection_id").references(() => nftCollections.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  layer: text("layer"),
  rarity: real("rarity"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const generatedNfts = pgTable("generated_nfts", {
  id: serial("id").primaryKey(),
  collectionId: integer("collection_id").references(() => nftCollections.id),
  tokenId: integer("token_id"),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  metadataUrl: text("metadata_url"),
  rarity: real("rarity"),
  traits: text("traits"), // JSON string
  mintStatus: text("mint_status").default("unminted"), // unminted, minting, minted
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  walletAddress: true,
});

export const insertCollectionSchema = createInsertSchema(nftCollections).pick({
  name: true,
  description: true,
  size: true,
  rarityDistribution: true,
  outputFormat: true,
});

export const insertAssetSchema = createInsertSchema(nftAssets).pick({
  filename: true,
  originalName: true,
  mimeType: true,
  size: true,
  layer: true,
  rarity: true,
});

export const insertNftSchema = createInsertSchema(generatedNfts).pick({
  tokenId: true,
  name: true,
  description: true,
  imageUrl: true,
  metadataUrl: true,
  rarity: true,
  traits: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type NftCollection = typeof nftCollections.$inferSelect;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;

export type NftAsset = typeof nftAssets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;

export type GeneratedNft = typeof generatedNfts.$inferSelect;
export type InsertNft = z.infer<typeof insertNftSchema>;
