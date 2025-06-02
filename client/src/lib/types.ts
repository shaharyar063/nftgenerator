export interface Trait {
    id: string;
    name: string;
    layerName: string;
    image: string | Blob;
    rarity?: number;
    preview: string;
    zIndex?: number;
    characterId?: string;
}

export interface TraitLayer {
    id: string;
    name: string;
    traits: Trait[];
    required?: boolean;
    order?: number;
    layerRarity?: number;
    characterId?: string;
    isBackground?: boolean;
    isDefaultBackground?: boolean;
    displayName?: string;
    showInMetadata?: boolean;
    rarityType?: 'percent' | 'weight';
    rules?: Rule[];
}

export interface Character {
    id: string;
    name: string;
    description?: string;
    supply: number;
    layers: TraitLayer[];
    imagePreview?: string;
}

export interface GenerationSettings {
    supply: number;
    preventDuplicates: boolean;
    shuffleOutput: boolean;
    maxRetries: number;
    format: 'png' | 'jpg' | 'webp';
    resolution: {
        width: number;
        height: number;
    };
    backgroundColor: string;
    startTokenId: number;
    namePrefix: string;
    description: string;
    characters?: Character[];
}

export interface ICollectionConfig {
    supply: number;
    name: string;
    symbol: string;
    description: string;
    namePrefix: string;
    startTokenId: number;
    format: string;
    resolution: {
        width: number;
        height: number;
    };
    royalties: number;
    creatorAddress: string;
    externalUrl: string;
}

export interface GenerationProgress {
    current: number;
    total: number;
    status: string;
}

export interface Rule {
    id: string;
    type: 'incompatible' | 'required';
    traits: string[];
}

export interface NFTMetadata {
    name: string;
    description: string;
    image: string;
    attributes: Array<{
        trait_type: string;
        value: string;
        rarity: number;
    }>;
    symbol?: string;
    creator?: string;
    royalties?: number;
    compiler?: string;
} 