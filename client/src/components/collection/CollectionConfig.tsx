import React, { useState, useEffect } from 'react';
import styles from '@/styles/components/collection/CollectionConfig.module.css';
import { AlertCircle, ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';
import { ICollectionConfig } from '@/lib/types';

interface CollectionConfigComponentProps {
    onNext: () => void;
    onBack: () => void;
    onConfigUpdate: (config: ICollectionConfig) => void;
    supply?: number;
    onSupplyChange?: (supply: number) => void;
    hideNavigation?: boolean;
}

export const CollectionConfigComponent: React.FC<CollectionConfigComponentProps> = ({ onNext, onBack, onConfigUpdate, supply, onSupplyChange, hideNavigation = false }) => {
    // Initialize state with proper default values
    const [config, setConfig] = useState<ICollectionConfig>(() => {
        try {
            if (typeof window !== 'undefined') {
                const saved = localStorage.getItem('nft_collection_config');
                if (saved) {
                    const parsedConfig = JSON.parse(saved);
                    // More robust validation of parsed config
                    if (
                        typeof parsedConfig === 'object' && 
                        parsedConfig !== null &&
                        typeof parsedConfig.name === 'string' && 
                        typeof parsedConfig.symbol === 'string'
                    ) {
                        // Make sure all required fields from ICollectionConfig are present
                        return {
                            supply: parsedConfig.supply || supply || 10,
                            name: parsedConfig.name || '',
                            symbol: parsedConfig.symbol || '',
                            description: parsedConfig.description || '',
                            namePrefix: parsedConfig.namePrefix || '',
                            startTokenId: parsedConfig.startTokenId || 1,
                            format: parsedConfig.format || 'png',
                            resolution: parsedConfig.resolution || {
                                width: 512,
                                height: 512
                            },
                            royalties: parsedConfig.royalties || 5,
                            creatorAddress: parsedConfig.creatorAddress || '',
                            externalUrl: parsedConfig.externalUrl || ''
                        };
                    } else {
                        console.warn('Invalid configuration format in localStorage, using defaults');
                        localStorage.removeItem('nft_collection_config');
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load saved configuration:', error);
            // Clear invalid data
            localStorage.removeItem('nft_collection_config');
        }
        // Return default config if loading fails
        return {
            name: '',
            symbol: '',
            description: '',
            namePrefix: '',
            startTokenId: 1,
            format: 'png',
            supply: supply || 10,
            royalties: 5,
            creatorAddress: '',
            externalUrl: '',
            resolution: {
                width: 512,
                height: 512
            },
        };
    });

    const [errors, setErrors] = useState<{
        [K in keyof ICollectionConfig]?: K extends 'resolution' 
            ? { width?: string; height?: string }
            : string;
    }>({});

    // Save to localStorage whenever config changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('nft_collection_config', JSON.stringify(config));
        }
    }, [config]);

    const validateForm = () => {
        const newErrors: {
            [K in keyof ICollectionConfig]?: string;
        } = {};

        if (!config.name.trim()) newErrors.name = 'Collection name is required';
        if (!config.symbol.trim()) newErrors.symbol = 'Collection symbol is required';
        if (!config.description.trim()) newErrors.description = 'Collection description is required';
        if (!config.creatorAddress.trim()) newErrors.creatorAddress = 'Creator address is required';
        if (config.royalties < 0 || config.royalties > 15) {
            newErrors.royalties = 'Royalties must be between 0% and 15%';
        }
        if (config.supply < 1 || config.supply > 10000) {
            newErrors.supply = 'Supply must be between 1 and 10000';
        }

        setErrors(newErrors as any);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        console.log('Submit button clicked');
        if (validateForm()) {
            console.log('Validation passed');
            onConfigUpdate(config);
            onNext();
        } else {
            console.log('Validation failed', errors);
        }
    };

    // Add clear function with environment check
    const clearConfig = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('nft_collection_config');
        }
        setConfig((prevConfig) => ({
            ...prevConfig,
            name: '',
            symbol: '',
            description: '',
            namePrefix: '',
            royalties: 5,
            creatorAddress: '',
            externalUrl: '',
            resolution: {
                width: 512,
                height: 512
            },
            format: 'png',
            startTokenId: 1
        }));
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>Configure Collection</h2>
                <p>Set up the basic information for your NFT collection</p>
            </div>

            <div className={styles.form}>
                <div className={styles.formGroup}>
                    <label>Collection Name</label>
                    <input
                        type="text"
                        value={config.name}
                        onChange={(e) => setConfig({ ...config, name: e.target.value })}
                        placeholder="e.g. Bored Ape Yacht Club"
                        className={errors.name ? styles.error : ''}
                    />
                    {errors.name && <span className={styles.errorText}>{errors.name}</span>}
                </div>

                <div className={styles.formGroup}>
                    <label>Symbol</label>
                    <input
                        type="text"
                        value={config.symbol}
                        onChange={(e) => setConfig({ ...config, symbol: e.target.value.toUpperCase() })}
                        placeholder="e.g. BAYC"
                        maxLength={10}
                        className={errors.symbol ? styles.error : ''}
                    />
                    {errors.symbol && <span className={styles.errorText}>{errors.symbol}</span>}
                </div>

                <div className={styles.formGroup}>
                    <label>Description</label>
                    <textarea
                        value={config.description}
                        onChange={(e) => setConfig({ ...config, description: e.target.value })}
                        placeholder="Describe your collection..."
                        className={errors.description ? styles.error : ''}
                    />
                    {errors.description && <span className={styles.errorText}>{errors.description}</span>}
                </div>

                <div className={styles.formGroup}>
                    <label>External URL (Optional)</label>
                    <input
                        type="url"
                        value={config.externalUrl}
                        onChange={(e) => setConfig({ ...config, externalUrl: e.target.value })}
                        placeholder="e.g. https://boredapeyachtclub.com"
                    />
                </div>

                <div className={styles.formGroup}>
                    <label>Image Resolution</label>
                    <div className={styles.dimensionsRow}>
                        <div className={styles.dimensionField}>
                            <label>Width</label>
                            <input
                                type="number"
                                value={config.resolution.width}
                                onChange={(e) => setConfig({
                                    ...config,
                                    resolution: {
                                        ...config.resolution,
                                        width: Math.max(32, Math.min(2048, parseInt(e.target.value) || 32))
                                    }
                                })}
                                min="32"
                                max="2048"
                                step="32"
                                className={errors.resolution?.width ? styles.error : ''}
                            />
                        </div>
                        <div className={styles.dimensionField}>
                            <label>Height</label>
                            <input
                                type="number"
                                value={config.resolution.height}
                                onChange={(e) => setConfig({
                                    ...config,
                                    resolution: {
                                        ...config.resolution,
                                        height: Math.max(32, Math.min(2048, parseInt(e.target.value) || 32))
                                    }
                                })}
                                min="32"
                                max="2048"
                                step="32"
                                className={errors.resolution?.height ? styles.error : ''}
                            />
                        </div>
                    </div>
                </div>

                <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                        <label>Image Format</label>
                        <select
                            value={config.format}
                            onChange={(e) => setConfig({ ...config, format: e.target.value as 'png' | 'jpg' })}
                            className={styles.select}
                        >
                            <option value="png">PNG</option>
                            <option value="jpg">JPG</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Start Token ID</label>
                        <input
                            type="number"
                            value={config.startTokenId}
                            onChange={(e) => setConfig({ ...config, startTokenId: Math.max(0, parseInt(e.target.value)) })}
                            min="0"
                            className={errors.startTokenId ? styles.error : ''}
                            placeholder="e.g. 1"
                        />
                        {errors.startTokenId && <span className={styles.errorText}>{errors.startTokenId}</span>}
                    </div>
                </div>

                <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                        <label>Collection Supply</label>
                        {/* Supply Input (Only shown if props are provided) */}
                        {supply !== undefined && onSupplyChange && (
                            <div className={styles.formGroup}>
                                <label htmlFor="supply">Supply</label>
                                <input
                                    type="number"
                                    id="supply"
                                    value={supply || 1}
                                    onChange={(e) => {
                                        const newSupply = Math.max(1, Math.min(10000, parseInt(e.target.value) || 1));
                                        onSupplyChange(newSupply);
                                    }}
                                    min="1"
                                    max="10000"
                                    className={errors.supply ? styles.inputError : ''}
                                />
                                {errors.supply && <span className={styles.errorMessage}>{errors.supply}</span>}
                                <small>Maximum supply is 10,000 NFTs</small>
                            </div>
                        )}
                    </div>

                    <div className={styles.formGroup}>
                        <label>Royalties (%)</label>
                        <input
                            type="number"
                            value={config.royalties}
                            onChange={(e) => setConfig({ 
                                ...config, 
                                royalties: Math.min(15, Math.max(0, parseInt(e.target.value))) 
                            })}
                            min="0"
                            max="15"
                            className={errors.royalties ? styles.error : ''}
                        />
                        {errors.royalties && <span className={styles.errorText}>{errors.royalties}</span>}
                    </div>
                </div>

                <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                        <label>Creator Address</label>
                        <input
                            type="text"
                            value={config.creatorAddress}
                            onChange={(e) => setConfig({ ...config, creatorAddress: e.target.value })}
                            placeholder="0x..."
                            className={errors.creatorAddress ? styles.error : ''}
                        />
                        {errors.creatorAddress && <span className={styles.errorText}>{errors.creatorAddress}</span>}
                    </div>
                </div>
            </div>

            {!hideNavigation && (
                <div className={styles.actions}>
                    <div className={styles.leftActions}>
                        <button onClick={onBack} className={styles.backButton}>
                            <ArrowLeft size={16} className={styles.buttonIcon} />
                            Back
                        </button>
                        <button onClick={clearConfig} className={styles.clearButton}>
                            <Trash2 size={16} className={styles.buttonIcon} />
                            Clear All
                        </button>
                    </div>
                    <button 
                        type="button"
                        onClick={handleSubmit} 
                        className={styles.nextButton}
                        disabled={!config.name.trim() || 
                                 !config.symbol.trim() || 
                                 !config.description.trim() || 
                                 !config.creatorAddress.trim() || 
                                 config.royalties < 0 || 
                                 config.royalties > 15}
                    >
                        Continue to Trait Upload
                        <ArrowRight size={16} className={styles.buttonIcon} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default CollectionConfigComponent; 
