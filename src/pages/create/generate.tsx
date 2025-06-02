import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, ArrowRight, Settings, Layers, ImagePlus, Download, Users } from 'lucide-react';

import styles from '@/styles/pages/create/Generate.module.css';
import { 
    TraitLayer, 
    Trait,
    GenerationSettings, 
    GenerationProgress,
    NFTMetadata, 
    Rule,
    ICollectionConfig,
    Character
} from '@/lib/types';
import TraitUploader from '@/components/collection/TraitUploader';
import { PreviewGenerate } from '@/components/generator/PreviewGenerate';
import ExportAssets from '@/components/collection/ExportAssets';
import { CollectionConfigComponent } from '@/components/collection/CollectionConfig';
import CharacterManager from '@/components/collection/CharacterManager';
import JSZip from 'jszip';
import { IPFSUploader } from '@/lib/services/IPFSUploader';
import { toast } from 'react-hot-toast';
import { selectTraits, calculatePossibleCombinations } from '@/lib/utils/generationUtils';

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
    characters: Character[];
    hideNavigation?: boolean;
}

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

interface ExportAssetsProps {
    generatedAssets: GeneratedAsset[];
    onBack: () => void;
    onComplete: () => void;
    collectionConfig: ICollectionConfig;
    hideNavigation?: boolean;
}

interface StoredAsset {
    id: number;
    traits: Array<{
        trait_type: string;
        value: string;
        rarity: number;
    }>;
}

// Add a type adapter for the rules
interface TraitUploaderRule {
    id: string;
    sourceLayerId: string;
    sourceTrait: string;
    targetLayerId: string;
    targetTrait: string;
    type: 'require' | 'exclude';
    traits?: string[]; // Optional for compatibility
}

// Convert our Rule type to TraitUploaderRule type
const adaptRuleForTraitUploader = (rule: Rule): TraitUploaderRule => {
    return {
        id: rule.id,
        type: rule.type === 'incompatible' ? 'exclude' : 'require',
        sourceLayerId: '',
        sourceTrait: '',
        targetLayerId: '',
        targetTrait: '',
        traits: rule.traits
    };
};

// Convert TraitUploaderRule type back to our Rule type
const adaptRuleFromTraitUploader = (rule: TraitUploaderRule): Rule => {
    return {
        id: rule.id,
        type: rule.type === 'exclude' ? 'incompatible' : 'required',
        traits: rule.traits || []
    };
};

const steps = [
    {
        id: 1,
        title: 'Configure Collection',
        icon: <Settings size={20} />,
        description: 'Set up collection details'
    },
    {
        id: 2,
        title: 'Upload Traits',
        icon: <Layers size={20} />,
        description: 'Upload your trait layers'
    },
    {
        id: 3,
        title: 'Preview & Generate',
        icon: <ImagePlus size={20} />,
        description: 'Preview combinations'
    },
    {
        id: 4,
        title: 'Export Assets',
        icon: <Download size={20} />,
        description: 'Download your collection'
    }
];

