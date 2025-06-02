import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ChevronDown, ArrowLeft, ArrowRight } from 'lucide-react';
import styles from '@/styles/components/generator/PreviewGenerate.module.css';
import {
    TraitLayer,
    GenerationSettings,
    GenerationProgress,
    Rule,
    ICollectionConfig,
    Trait,
    NFTMetadata,
    Character
} from '@/lib/types';

// Define the GeneratedAsset interface here to fix the import error
interface GeneratedAsset {
    id: number;
    image: string | Blob;
    traits: Array<{
        trait_type: string;
        value: string;
        rarity: number;
    }>;
    metadata: {
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
    };
}

interface PreviewGenerateProps {
    layers: TraitLayer[];
    rules: Rule[];
    isGenerating: boolean;
    progress: GenerationProgress;
    onGenerate: (settings: GenerationSettings, config: ICollectionConfig) => Promise<void>;
    onBack: () => void;
    onNext: () => void;
    generatedAssets?: GeneratedAsset[];
    collectionConfig: ICollectionConfig;
    onLayersUpdate?: (layers: TraitLayer[], rules: Rule[]) => void;
    onAssetsGenerated?: (assets: GeneratedAsset[]) => void;
    supply: number;
    onSupplyChange: (supply: number) => void;
    characters?: Character[];
    hideNavigation?: boolean;
}

interface SelectedFilters {
    [layerId: string]: string; // layerId -> traitId
}

interface TraitCount {
    id: string;
    name: string;
    count: number;
}

interface LayerStats {
    id: string;
    name: string;
    traits: TraitCount[];
}

// Default settings
const defaultSettings: GenerationSettings = {
    supply: 10,
    preventDuplicates: true,
    shuffleOutput: true,
    maxRetries: 200,
    format: 'png',
    resolution: {
        width: 512,
        height: 512
    },
    backgroundColor: '#FFFFFF',
    startTokenId: 0,
    namePrefix: '#',
    description: ''
};

// Helper function for image sources
const getImageSrc = (image: string | Blob): string => {
    if (image instanceof Blob) {
        return URL.createObjectURL(image);
    }
    return image;
};

