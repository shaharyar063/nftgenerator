import { TraitLayer, Trait, Rule, GeneratedAsset, GenerationSettings } from '@/lib/types';

export const selectTraits = async (layers: TraitLayer[], rules: Rule[]): Promise<Trait[]> => {
    const selectedTraits: Trait[] = [];
    
    // Sort layers by their order if available
    const sortedLayers = [...layers].sort((a, b) => {
        // If layers have an explicit order property, use it
        if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
        }
        // Otherwise use the order in the array
        return 0;
    });

    // First, try to process required layers
    for (const layer of sortedLayers) {
        if (!layer.traits || layer.traits.length === 0) {
            console.warn(`Layer ${layer.name} has no traits`);
            continue;
        }

        // Handle required layers first
        if (layer.required) {
            const validTraits = layer.traits.filter(trait => {
                // Create a temporary trait with the layer name
                const tempTrait = {
                    ...trait,
                    layerName: layer.name,
                    id: trait.id || `${layer.name}-${trait.name}`
                };
                
                // Check if adding this trait would violate any rules
                const tempTraits = [...selectedTraits, tempTrait];
                return validateTraitRules(tempTraits, rules);
            });

            if (validTraits.length > 0) {
                // Select a trait by rarity weighting
                const selectedTrait = selectTraitByRarity(validTraits);
                if (selectedTrait) {
                    selectedTraits.push({
                        ...selectedTrait,
                        layerName: layer.name,
                        id: selectedTrait.id || `${layer.name}-${selectedTrait.name}`
                    });
                }
            } else {
                // If we can't find valid traits for a required layer, this combination is invalid
                console.warn(`No valid traits found for required layer: ${layer.name}`);
                return [];
            }
        }
    }

    // Then process non-required layers
    for (const layer of sortedLayers) {
        if (layer.required || !layer.traits || layer.traits.length === 0) continue;

        // Apply layer rarity check
        const layerRarity = (layer.layerRarity || 100) / 100;
        if (Math.random() > layerRarity) {
            console.log(`Skipping layer ${layer.name} due to rarity ${layerRarity}`);
            continue;
        }

        const validTraits = layer.traits.filter(trait => {
            // Create a temporary trait with the layer name
            const tempTrait = {
                ...trait,
                layerName: layer.name,
                id: trait.id || `${layer.name}-${trait.name}`
            };
            
            // Check if adding this trait would violate any rules
            const tempTraits = [...selectedTraits, tempTrait];
            return validateTraitRules(tempTraits, rules);
        });

        if (validTraits.length > 0) {
            // Select a trait by rarity weighting
            const selectedTrait = selectTraitByRarity(validTraits);
            if (selectedTrait) {
                console.log(`Selected trait ${selectedTrait.name} with rarity ${selectedTrait.rarity || 50}% for layer ${layer.name}`);
                selectedTraits.push({
                    ...selectedTrait,
                    layerName: layer.name,
                    id: selectedTrait.id || `${layer.name}-${selectedTrait.name}`
                });
            }
        }
    }

    return selectedTraits;
};

const selectTraitByRarity = (traits: Trait[]): Trait | undefined => {
    // Convert rarity percentage to weight (higher rarity = higher chance)
    const weightedTraits = traits.map(trait => ({
        ...trait,
        weight: trait.rarity || 50  // Default to 50% if rarity is undefined
    }));

    const totalWeight = weightedTraits.reduce((sum, trait) => sum + trait.weight, 0);
    let random = Math.random() * totalWeight;
    let cumulativeWeight = 0;
    
    for (const trait of weightedTraits) {
        cumulativeWeight += trait.weight;
        if (random <= cumulativeWeight) {
            return trait;
        }
    }

    return traits[0]; // Fallback to first trait
};