const GenerateCollection = () => {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [layers, setLayers] = useState<TraitLayer[]>([]);
    const [rules, setRules] = useState<Rule[]>([]);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const storedLayers = localStorage.getItem('nft_layers');
        const storedRules = localStorage.getItem('nft_rules');
        const storedCharacters = localStorage.getItem('nft_characters');
        
        if (storedLayers && storedRules) {
            setLayers(JSON.parse(storedLayers));
            setRules(JSON.parse(storedRules));
        }
        
        if (storedCharacters) {
            try {
                setCharacters(JSON.parse(storedCharacters));
            } catch (e) {
                console.error('Failed to parse stored characters:', e);
            }
        }
    }, []);
    
    
    // Add collectionConfig state
    const [collectionConfig, setCollectionConfig] = useState<ICollectionConfig>({
        supply: 100,
        name: '',
        symbol: '',
        description: '',
        namePrefix: '#',
        startTokenId: 0,
        format: 'png',
        resolution: { width: 1024, height: 1024 },
        royalties: 0,
        creatorAddress: '',
        externalUrl: ''
    });

    const [progress, setProgress] = useState<GenerationProgress>({
        current: 0,
        total: 0,
        status: ''
    });

    const handleNext = () => {
        if (currentStep < 4) {
            setCurrentStep(currentStep + 1);
        }
    };
    
    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    

    const [supply, setSupply] = useState(1000);

    // Memoize handlers to prevent unnecessary re-renders
    const handleConfigUpdate = useCallback((config: ICollectionConfig) => {
        setCollectionConfig(prevConfig => ({
            ...prevConfig,
            ...config,
            supply: config.supply,
            startTokenId: 0,
            externalUrl: config.externalUrl || ''
        }));
        // Save to localStorage
        localStorage.setItem('nft_collection_config', JSON.stringify(config));
    }, []);

    const handleLayersUpdate = useCallback((updatedLayers: TraitLayer[], updatedRules: Rule[] = []) => {
        try {
            console.log('Updating layers:', updatedLayers);
            console.log('Updating rules:', updatedRules);
            
            // Validate layers
            if (!Array.isArray(updatedLayers)) {
                console.error('Invalid layers data:', updatedLayers);
                throw new Error('Layers must be an array');
            }

            // Ensure rules is always an array
            const rulesToSet = Array.isArray(updatedRules) ? updatedRules : [];
            
            // Update state
            setLayers(updatedLayers);
            if (rulesToSet.length > 0) {
                setRules(rulesToSet);
            }
            
            // Save to localStorage
            try {
                localStorage.setItem('nft_layers', JSON.stringify(updatedLayers));
                localStorage.setItem('nft_rules', JSON.stringify(rulesToSet));
                console.log('Successfully saved layers and rules to localStorage');
            } catch (storageError) {
                console.error('Error saving to localStorage:', storageError);
                // Don't throw, just log the error
            }
            
            return true;
        } catch (error) {
            console.error('Error in handleLayersUpdate:', error);
            toast.error('Failed to update layers. Please try again.');
            return false;
        }
    }, []);

    const handleCharactersUpdate = useCallback((updatedCharacters: Character[]) => {
        setCharacters(updatedCharacters);
        localStorage.setItem('nft_characters', JSON.stringify(updatedCharacters));
        
        // Combine all layers from characters for backward compatibility
        const allLayers = updatedCharacters.reduce((acc, character) => {
            return [...acc, ...character.layers];
        }, [] as TraitLayer[]);
        
        if (allLayers.length > 0) {
            setLayers(allLayers);
            localStorage.setItem('nft_layers', JSON.stringify(allLayers));
        }
    }, []);

    const handleGenerate = useCallback(async (
        settings: GenerationSettings, 
        config: ICollectionConfig
    ): Promise<void> => {
        if (!layers.length) {
            toast.error('Please add layers and traits first');
            return;
        }

        setIsGenerating(true);
        setProgress({ current: 0, total: 0, status: 'Initializing generation...' });
        
        try {
            const assets: GeneratedAsset[] = [];
            let totalGenerated = 0;
            const totalToGenerate = config.supply;
            
            // If we have characters, generate assets for each character based on their supply
            if (characters.length > 0 && settings.characters) {
                const characterSummary = characters.map(c => `${c.name}: ${c.supply}`).join(', ');
                setProgress({ 
                    current: 0, 
                    total: totalToGenerate, 
                    status: `Generating for characters (${characterSummary})...` 
                });
                
                for (const character of characters) {
                    // Skip characters with no layers or traits
                    if (!character.layers.length) continue;
                    
                    // Get character-specific layers
                    const characterLayers = layers.filter(l => l.characterId === character.id);
                    if (!characterLayers.length) continue;
                    
                    // Generate NFTs for this character
                    const characterToGenerate = Math.min(character.supply, totalToGenerate - totalGenerated);
                    
                    for (let i = 0; i < characterToGenerate; i++) {
                        // Update progress
                        setProgress({
                            current: totalGenerated + i + 1,
                            total: totalToGenerate,
                            status: `Generating ${character.name} ${i + 1}/${characterToGenerate}...`
                        });
                        
                        // Generate traits combination
                        const selectedTraits = await selectTraitCombination(characterLayers, rules, settings);
                        
                        // Create NFT
                        const tokenId = config.startTokenId + totalGenerated + i;
                        const nftName = `${config.namePrefix}${tokenId}`;
                        
                        // Generate image
                        const { image, traits } = await generateImage(selectedTraits, settings, character.name);
                        
                        // Create metadata
                        const metadata: NFTMetadata = {
                            name: nftName,
                            description: config.description,
                            image: URL.createObjectURL(image),
                            attributes: traits.map(trait => ({
                                trait_type: trait.trait_type,
                                value: trait.value,
                                rarity: trait.rarity || 0
                            }))
                        };
                        
                        if (config.symbol) metadata.symbol = config.symbol;
                        if (config.creatorAddress) metadata.creator = config.creatorAddress;
                        if (config.royalties !== undefined) metadata.royalties = config.royalties;
                        
                        // Add character type as a trait
                        metadata.attributes.push({
                            trait_type: "Character Type",
                            value: character.name,
                            rarity: 0
                        });
                        
                        // Add asset to collection
                        assets.push({
                            id: tokenId,
                            image,
                            traits,
                            metadata
                        });
                        
                        // Yield execution to prevent UI freeze
                        await new Promise(resolve => setTimeout(resolve, 0));
                    }
                    
                    totalGenerated += characterToGenerate;
                }
            } else {
                // Legacy generation without characters
                // ... existing generation code ...
            }
            
            setGeneratedAssets(assets);
            setProgress({ current: assets.length, total: assets.length, status: 'Generation complete!' });
            setCollectionConfig(config);
            
            // Save to localStorage
            setTimeout(() => {
                setProgress({ current: 0, total: 0, status: '' });
            }, 2000);
            
            return;
        } catch (error) {
            console.error('Generation error:', error);
            toast.error('Error during generation: ' + (error as Error).message);
            
            return;
        } finally {
            setIsGenerating(false);
        }
    }, [layers, rules, characters, setProgress]);

    // Load saved collection config only once on mount
    useEffect(() => {
        const savedConfig = localStorage.getItem('nft_collection_config');
        if (savedConfig) {
            try {
                const parsed = JSON.parse(savedConfig);
                setCollectionConfig(parsed);
            } catch (error) {
                console.error('Failed to parse saved config:', error);
            }
        }
    }, []); // Empty dependency array

    const handleNextStep = useCallback(() => {
        setCurrentStep(prev => prev + 1);
    }, []);

    const handlePreviousStep = useCallback(() => {
        setCurrentStep(prev => prev - 1);
    }, []);

    const handleExport = useCallback(() => {
        // Export logic...
    }, []);

    // Load saved layers on mount
    useEffect(() => {
        const savedLayers = localStorage.getItem('current_layers');
        const savedRules = localStorage.getItem('current_rules');
        
        if (savedLayers) {
            setLayers(JSON.parse(savedLayers));
        }
        if (savedRules) {
            setRules(JSON.parse(savedRules));
        }
    }, []);

    // Clear saved data when leaving trait uploader
    useEffect(() => {
        if (currentStep !== 2) {
            localStorage.removeItem('current_layers');
            localStorage.removeItem('current_rules');
        }
    }, [currentStep]);

    // Simplified step click handler - allows navigation to any step
    const handleStepClick = (stepId: number) => {
        setCurrentStep(stepId);
    };

    const handleLayerUpload = (newLayers: TraitLayer[]) => {
        setLayers(newLayers);
    };

    // Add helper functions
    const validateTraitName = (layerId: string, traitName: string, layers: TraitLayer[], traitId?: string): boolean => {
        const layer = layers.find((l) => l.id === layerId);
        if (!layer) return true;
        
        return !layer.traits.some((t) => 
            t.name.toLowerCase() === traitName.toLowerCase() && 
            (!traitId || t.id !== traitId)
        );
    };

    // Update the generation process to include rarity information in metadata
    const createAsset = async (
        traits: Trait[], 
        id: number, 
        settings: GenerationSettings
    ): Promise<GeneratedAsset> => {
        // Create a canvas element
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        // Set canvas dimensions
        canvas.width = settings.resolution.width;
        canvas.height = settings.resolution.height;

        // Fill with background color
        ctx.fillStyle = settings.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw each trait
        for (const trait of traits) {
            // Skip traits with no image data
            if (!trait.preview && (!trait.image || trait.image instanceof Blob)) {
                console.warn(`Trait ${trait.name} has no usable image data`);
                continue;
            }

            // Load the image
            try {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                // Use preview if it's not empty, otherwise use image if it's a string
                const imageSource = trait.preview || (typeof trait.image === 'string' ? trait.image : '');
                
                if (!imageSource) {
                    console.warn(`No valid image source for trait ${trait.name}`);
                    continue;
                }
                
                // Load the image
                await new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = () => reject(new Error(`Failed to load image for trait: ${trait.name}`));
                    img.src = imageSource;
                });
                
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            } catch (error) {
                console.error(`Error loading trait image: ${trait.name}`, error);
            }
        }

        // Convert canvas to data URL
        const imageData = canvas.toDataURL(`image/${settings.format}`);

        // Create and return the asset
        return {
            id,
            image: imageData,
            traits: traits.map(trait => ({
                trait_type: trait.layerName,
                value: trait.name,
                rarity: trait.rarity || 50 // Default to 50% if rarity is undefined
            })),
            metadata: {
                name: `${settings.namePrefix}${id}`,
                description: settings.description,
                image: imageData,
                attributes: traits.map(trait => ({
                    trait_type: trait.layerName,
                    value: trait.name,
                    rarity: trait.rarity || 50 // Default to 50% if rarity is undefined
                }))
            }
        };
    };

    const updateProgress = (current: number, total: number) => {
        setProgress(prev => ({
            ...prev,
            current,
            status: `Generating ${current} of ${total}...`
        }));
    };

    // Add cleanup on component unmount
    useEffect(() => {
        return () => {
            // Only clear if navigating away from the generate flow
            if (!window.location.pathname.includes('/create')) {
                sessionStorage.removeItem('current_generated_assets');
            }
        };
    }, []);

    // Add function to regenerate images from stored data
    const regenerateImagesFromTraits = async (storedAssets: StoredAsset[]): Promise<GeneratedAsset[]> => {
        const regenerated: GeneratedAsset[] = [];
        
        const defaultSettings: GenerationSettings = {
            supply: collectionConfig.supply,
            preventDuplicates: true,
            shuffleOutput: true,
            maxRetries: 200,
            format: collectionConfig.format as 'png' | 'jpg' | 'webp',
            resolution: collectionConfig.resolution,
            backgroundColor: '#FFFFFF',
            startTokenId: Number(collectionConfig.startTokenId),
            namePrefix: collectionConfig.namePrefix,
            description: collectionConfig.description
        };
        for (const asset of storedAssets) {
            // Find the actual trait objects from the layers
            const selectedTraits = asset.traits.map(trait => {
                const layer = layers.find(l => l.name === trait.trait_type);
                return layer?.traits.find(t => t.name === trait.value);
            }).filter(Boolean);

            // Regenerate the image
            const image = await createImage(selectedTraits as Trait[], defaultSettings);
            
            regenerated.push({
                ...asset,
                image,
                metadata: {
                    name: `${collectionConfig.namePrefix}${asset.id}`,
                    description: collectionConfig.description,
                    image: `${asset.id}.${defaultSettings.format}`,
                    attributes: asset.traits
                }
            });
        }

        return regenerated;
    };

    // Load saved assets on mount
    useEffect(() => {
        try {
            const count = parseInt(localStorage.getItem('generated_assets_count') || '0');
            if (count > 0) {
                const chunks = Math.ceil(count / 10); // Assuming CHUNK_SIZE is 10
                const loadedAssets: GeneratedAsset[] = [];
                
                for (let i = 0; i < chunks; i++) {
                    const chunk = localStorage.getItem(`generated_assets_${i}`);
                    if (chunk) {
                        loadedAssets.push(...JSON.parse(chunk));
                    }
                }

                if (loadedAssets.length > 0) {
                    setGeneratedAssets(loadedAssets);
                }
            }
        } catch (error) {
            console.error('Error loading saved assets:', error);
        }
    }, []);

    

    // Load saved assets on mount, but not for preview step
    useEffect(() => {
        const savedAssets = sessionStorage.getItem('current_generated_assets');
        if (savedAssets) {
            try {
                const parsed = JSON.parse(savedAssets);
                setGeneratedAssets(parsed);
            } catch (error) {
                console.error('Error loading saved assets:', error);
            }
        }
    }, []);

    // Only clear storage when leaving the generate flow completely
    useEffect(() => {
        return () => {
            if (!window.location.pathname.includes('/create')) {
                sessionStorage.removeItem('current_generated_assets');
            }
        };
    }, []);

    // Load saved assets on mount, but not for preview step
    useEffect(() => {
        if (currentStep !== 3) {
            const savedAssets = sessionStorage.getItem('current_generated_assets');
            if (savedAssets) {
                try {
                    const parsed = JSON.parse(savedAssets);
                    setGeneratedAssets(parsed);
                } catch (error) {
                    console.error('Error loading saved assets:', error);
                }
            }
        }
    }, [currentStep]);

    // Clean up object URLs on unmount
    useEffect(() => {
        return () => {
            // Clear all generated assets and temporary files
            if (window.URL) {
                // Revoke any object URLs
                document.querySelectorAll('img[src^="blob:"]').forEach(img => {
                    URL.revokeObjectURL((img as HTMLImageElement).src);
                });
            }
        };
    }, []);

    // Update the handleStepChange function
    const handleStepChange = (newStep: number) => {
        if (newStep === 4 && (!generatedAssets || generatedAssets.length === 0)) {
            toast.error('Please generate assets first');
            return;
        }
        setCurrentStep(newStep);
    };

    const handleSupplyChange = (newSupply: number) => {
        setSupply(newSupply);
        if (collectionConfig) {
            setCollectionConfig({
                ...collectionConfig,
                supply: newSupply
            });
        }
    };

    const handleComplete = useCallback(() => {
        // Clear stored data
        localStorage.removeItem('nft_layers');
        localStorage.removeItem('nft_rules');
        localStorage.removeItem('nft_collection_config');
        
        // Reset states
        setLayers([]);
        setRules([]);
        setGeneratedAssets([]);
        setCollectionConfig({
            supply: 100,
            name: '',
            symbol: '',
            description: '',
            namePrefix: '#',
            startTokenId: 0,
            format: 'png',
            resolution: { width: 1024, height: 1024 },
            royalties: 0,
            creatorAddress: '',
            externalUrl: ''
        });
        
        // Redirect to home or success page
        router.push('/');
    }, [router]);

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <CollectionConfigComponent
                        onConfigUpdate={(config) => setCollectionConfig(config)}
                        onNext={() => setCurrentStep(2)}
                        onBack={() => router.push('/')}
                        hideNavigation={true}
                    />
                );
            case 2:
                return (
                    <TraitUploader
                        onNext={() => setCurrentStep(3)}
                        onBack={() => setCurrentStep(1)}
                        onLayersUpdate={(updatedLayers, updatedRules) => {
                            // Convert the rules back to our format
                            const convertedRules = updatedRules 
                                ? updatedRules.map(rule => adaptRuleFromTraitUploader(rule as TraitUploaderRule))
                                : undefined;
                            handleLayersUpdate(updatedLayers, convertedRules);
                        }}
                        layers={layers}
                        initialRules={rules.map(adaptRuleForTraitUploader)}
                        characters={characters}
                        hideNavigation={true}
                    />
                );
            case 3:
                return (
                    <PreviewGenerate
                        layers={layers}
                        rules={rules}
                        isGenerating={isGenerating}
                        progress={progress}
                        onGenerate={handleGenerate}
                        onBack={() => setCurrentStep(2)}
                        onNext={() => {
                            if (generatedAssets.length > 0) {
                                setCurrentStep(4);
                            } else {
                                toast.error('Please generate assets first');
                            }
                        }}
                        generatedAssets={generatedAssets}
                        collectionConfig={collectionConfig}
                        onLayersUpdate={handleLayersUpdate}
                        onAssetsGenerated={setGeneratedAssets}
                        supply={collectionConfig.supply}
                        onSupplyChange={handleSupplyChange}
                        characters={characters}
                        hideNavigation={true}
                    />
                );
            case 4:
                return (
                    <ExportAssets
                        generatedAssets={generatedAssets}
                        onBack={() => setCurrentStep(3)}
                        onComplete={handleComplete}
                        collectionConfig={collectionConfig}
                        hideNavigation={true}
                    />
                );
            default:
                return <div>Invalid step</div>;
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
    <button onClick={() => router.push('/create')} className={styles.backButton}>
        <ArrowLeft size={20} />
        Back
    </button>
    <div className={styles.stepsWrapper}>
        <button 
            onClick={handlePrevious}
            className={`${styles.navButton} ${currentStep === 1 ? styles.disabled : ''}`}
            disabled={currentStep === 1}
        >
            <span className={styles.navIndicator}>Previous: {currentStep > 1 ? steps[currentStep - 2].title : ''}</span>
            <ArrowLeft size={20} />
        </button>
        <div className={styles.steps}>
            <div 
                className={styles.progressBar} 
                style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
            />
            {steps.map((step, index) => (
                <div 
                    key={step.id}
                    className={`${styles.step} ${currentStep >= step.id ? styles.active : ''}`}
                >
                    <div className={styles.stepIcon}>
                        {step.icon}
                    </div>
                    <div className={styles.stepContent}>
                        <h3>{step.title}</h3>
                        <p>{step.description}</p>
                    </div>
                </div>
            ))}
        </div>
        <button 
            onClick={handleNext}
            className={`${styles.navButton} ${currentStep === 4 ? styles.disabled : ''}`}
            disabled={currentStep === 4}
        >
            <span className={styles.navIndicator}>Next: {currentStep < 4 ? steps[currentStep].title : ''}</span>
            <ArrowRight size={20} />
        </button>
    </div>
