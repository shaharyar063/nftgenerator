import { 
    TraitLayer, 
    Trait, 
    GenerationSettings, 
    NFTMetadata,
    GenerationProgress 
} from '../types';

interface GeneratedNFT {
    tokenId: number;
    image: Blob;
    metadata: NFTMetadata;
    traits: Record<string, string>;
    rarity?: number;
}

export class CollectionGenerator {
    private layers: TraitLayer[];
    private settings: GenerationSettings;
    private supply: number;
    private collectionName: string;
    private description: string;
    private generatedCombinations: Set<string> = new Set();
    private imageCache: Map<string, ImageBitmap> = new Map();
    private totalPossibleCombinations: number;
    private startTime: number = 0;

    constructor(
        layers: TraitLayer[],
        settings: GenerationSettings,
        supply: number,
        collectionName: string,
        description: string
    ) {
        this.layers = layers;
        this.settings = settings;
        this.supply = supply;
        this.collectionName = collectionName;
        this.description = description;
        this.totalPossibleCombinations = this.calculatePossibleCombinations();
        this.validateSettings();
    }

    private validateSettings() {
        if (this.settings.preventDuplicates && this.supply > this.totalPossibleCombinations) {
            throw new Error(`Cannot generate ${this.supply} unique NFTs. Maximum possible combinations: ${this.totalPossibleCombinations}`);
        }
        if (this.supply <= 0) {
            throw new Error('Supply must be greater than 0');
        }
        if (!this.layers.length) {
            throw new Error('No layers provided');
        }
        if (!this.layers.some(layer => layer.traits.length > 0)) {
            throw new Error('Layers must contain at least one trait');
        }
    }

    private calculatePossibleCombinations(): number {
        return this.layers.reduce((total, layer) => {
            const traitCount = layer.traits.length;
            return total * (layer.required ? traitCount : traitCount + 1);
        }, 1);
    }

    async generatePreviews(count: number = 3): Promise<GeneratedNFT[]> {
        await this.preloadImages(this.layers.slice(0, 2));
        const previews: GeneratedNFT[] = [];
        
        for (let i = 0; i < count; i++) {
            try {
                const preview = await this.generateSingleNFT(i, true);
                previews.push(preview);
            } catch (error) {
                console.error('Error generating preview:', error);
            }
        }
        
        return previews;
    }

    async generate(
        onProgress: (progress: GenerationProgress) => void
    ): Promise<GeneratedNFT[]> {
        this.startTime = Date.now();
        await this.preloadImages(this.layers);
        
        const collection: GeneratedNFT[] = [];
        let attempts = 0;
        let lastProgressUpdate = Date.now();
        
        onProgress({ 
            current: 0, 
            total: this.supply, 
            status: 'Starting generation...'
        });

        while (collection.length < this.supply && attempts < this.settings.maxRetries) {
            try {
                const nft = await this.generateSingleNFT(
                    collection.length + this.settings.startTokenId
                );
                
                if (this.settings.preventDuplicates) {
                    const traitKey = this.getTraitKey(nft.traits);
                    if (this.generatedCombinations.has(traitKey)) {
                        attempts++;
                        continue;
                    }
                    this.generatedCombinations.add(traitKey);
                }

                collection.push(nft);
                
                const now = Date.now();
                if (now - lastProgressUpdate > 100) {
                    onProgress({
                        current: collection.length,
                        total: this.supply,
                        status: `Generating NFT ${collection.length + 1} of ${this.supply}`
                    });
                    lastProgressUpdate = now;
                }
            } catch (error) {
                console.error('Error generating NFT:', error);
                attempts++;
                if (attempts >= this.settings.maxRetries) {
                    throw new Error('Maximum retry attempts reached');
                }
            }
        }

        if (collection.length < this.supply) {
            throw new Error('Could not generate enough unique combinations');
        }

        this.calculateRarityScores(collection);

        if (this.settings.shuffleOutput) {
            this.shuffleArray(collection);
            // Update token IDs after shuffling
            collection.forEach((nft, index) => {
                nft.tokenId = index + this.settings.startTokenId;
                nft.metadata.name = `${this.collectionName} #${nft.tokenId}`;
            });
        }

        return collection;
    }