const validateTraitRules = (selectedTraits: Trait[], rules: Rule[]): boolean => {
    if (!rules || rules.length === 0) return true;

    return rules.every(rule => {
        // New rules format with traits array
        if (rule.traits) {
            if (rule.type === 'required') {
                // If we have any trait from the rule, we need all of them
                const hasTrait = rule.traits.some(traitId => {
                    return selectedTraits.some(t => t.id === traitId);
                });

                if (hasTrait) {
                    return rule.traits.every(traitId => {
                        return selectedTraits.some(t => t.id === traitId);
                    });
                }
                return true; // No triggering trait found, so rule is satisfied
            } 
            else if (rule.type === 'incompatible') {
                // Cannot have all traits in the incompatible list
                let traitCount = 0;
                for (const traitId of rule.traits) {
                    if (selectedTraits.some(t => t.id === traitId)) {
                        traitCount++;
                        if (traitCount > 1) return false; // More than one trait found, rule violated
                    }
                }
                return true; // Rule satisfied
            }
        }
        
        return true; // Fallback
    });
};

export const createImage = async (selectedTraits: Trait[], settings?: GenerationSettings): Promise<string> => {
    console.log('Creating image with traits:', selectedTraits);
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        const width = settings?.resolution?.width || 1024;
        const height = settings?.resolution?.height || 1024;
        canvas.width = width;
        canvas.height = height;
        
        // Fill with background color
        ctx.fillStyle = settings?.backgroundColor || '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Sort traits by z-index if available, otherwise keep original order
        const sortedTraits = [...selectedTraits].sort((a, b) => {
            const aZIndex = a.zIndex !== undefined ? a.zIndex : 0;
            const bZIndex = b.zIndex !== undefined ? b.zIndex : 0;
            return aZIndex - bZIndex;
        });

        // Draw each trait
        for (const trait of sortedTraits) {
            console.log(`Drawing trait: ${trait.layerName}/${trait.name}`);
            
            // Use the image property directly if it's a string
            // or preview if available, or try to get image from a blob
            const imageSource = typeof trait.image === 'string' 
                ? trait.image 
                : trait.preview || (trait.image instanceof Blob ? URL.createObjectURL(trait.image) : null);
            
            if (!imageSource) {
                console.error(`No valid image source for trait: ${trait.layerName}/${trait.name}`);
                continue;
            }
            
            try {
                const image = await loadImage(imageSource);
                ctx.drawImage(image, 0, 0, width, height);
                
                // Free memory if we created an object URL
                if (trait.image instanceof Blob && imageSource !== trait.preview) {
                    URL.revokeObjectURL(imageSource);
                }
            } catch (err) {
                console.error(`Error loading image for trait ${trait.layerName}/${trait.name}:`, err);
            }
        }

        return canvas.toDataURL(`image/${settings?.format || 'png'}`);
    } catch (error) {
        console.error('Error in createImage:', error);
        // Return a placeholder image on error
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFeAJ5jm5NtwAAAABJRU5ErkJggg==';
    }
};

const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
};

export const calculatePossibleCombinations = (layers: TraitLayer[]): number => {
    // Filter out empty layers
    const validLayers = layers.filter(layer => layer.traits && layer.traits.length > 0);
    
    if (validLayers.length === 0) return 0;

    // Calculate combinations for each layer
    return validLayers.reduce((total, layer) => {
        // Get the number of traits in the layer
        const traitCount = layer.traits.length;
        
        // If it's the first layer, start with its trait count
        if (total === 0) {
            return traitCount;
        }
        
        // Multiply by the number of traits in this layer
        return total * traitCount;
    }, 0);
};

export const isDuplicateCombination = (
    newTraits: Array<{ trait_type: string; value: string }>,
    existingAssets: any[] // Adjust type as needed
): boolean => {
    return existingAssets.some(asset => {
        if (!asset.traits || !Array.isArray(asset.traits)) return false;
        
        if (asset.traits.length !== newTraits.length) return false;
        
        // Check if all traits match (regardless of order)
        const matches = newTraits.every(newTrait => {
            return asset.traits.some((existingTrait: any) => 
                existingTrait.trait_type === newTrait.trait_type && 
                existingTrait.value === newTrait.value
            );
        });
        
        return matches;
    });
};

// Update the Trait interface to include zIndex
export interface Trait {
    id: string;
    name: string;
    layerName: string;
    image: string | Blob;
    rarity?: number;
    preview?: string;
    zIndex?: number;
} 