</div>

<div className={styles.content}>
    {renderCurrentStep()}
</div>
        </div>
    );
};

export default GenerateCollection;

// Add helper function to convert Blob to base64 string
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Failed to convert blob to base64'));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// Add helper function to convert base64 back to Blob
const base64ToBlob = (base64: string, type: string): Blob => {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    
    return new Blob([ab], { type });
};

// Update isDuplicateCombination function to match PreviewGenerate
const isDuplicateCombination = (
    newTraits: Array<{ trait_type: string; value: string }>,
    existingAssets: GeneratedAsset[]
): boolean => {
    return existingAssets.some(asset => {
        return asset.traits.every(existingTrait => {
            return newTraits.some(newTrait => 
                newTrait.trait_type === existingTrait.trait_type && 
                newTrait.value === existingTrait.value
            );
        });
    });
};

// Fix the createImage function
const createImage = async (
    selectedTraits: Trait[],
    settings?: GenerationSettings
): Promise<string> => {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        canvas.width = settings?.resolution?.width || 1024;
        canvas.height = settings?.resolution?.height || 1024;
        
        // Fill with background color
        ctx.fillStyle = settings?.backgroundColor || '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw each trait
        for (const trait of selectedTraits) {
            try {
                // Skip traits with no image data
                if (!trait.preview && (!trait.image || trait.image instanceof Blob)) {
                    console.warn(`Trait ${trait.name} has no usable image data`);
                    continue;
                }
                
                const image = await new Promise<HTMLImageElement>((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => resolve(img);
                    img.onerror = () => reject(new Error(`Failed to load image for trait: ${trait.name}`));
                    
                    // Use preview if it's not empty, otherwise use image if it's a string
                    const imageSource = trait.preview || (typeof trait.image === 'string' ? trait.image : '');
                    
                    if (!imageSource) {
                        reject(new Error(`No valid image source for trait: ${trait.name}`));
                        return;
                    }
                    
                    img.src = imageSource;
                });
                
                ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            } catch (error) {
                console.error(`Error drawing trait ${trait.name}:`, error);
            }
        }

        return canvas.toDataURL(`image/${settings?.format || 'png'}`);
    } catch (error) {
        console.error('Error creating image:', error);
        return '';
    }
};