export const PreviewGenerate: React.FC<PreviewGenerateProps> = ({
    layers,
    rules,
    isGenerating,
    progress,
    onGenerate,
    onBack,
    onNext,
    generatedAssets: initialGeneratedAssets = [],
    collectionConfig,
    onLayersUpdate,
    onAssetsGenerated,
    supply: initialSupply,
    onSupplyChange,
    characters = [],
    hideNavigation = false
}) => {
    const [localGeneratedAssets, setLocalGeneratedAssets] = useState<GeneratedAsset[]>(initialGeneratedAssets);
    const [localIsGenerating, setLocalIsGenerating] = useState(false);
    const [shouldStop, setShouldStop] = useState(false);
    const [generationSettings, setGenerationSettings] = useState<GenerationSettings>({
        supply: initialSupply || 10,
        preventDuplicates: true,
        shuffleOutput: true,
        maxRetries: 1000,
        format: 'png',
        resolution: {
            width: 1024,
            height: 1024
        },
        backgroundColor: '',
        startTokenId: 1,
        namePrefix: '#',
        description: ''
    });
    const [selectedFilters, setSelectedFilters] = useState<SelectedFilters>({});
    const [expandedLayers, setExpandedLayers] = useState<{ [key: string]: boolean }>({});
    const [showSupplyModal, setShowSupplyModal] = useState(false);
    const [characterSupplies, setCharacterSupplies] = useState<{[key: string]: number}>({});
    const [totalSupply, setTotalSupply] = useState(initialSupply || 0);

    // Update local generated assets when parent assets change
    useEffect(() => {
        if (initialGeneratedAssets && initialGeneratedAssets.length > 0) {
            // Only update if the content is actually different
            setLocalGeneratedAssets(prev => {
                const prevJson = JSON.stringify(prev);
                const newJson = JSON.stringify(initialGeneratedAssets);
                return prevJson === newJson ? prev : initialGeneratedAssets;
            });
        }
    }, [JSON.stringify(initialGeneratedAssets)]);

    // Initialize character supplies
    useEffect(() => {
        const supplies: {[key: string]: number} = {};
        characters.forEach(character => {
            supplies[character.id] = character.supply || 10;
        });
        setCharacterSupplies(supplies);
        
        // Calculate total supply
        const total = Object.values(supplies).reduce((sum, supply) => sum + supply, 0);
        setTotalSupply(total);
        onSupplyChange(total);
    }, [characters, onSupplyChange]);

    const handleGenerateClick = useCallback(async () => {
        if (localIsGenerating) {
            // Stop generation
            setShouldStop(true);
            setLocalIsGenerating(false);
            return;
        }

        // If we have characters, show the supply modal first
        if (characters.length > 0) {
            setShowSupplyModal(true);
            return;
        }

        // Start generation immediately if no characters
        startGeneration();
    }, [localIsGenerating, characters]);

    const startGeneration = useCallback(() => {
        setShouldStop(false);
        setLocalIsGenerating(true);

        try {
            const settings: GenerationSettings = {
                supply: generationSettings.supply,
                format: generationSettings.format,
                preventDuplicates: generationSettings.preventDuplicates,
                startTokenId: generationSettings.startTokenId,
                namePrefix: generationSettings.namePrefix,
                description: generationSettings.description,
                shuffleOutput: generationSettings.shuffleOutput,
                maxRetries: generationSettings.maxRetries,
                resolution: generationSettings.resolution,
                backgroundColor: generationSettings.backgroundColor,
                characters: characters.map(char => ({
                    ...char,
                    supply: characterSupplies[char.id] || 0
                }))
            };

            // Clear existing assets
            setLocalGeneratedAssets([]);
            onGenerate(settings, { 
                ...collectionConfig,
                supply: totalSupply 
            });
        } catch (error) {
            console.error('Generation error:', error);
            setLocalIsGenerating(false);
        }
    }, [
        generationSettings, 
        onGenerate, 
        collectionConfig, 
        shouldStop, 
        characters, 
        characterSupplies,
        totalSupply
    ]);

    const handleLayerExpand = useCallback((id: string): void => {
        setExpandedLayers(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    }, []);

    const handleTraitFilter = (layerId: string, traitId: string) => {
        setSelectedFilters(prev => {
            const newFilters = { ...prev };
            if (newFilters[layerId] === traitId) {
                delete newFilters[layerId];
            } else {
                newFilters[layerId] = traitId;
            }
            return newFilters;
        });
    };

    const getFilteredAssets = useCallback(() => {
        if (!localGeneratedAssets.length) return [];
        if (!Object.keys(selectedFilters).length) return localGeneratedAssets;

        return localGeneratedAssets.filter(asset => {
            return Object.entries(selectedFilters).every(([layerId, traitId]) => {
                const layer = layers.find(l => l.id === layerId);
                const trait = layer?.traits.find(t => t.id === traitId);
                if (!layer || !trait) return false;

                return asset.traits.some(t => 
                    t.trait_type === layer.name && 
                    t.value === trait.name
                );
            });
        });
    }, [localGeneratedAssets, selectedFilters, layers]);

    const getTraitCounts = useCallback(() => {
        const counts: { [key: string]: { [key: string]: number } } = {};
        
        localGeneratedAssets.forEach(asset => {
            asset.traits.forEach(trait => {
                if (!counts[trait.trait_type]) {
                    counts[trait.trait_type] = {};
                }
                counts[trait.trait_type][trait.value] = (counts[trait.trait_type][trait.value] || 0) + 1;
            });
        });
        
        return counts;
    }, [localGeneratedAssets]);

    const handleSupplyChange = (characterId: string, supply: number) => {
        setCharacterSupplies(prev => {
            const newSupplies = { ...prev, [characterId]: supply };
            const newTotal = Object.values(newSupplies).reduce((sum, val) => sum + val, 0);
            setTotalSupply(newTotal);
            onSupplyChange(newTotal);
            return newSupplies;
        });
    };

    const renderSidebar = () => (
        <div className={styles.layersSidebar}>
            <div className={styles.sidebarHeader}>
                <h3>Generation Settings</h3>
            </div>
            <div className={styles.layerFilters}>
                <div className={styles.settingsGroup}>
                    <label>Collection Supply</label>
                    <input
                        type="number"
                        value={totalSupply}
                        onChange={(e) => onSupplyChange(Math.max(1, Math.min(10000, parseInt(e.target.value) || 1)))}
                        min="1"
                        max="10000"
                        className={styles.supplyInput}
                    />
                </div>
                {layers.map(layer => (
                    <div key={layer.id} className={styles.layerFilter}>
                        <div
                            className={styles.layerFilterHeader}
                            onClick={() => handleLayerExpand(layer.id)}
                        >
                            <ChevronDown
                                size={16}
                                className={`${styles.expandIcon} ${
                                    expandedLayers[layer.id] ? styles.expanded : ''
                                }`}
                            />
                            <span>{layer.name}</span>
                        </div>
                        {expandedLayers[layer.id] && (
                            <div className={styles.traitsList}>
                                {layer.traits.map(trait => {
                                    const count = getTraitCounts()[layer.name]?.[trait.name] || 0;
                                    return (
                                        <div
                                            key={trait.id}
                                            className={`${styles.traitFilter} ${
                                                selectedFilters[layer.id] === trait.id ? styles.selected : ''
                                            }`}
                                            onClick={() => handleTraitFilter(layer.id, trait.id)}
                                        >
                                            <span>{trait.name}</span>
                                            <span className={styles.traitCount}>{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    const renderGeneratedGrid = useCallback(() => {
        const filteredAssets = getFilteredAssets();

        if (localIsGenerating) {
            return (
                <div className={styles.generatedGrid}>
                    {localGeneratedAssets.map((asset, index) => (
                        <div key={`${asset.id}-${index}`} className={styles.generatedItem}>
                            <div className={styles.imageWrapper}>
                                <img
                                    src={asset.metadata.image}
                                    alt={`Generated NFT #${asset.id}`}
                                    className={styles.generatedImage}
                                />
                            </div>
                            <div className={styles.imageInfo}>
                                <div className={styles.imageId}>
                                    <span>NFT</span>
                                    <span className={styles.nftNumber}>#{asset.id}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (!filteredAssets.length) {
            return (
                <div className={styles.placeholder}>
                    <p>No generated images yet. Click generate to start.</p>
                </div>
            );
        }

        return (
            <div className={styles.generatedGrid}>
                {filteredAssets.map((asset, index) => (
                    <div key={`${asset.id}-${index}`} className={styles.generatedItem}>
                        <div className={styles.imageWrapper}>
                            <img
                                src={asset.metadata.image}
                                alt={`Generated NFT #${asset.id}`}
                                className={styles.generatedImage}
                            />
                        </div>
                        <div className={styles.imageInfo}>
                            <div className={styles.imageId}>
                                <span>NFT</span>
                                <span className={styles.nftNumber}>#{asset.id}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }, [localGeneratedAssets, selectedFilters, localIsGenerating]);

    // Update the useEffect cleanup
    useEffect(() => {
        // Cleanup function
        return () => {
            setLocalIsGenerating(false);
            setShouldStop(true);
            // Cleanup object URLs
            localGeneratedAssets.forEach(asset => {
                if (typeof asset.image === 'string' && asset.image.startsWith('blob:')) {
                    URL.revokeObjectURL(asset.image);
                }
            });
        };
    }, [localGeneratedAssets]);

    return (
        <div className={styles.container}>
            {/* Character Supply Modal */}
            {showSupplyModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h2>Set Character Supplies</h2>
                        <p>Define how many NFTs to generate for each character type. The total will be your collection supply.</p>
                        
                        <div className={styles.characterSupplies}>
                            {characters.map(character => (
                                <div key={character.id} className={styles.characterSupplyItem}>
                                    <label>{character.name}</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        max="10000"
                                        value={characterSupplies[character.id] || 0}
                                        onChange={(e) => handleSupplyChange(
                                            character.id, 
                                            Math.max(0, parseInt(e.target.value) || 0)
                                        )}
                                    />
                                </div>
                            ))}
                        </div>
                        
                        <div className={styles.totalSupply}>
                            <strong>Total Supply: {totalSupply}</strong>
                        </div>
                        
                        <div className={styles.modalButtons}>
                            <button 
                                className={styles.cancelButton}
                                onClick={() => setShowSupplyModal(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className={styles.generateButton}
                                onClick={() => {
                                    setShowSupplyModal(false);
                                    startGeneration();
                                }}
                                disabled={totalSupply === 0}
                            >
                                Generate
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {renderSidebar()}
            <div className={styles.mainContent}>
                <div className={styles.header}>
                    <div className={styles.nftCounter}>
                        Generated NFTs: {localGeneratedAssets.length}
                    </div>
                </div>
                <div className={styles.controls}>
                    <button onClick={handleGenerateClick} disabled={!collectionConfig}>
                        {localIsGenerating ? (
                            <>
                                <RefreshCw className={styles.spinIcon} size={16} />
                                Stop Generation
                            </>
                        ) : (
                            <>
                                <RefreshCw size={16} />
                                Generate Collection
                            </>
                        )}
                    </button>
                </div>
                {renderGeneratedGrid()}
                {!hideNavigation && (
                    <div className={styles.actions}>
                        <div className={styles.leftActions}>
                            <button 
                                className={styles.backButton} 
                                onClick={onBack}
                            >
                                <ArrowLeft className={styles.buttonIcon} />
                                Back
                            </button>
                        </div>
                        <button 
                            className={styles.nextButton} 
                            onClick={onNext}
                            disabled={localGeneratedAssets.length === 0}
                        >
                            Next
                            <ArrowRight className={styles.buttonIcon} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// Update the validateTraitRules function to work with the new Rule interface
const validateTraitRules = (selectedTraits: Trait[], rules: Rule[]): boolean => {
    if (!rules || rules.length === 0) return true;

    return rules.every(rule => {
        // Handle the new rule format with traits array
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
                return true; // No triggering trait found, rule satisfied
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
        
        return true; // Default case
    });
};

function onAssetsGenerated(newAssets: GeneratedAsset[]) {
    throw new Error('Function not implemented.');
}

function handleLayerExpand(id: string): void {
    throw new Error('Function not implemented.');
}

