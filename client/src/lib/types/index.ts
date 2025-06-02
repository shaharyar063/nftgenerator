export interface TraitLayer {
    isBackground: unknown;
    rules: Rule[];
    displayName: string;
    showInMetadata: boolean | undefined;
    layerRarity: number;
    isDefaultBackground: any;
    rarityType: string;
    id: string;
    name: string;
    traits: Trait[];
    required: boolean;
}

export interface Trait {
    layerName: any;
    rarity: number;
    id: string;
    name: string;
    image: File;
    preview: string;
    weight: number;
}

export interface CollectionFormData {
    name: string;
    symbol: string;
    description: string;
    supply: number;
    banner: File | null;
    profileImage: File | null;
}

export interface ICollectionConfig {
    namePrefix: any;
    creatorAddress: any;
    externalUrl: string | number | readonly string[] | undefined;
    resolution: any;
    format: string | number | readonly string[] | undefined;
    startTokenId: string | number | readonly string[] | undefined;
    name: string;
    symbol: string;
    description: string;
    supply: number;
    banner?: File | null;
    profileImage?: File | null;
    creator?: string;
    royalties?: number;
}

export interface NFTMetadata {
    name: string;
    description: string;
    image: string;
    attributes: {
        trait_type: string;
        value: string;
    }[];
}

export interface GenerationProgress {
    current: number;
    total: number;
    status: string;
}

export interface GenerationSettings {
    backgroundColor: string;
    namePrefix: any;
    description: string;
    preventDuplicates: boolean;
    shuffleOutput: boolean;
    startTokenId: number;
    maxRetries: number;
    format: string;
    resolution: {
        width: number;
        height: number;
    };
    supply: number;
}

export interface PreviewSettings {
    count: number;
    size: {
        width: number;
        height: number;
    };
}

export interface Rule {
    id: string;
    trait: string;
    condition: string;
    value: string;
}