// Add helper functions for character-based generation
const selectTraitCombination = async (
    characterLayers: TraitLayer[],
    rules: Rule[],
    settings: GenerationSettings
): Promise<Trait[]> => {
    // Use the existing selectTraits function or implement a simplified version
    return selectTraits(characterLayers, rules);
};

const generateImage = async (
    selectedTraits: Trait[],
    settings: GenerationSettings,
    characterName: string
): Promise<{ image: Blob; traits: Array<{ trait_type: string; value: string; rarity: number }> }> => {
    // Draw traits on canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
        throw new Error('Could not create canvas context');
    }
    
    // Set canvas size based on settings
    canvas.width = settings.resolution?.width || 1024;
    canvas.height = settings.resolution?.height || 1024;
    
    // Set background color if specified
    if (settings.backgroundColor) {
        ctx.fillStyle = settings.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Sort traits by z-index (if available)
    const sortedTraits = [...selectedTraits].sort((a, b) => {
        const aIndex = a.zIndex || 0;
        const bIndex = b.zIndex || 0;
        return aIndex - bIndex;
    });
    
    // Draw each trait
    for (const trait of sortedTraits) {
        try {
            let img: HTMLImageElement;
            
            if (typeof trait.image === 'string') {
                // For data URLs or paths
                img = new Image();
                await new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = () => reject(new Error(`Failed to load image for ${trait.name}`));
                    img.src = trait.image as string;
                });
            } else if (trait.image instanceof Blob) {
                // For blob images
                img = new Image();
                const url = URL.createObjectURL(trait.image);
                await new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = () => reject(new Error(`Failed to load image for ${trait.name}`));
                    img.src = url;
                });
                URL.revokeObjectURL(url);
            } else if (trait.preview) {
                // Use preview as fallback
                img = new Image();
                await new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = () => reject(new Error(`Failed to load preview for ${trait.name}`));
                    img.src = trait.preview;
                });
            } else {
                console.warn(`No valid image for trait: ${trait.name}`);
                continue;
            }
            
            // Draw the image
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
        } catch (error) {
            console.error(`Error drawing trait ${trait.name}:`, error);
        }
    }
    
    // Convert canvas to blob
    const format = settings.format || 'png';
    const image = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Failed to create image blob'));
            },
            `image/${format}`,
            0.9
        );
    });
    
    // Prepare trait attributes
    const traits = sortedTraits.map(trait => ({
        trait_type: trait.layerName,
        value: trait.name,
        rarity: trait.rarity || 0
    }));
    
    return { image, traits };
};