    private async generateSingleNFT(tokenId: number, isPreview: boolean = false): Promise<GeneratedNFT> {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        canvas.width = this.settings.resolution?.width || 2000;
        canvas.height = this.settings.resolution?.height || 2000;

        const selectedTraits: Record<string, string> = {};
        
        for (const layer of this.layers) {
            if (!layer.required && Math.random() > 0.5) continue;

            const trait = this.selectTraitByWeight(layer.traits);
            if (trait) {
                selectedTraits[layer.name] = trait.name;
                
                let img: ImageBitmap;
                if (this.imageCache.has(trait.name)) {
                    img = this.imageCache.get(trait.name)!;
                } else {
                    img = await createImageBitmap(trait.file);
                    if (!isPreview) {
                        this.imageCache.set(trait.name, img);
                    }
                }
                
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }
        }

        const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob!);
            }, `image/${this.settings.format || 'png'}`);
        });

        const metadata: NFTMetadata = {
            name: `${this.collectionName} #${tokenId}`,
            description: this.description,
            image: `ipfs://{CID}/${tokenId}.${this.settings.format || 'png'}`,
            attributes: Object.entries(selectedTraits).map(([trait_type, value]) => ({
                trait_type,
                value
            }))
        };

        return {
            tokenId,
            image: blob,
            metadata,
            traits: selectedTraits
        };
    }

    private async preloadImages(layers: TraitLayer[]): Promise<void> {
        const loadPromises = layers.flatMap(layer =>
            layer.traits.map(async trait => {
                if (trait.file && !this.imageCache.has(trait.name)) {
                    try {
                        const bitmap = await createImageBitmap(trait.file);
                        this.imageCache.set(trait.name, bitmap);
                    } catch (error) {
                        console.error(`Failed to preload image for trait ${trait.name}:`, error);
                    }
                }
            })
        );

        await Promise.all(loadPromises);
    }

    private calculateEstimatedTime(current: number): number {
        const elapsed = Date.now() - this.startTime;
        const avgTimePerNFT = elapsed / (current || 1);
        return Math.ceil((this.supply - current) * avgTimePerNFT / 1000);
    }

    private calculateRarityScores(collection: GeneratedNFT[]): void {
        const traitCounts: Record<string, Record<string, number>> = {};
        
        collection.forEach(nft => {
            Object.entries(nft.traits).forEach(([type, value]) => {
                traitCounts[type] = traitCounts[type] || {};
                traitCounts[type][value] = (traitCounts[type][value] || 0) + 1;
            });
        });

        collection.forEach(nft => {
            let rarityScore = Object.entries(nft.traits).reduce((score, [type, value]) => {
                const traitRarity = 1 / (traitCounts[type][value] / collection.length);
                return score * traitRarity;
            }, 1);
            nft.rarity = parseFloat(rarityScore.toFixed(4));
        });
    }

    private selectTraitByWeight(traits: Trait[]): Trait | null {
        if (traits.length === 0) return null;

        const totalWeight = traits.reduce((sum, trait) => sum + (trait.weight || 1), 0);
        let random = Math.random() * totalWeight;

        for (const trait of traits) {
            random -= (trait.weight || 1);
            if (random <= 0) return trait;
        }

        return traits[traits.length - 1];
    }

    private getTraitKey(traits: Record<string, string>): string {
        return Object.entries(traits)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([layer, trait]) => `${layer}:${trait}`)
            .join('|');
    }

    private shuffleArray<T>(array: T[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    public cleanup(): void {
        // Clean up cached images
        this.imageCache.forEach(bitmap => bitmap.close());
        this.imageCache.clear();
        this.generatedCombinations.clear();
    }

    private validateTraits(traits: TraitLayer[]) {
        if (!traits.length) {
            throw new Error('No traits provided');
        }
        
        traits.forEach(layer => {
            if (!layer.traits.length) {
                throw new Error(`Layer "${layer.name}" has no traits`);
            }
        });
    }

    private optimizeImages(images: Blob[]): Promise<Blob[]> {
        // Add image optimization logic
        return Promise.all(images.map(async (image) => {
            // Implement image optimization
            return image;
        }));
    }
}