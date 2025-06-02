import { z } from "zod";

// Collection Types
export const collectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  supply: z.number().min(1),
  namePrefix: z.string(),
  symbol: z.string(),
  royalties: z.number().min(0).max(100),
  creatorAddress: z.string(),
  externalUrl: z.string().optional(),
  status: z.enum(["draft", "generating", "completed", "failed"]),
  createdAt: z.date(),
});

export const insertCollectionSchema = collectionSchema.omit({
  id: true,
  status: true,
  createdAt: true,
});

// Asset Types for Generation
export const traitSchema = z.object({
  id: z.string(),
  name: z.string(),
  layerName: z.string(),
  image: z.union([z.string(), z.instanceof(Blob)]),
  rarity: z.number().min(0).max(100).default(100),
  preview: z.string(),
  zIndex: z.number().optional(),
});

export const traitLayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  traits: z.array(traitSchema),
  required: z.boolean().default(false),
  order: z.number().default(0),
  layerRarity: z.number().min(0).max(100).default(100),
  isBackground: z.boolean().default(false),
  showInMetadata: z.boolean().default(true),
});

export const generationSettingsSchema = z.object({
  supply: z.number().min(1),
  preventDuplicates: z.boolean().default(true),
  shuffleOutput: z.boolean().default(true),
  maxRetries: z.number().default(1000),
  format: z.enum(["png", "jpg", "webp"]).default("png"),
  resolution: z.object({
    width: z.number().min(1),
    height: z.number().min(1),
  }),
  backgroundColor: z.string().default("#ffffff"),
  startTokenId: z.number().default(1),
  namePrefix: z.string(),
  description: z.string(),
});

export const nftMetadataSchema = z.object({
  name: z.string(),
  description: z.string(),
  image: z.string(),
  attributes: z.array(z.object({
    trait_type: z.string(),
    value: z.string(),
    rarity: z.number(),
  })),
  symbol: z.string().optional(),
  creator: z.string().optional(),
  royalties: z.number().optional(),
  compiler: z.string().optional(),
});

// Export types
export type Collection = z.infer<typeof collectionSchema>;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;
export type Trait = z.infer<typeof traitSchema>;
export type TraitLayer = z.infer<typeof traitLayerSchema>;
export type GenerationSettings = z.infer<typeof generationSettingsSchema>;
export type NFTMetadata = z.infer<typeof nftMetadataSchema>;
