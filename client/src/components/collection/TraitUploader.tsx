import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, Plus, X, GripVertical, Trash2, Settings, Copy, AlertCircle, ChevronDown, RefreshCw, Eye, ArrowRight, Ban, ArrowLeft, ChevronUp } from 'lucide-react';
import { FaTrash, FaPlus, FaCog, FaCopy } from 'react-icons/fa';
import styles from '@/styles/components/collection/TraitUploader.module.css';
import { TraitLayer, Trait as LibTrait, Character } from '@/lib/types';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { toast } from 'react-hot-toast';
import { updateLayerName } from '@/lib/utils/layerUtils';

type Trait = LibTrait;

type Layer = TraitLayer;

interface TraitUploaderProps {
    onNext: () => void;
    onBack: () => void;
    onLayersUpdate: (layers: TraitLayer[], rules?: Rule[]) => void;
    layers?: TraitLayer[];
    initialRules?: Rule[];
    hideNavigation?: boolean;
    characters?: Character[];
}

// Add these interfaces
interface Rule {
    id: string;
    sourceLayerId: string;
    sourceTrait: string;
    targetLayerId: string;
    targetTrait: string;
    type: 'require' | 'exclude';
}

// Add this near the top of the file with other interfaces
interface LayerValidation {
    isValid: boolean;
    message?: string;
}

// Add this validation function
const validateLayers = (layers: Layer[]): LayerValidation => {
    // Check if we have at least one layer
    if (layers.length === 0) {
        return {
            isValid: false,
            message: 'You need at least one layer to generate NFTs'
        };
    }
    
    // Optional: Check for background layer if needed
    const hasBackgroundLayer = layers.some(layer => layer.isBackground === true);
    if (!hasBackgroundLayer) {
        return {
            isValid: true // Changed to true to make background optional
        };
    }
    
    return {
        isValid: true
    };
};

// Add this helper component before the LayerSettings component
const TraitDisplay = ({ layer, traitId }: { layer?: Layer; traitId: string }) => {
    if (!layer) return null;
    
    const trait = layer.traits.find(t => t.id === traitId);
    if (!trait) return null;

    return (
        <div className={styles.traitDisplay}>
            <img src={trait.preview} alt={trait.name} />
            <div className={styles.traitInfo}>
                <span className={styles.traitName}>{trait.name}</span>
                <span className={styles.layerName}>{layer.name}</span>
            </div>
        </div>
    );
};

// Move LayerSettings outside of TraitUploader
const LayerSettings = React.memo(({ 
    layerId, 
    layers, 
    updateLayerSetting, 
    setShowSettings, 
    globalRules,
    updateGlobalRules
}: { 
    layerId: string;
    layers: Layer[];
    updateLayerSetting: (layerId: string, field: string, value: any) => void;
    setShowSettings: (value: string | null) => void;
    globalRules: Rule[];
    updateGlobalRules: (rules: Rule[]) => void;
}) => {
    const [activeTab, setActiveTab] = useState<'assets' | 'rules'>('assets');
    const [selectedSourceTrait, setSelectedSourceTrait] = useState<string | null>(null);
    const [selectedSourceLayer, setSelectedSourceLayer] = useState<string | null>(null);
    const [selectedTargetTrait, setSelectedTargetTrait] = useState<string | null>(null);
    const [selectedTargetLayer, setSelectedTargetLayer] = useState<string | null>(null);
    const [selectedRuleType, setSelectedRuleType] = useState<'require' | 'exclude'>('require');
    const [editingRule, setEditingRule] = useState<string | null>(null);
    const [editingTraitType, setEditingTraitType] = useState<'source' | 'target' | null>(null);

    const layer = layers.find(l => l.id === layerId);

    // Add handler for rule creation
    const handleAddRule = useCallback(() => {
        if (!selectedSourceTrait || !selectedTargetTrait || 
            !selectedSourceLayer || !selectedTargetLayer) return;

        const newRule: Rule = {
            id: `rule-${Date.now()}-${Math.random()}`,
            sourceLayerId: selectedSourceLayer,
            sourceTrait: selectedSourceTrait,
            targetLayerId: selectedTargetLayer,
            targetTrait: selectedTargetTrait,
            type: selectedRuleType
        };

        updateGlobalRules([...globalRules, newRule]);
        
        // Reset selections
        setSelectedSourceTrait(null);
        setSelectedSourceLayer(null);
        setSelectedTargetTrait(null);
        setSelectedTargetLayer(null);
        setSelectedRuleType('require');
    }, [selectedSourceTrait, selectedTargetTrait, selectedSourceLayer, 
        selectedTargetLayer, selectedRuleType, updateGlobalRules, globalRules]);

    // Add handler for rule removal
    const handleRemoveRule = (ruleId: string) => {
        updateGlobalRules(globalRules.filter(rule => rule.id !== ruleId));
    };

    if (!layer) return null;

   

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        // Validate file sizes and types
        const validFiles = Array.from(files).filter(file => {
            if (file.size > 5 * 1024 * 1024) {
                toast.error(`${file.name} is too large (max 5MB)`);
                return false;
            }
            if (!file.type.startsWith('image/')) {
                toast.error(`${file.name} is not an image`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;

        try {
            const newTraits: Trait[] = validFiles.map(file => ({
                id: `trait-${Date.now()}-${Math.random()}`,
                name: file.name.split('.')[0].replace(/[^a-zA-Z0-9-_]/g, '_'),
                image: file,
                preview: URL.createObjectURL(file),
                rarity: 100,
                layerName: layers.find(l => l.id === layerId)?.name || 'Unknown Layer'
            }));

            const layer = layers.find(l => l.id === layerId);
            if (layer) {
                updateLayerSetting(layerId, 'traits', [...layer.traits, ...newTraits]);
                toast.success(`Added ${newTraits.length} traits to ${layer.name}`);
            }
        } catch (error) {
            toast.error('Error uploading files');
            console.error(error);
        }
    }, [layers]);

    

    const updateRule = (ruleId: string, field: keyof Rule, value: string) => {
        updateLayerSetting(
            layerId, 
            'rules', 
            (layer.rules || []).map((rule: { id: string; }) => 
                rule.id === ruleId ? { ...rule, [field]: value } : rule
            )
        );
    };

    const removeRule = (ruleId: string) => {
        updateLayerSetting(
            layerId,
            'rules',
            (layer.rules || []).filter((rule: { id: string; }) => rule.id !== ruleId)
        );
    };

    const handleRuleCreation = (type: string, targetLayerId: string) => {
        const newRule = {
            id: `rule-${Date.now()}`,
            type,
            sourceLayerId: layerId,
            targetLayerId,
            sourceTrait: '',
            targetTrait: ''
        };
        
        updateLayerSetting(layerId, 'rules', [...(layer.rules || []), newRule]);
    };

    const handleRuleCardClick = (rule: Rule, type: 'source' | 'target') => {
        setEditingRule(rule.id);
        setEditingTraitType(type);
    };

    const handleRuleTypeToggle = (rule: Rule) => {
        handleUpdateRule(rule.id, {
            type: rule.type === 'require' ? 'exclude' : 'require'
        });
    };

    // Add this function to check if a rule already exists
    const isRuleExists = (sourceLayerId: string, sourceTrait: string, targetLayerId: string, targetTrait: string) => {
        return globalRules.some(rule => 
            (rule.sourceLayerId === sourceLayerId && 
             rule.sourceTrait === sourceTrait && 
             rule.targetLayerId === targetLayerId && 
             rule.targetTrait === targetTrait) ||
            // Also check the reverse combination
            (rule.sourceLayerId === targetLayerId && 
             rule.sourceTrait === targetTrait && 
             rule.targetLayerId === sourceLayerId && 
             rule.targetTrait === sourceTrait)
        );
    };

    // Add this function to get available target layers and traits
    const getAvailableTargets = (sourceLayerId: string, sourceTrait: string) => {
        return layers.filter(layer => layer.id !== sourceLayerId).map(layer => ({
            ...layer,
            traits: layer.traits.filter(trait => 
                !isRuleExists(sourceLayerId, sourceTrait, layer.id, trait.id)
            )
        })).filter(layer => layer.traits.length > 0); // Only return layers that have available traits
    };

    // Add this function to check for existing rules
    const isTraitInRule = (layerId: string, traitId: string) => {
        return globalRules.some(rule => 
            (rule.sourceLayerId === layerId && rule.sourceTrait === traitId) ||
            (rule.targetLayerId === layerId && rule.targetTrait === traitId)
        );
    };

    // Add this function to get available traits for selection
    const getAvailableTraits = (excludeLayerId?: string) => {
        return layers.filter(layer => !excludeLayerId || layer.id !== excludeLayerId)
            .map(layer => ({
                ...layer,
                traits: layer.traits.filter(trait => 
                    !isTraitInRule(layer.id, trait.id) ||
                    (selectedSourceLayer === layer.id && selectedSourceTrait === trait.id)
                )
            }))
            .filter(layer => layer.traits.length > 0);
    };

    // Update the trait selection rendering
    const renderTraitSelection = (isSource: boolean) => (
        <div className={styles.traitSelectGroup}>
            <label>{isSource ? 'Select first trait:' : 'Select second trait:'}</label>
            <div className={styles.traitSelectBox}>
                {getAvailableTraits(isSource ? undefined : selectedSourceLayer || undefined).map(layer => (
                    layer.traits.map(trait => {
                        const isSelected = isSource 
                            ? selectedSourceTrait === trait.id
                            : selectedTargetTrait === trait.id;
                        
                        return (
                            <div
                                key={`${layer.id}-${trait.id}`}
                                className={`${styles.traitOption} ${isSelected ? styles.selected : ''}`}
                                onClick={() => {
                                    if (isSource) {
                                        setSelectedSourceLayer(layer.id);
                                        setSelectedSourceTrait(trait.id);
                                        setSelectedTargetLayer(null);
                                        setSelectedTargetTrait(null);
                                    } else {
                                        setSelectedTargetLayer(layer.id);
                                        setSelectedTargetTrait(trait.id);
                                    }
                                }}
                            >
                                <img src={trait.preview} alt={trait.name} />
                                <span>{trait.name}</span>
                                <small className={styles.layerName}>{layer.name}</small>
                            </div>
                        );
                    })
                ))}
            </div>
        </div>
    );

    function handleUpdateRule(id: string, arg1: { type: string; }): void {
        throw new Error('Function not implemented.');
    }

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.settingsModal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3>Layer Settings</h3>
                    <button
                        onClick={() => setShowSettings(null)}
                        className={styles.closeButton}
                    >
                        Save & Close
                    </button>
                </div>

                <div className={styles.settingField}>
                    <label>Display Name</label>
                    <input
                        type="text"
                        value={layer?.displayName || layer?.name || ''}
                        onChange={(e) => {
                            updateLayerSetting(layerId, 'name', e.target.value);
                            updateLayerSetting(layerId, 'displayName', e.target.value);
                        }}
                        className={styles.settingInput}
                    />
                </div>

                <div className={styles.settingField}>
                    <div className={styles.settingWithHelp}>
                        <div className={styles.settingLabel}>Metadata Visibility</div>
                        <div className={styles.settingToggleWrapper}>
                            <label className={styles.toggleSwitch}>
                                <input
                                    type="checkbox"
                                    checked={layer?.showInMetadata}
                                    onChange={(e) => {
                                        updateLayerSetting(layerId, 'showInMetadata', e.target.checked);
                                        // Optional: Add visual feedback
                                        const message = e.target.checked ? 
                                            `${layer?.name} will be shown in metadata` : 
                                            `${layer?.name} will be hidden from metadata`;
                                        // If you have a toast/notification system
                                        // showNotification(message);
                                    }}
                                />
                                <span className={styles.toggleSlider}></span>
                            </label>
                            <span className={styles.toggleLabel}>
                                {layer?.showInMetadata ? 'Visible in Metadata' : 'Hidden in Metadata'}
                            </span>
                        </div>
                    </div>
                    <span className={styles.settingHelp}>
                        Toggle to control whether traits from this layer appear in the NFT metadata. 
                        Hidden layers won't affect the visual appearance but won't be included in metadata.
                    </span>
                </div>

                <div className={styles.settingField}>
                    <label>Layer Rarity</label>
                    <div className={styles.raritySliderContainer}>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={layer?.layerRarity || 100}
                            onChange={(e) => {
                                const newValue = Number(e.target.value);
                                updateLayerSetting(layerId, 'layerRarity', newValue);
                            }}
                            className={styles.settingSlider}
                        />
                        <span className={styles.rarityValue}>{layer?.layerRarity || 100}%</span>
                    </div>
                    <span className={styles.settingHelp}>
                        Chance of this layer appearing in the generated NFTs. 
                        {layer?.layerRarity !== undefined && layer.layerRarity < 100 && (
                            <strong> This layer will only appear in {layer.layerRarity}% of the NFTs.</strong>
                        )}
                    </span>
                </div>

                <div className={styles.tabButtons}>
                    <button 
                        className={`${styles.tabButton} ${activeTab === 'assets' ? styles.active : ''}`}
                        onClick={() => setActiveTab('assets')}
                    >
                        Assets
                    </button>
                    <button 
                        className={`${styles.tabButton} ${activeTab === 'rules' ? styles.active : ''}`}
                        onClick={() => setActiveTab('rules')}
                    >
                        Rules
                    </button>
                </div>

                <div className={styles.tabContent}>
                    {activeTab === 'assets' ? (
                        <div className={styles.assetsSection}>
                            <div className={styles.uploadArea}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileUpload}
                                    style={{ display: 'none' }}
                                    id={`settings-file-input-${layerId}`}
                                />
                                <label 
                                    htmlFor={`settings-file-input-${layerId}`}
                                    className={styles.uploadButton}
                                >
                                    <Upload size={20} />
                                    <span>Upload New Assets</span>
                                </label>
                            </div>
                            {layer?.traits.length > 0 ? (
                                <div className={styles.traitsList}>
                                    {layer.traits.map(trait => (
                                        <div key={trait.id} className={styles.traitRow}>
                                            <div className={styles.traitImageWrapper}>
                                                <img src={trait.preview} alt={trait.name} className={styles.traitImage} />
                                            </div>
                                            <div className={styles.traitDetails}>
                                                <input
                                                    type="text"
                                                    value={trait.name}
                                                    onChange={(e) => updateLayerSetting(
                                                        layerId,
                                                        'traits',
                                                        layer.traits.map(t => 
                                                            t.id === trait.id 
                                                                ? { ...t, name: e.target.value }
                                                                : t
                                                        )
                                                    )}
                                                    className={styles.traitNameInput}
                                                    placeholder="Trait name"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className={styles.noAssetsMessage}>No assets uploaded yet. Use the button above to add some!</p>
                            )}
                        </div>
                    ) : (
                        <div className={styles.rulesSection}>
                            <div className={styles.ruleDescription}>
                                <AlertCircle size={16} />
                                <p>Create rules between traits to define their relationships</p>
                            </div>

                            {/* First Trait Selection */}
                            <div className={styles.traitSelectGroup}>
                                <label>Select first trait:</label>
                                <div className={styles.traitSelectBox}>
                                    {layers.map(layer => (
                                        layer.traits.map(trait => (
                                            <div
                                                key={trait.id}
                                                className={`${styles.traitOption} ${
                                                    selectedSourceTrait === trait.id ? styles.selected : ''
                                                }`}
                                                onClick={() => {
                                                    setSelectedSourceLayer(layer.id);
                                                    setSelectedSourceTrait(trait.id);
                                                    // Reset target selection when source changes
                                                    setSelectedTargetLayer(null);
                                                    setSelectedTargetTrait(null);
                                                }}
                                            >
                                                <img src={trait.preview} alt={trait.name} />
                                                <span>{trait.name}</span>
                                                <small className={styles.layerName}>{layer.name}</small>
                                            </div>
                                        ))
                                    ))}
                                </div>
                            </div>

                            {/* Rule Type Selection - Shows after first trait is selected */}
                            {selectedSourceTrait && (
                                <div className={styles.ruleTypeSelection}>
                                    <label>This trait:</label>
                                    <div className={styles.ruleTypeButtons}>
                                        <button 
                                            className={`${styles.ruleTypeButton} ${
                                                selectedRuleType === 'require' ? styles.selected : ''
                                            }`}
                                            onClick={() => setSelectedRuleType('require')}
                                        >
                                            Must Include <ArrowRight size={16} />
                                        </button>
                                        <button 
                                            className={`${styles.ruleTypeButton} ${
                                                selectedRuleType === 'exclude' ? styles.selected : ''
                                            }`}
                                            onClick={() => setSelectedRuleType('exclude')}
                                        >
                                            Cannot Include <Ban size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Second Trait Selection - Shows after rule type is selected */}
                            {selectedSourceTrait && selectedRuleType && (
                                <div className={styles.traitSelectGroup}>
                                    <label>Select second trait:</label>
                                    <div className={styles.traitSelectBox}>
                                        {layers.map(layer => (
                                            // Skip the layer that contains the source trait
                                            layer.id !== selectedSourceLayer && 
                                            layer.traits.map(trait => (
                                                <div
                                                    key={trait.id}
                                                    className={`${styles.traitOption} ${
                                                        selectedTargetTrait === trait.id ? styles.selected : ''
                                                    }`}
                                                    onClick={() => {
                                                        setSelectedTargetLayer(layer.id);
                                                        setSelectedTargetTrait(trait.id);
                                                    }}
                                                >
                                                    <img src={trait.preview} alt={trait.name} />
                                                    <span>{trait.name}</span>
                                                    <small className={styles.layerName}>{layer.name}</small>
                                                </div>
                                            ))
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Add Rule Button - Shows when both traits are selected */}
                            {selectedSourceTrait && selectedTargetTrait && (
                                <div className={styles.ruleActions}>
                                    <button 
                                        className={styles.addRuleButton}
                                        onClick={() => {
                                            const newRule: Rule = {
                                                id: `rule-${Date.now()}`,
                                                sourceLayerId: selectedSourceLayer!,
                                                sourceTrait: selectedSourceTrait,
                                                targetLayerId: selectedTargetLayer!,
                                                targetTrait: selectedTargetTrait,
                                                type: selectedRuleType
                                            };
                                            updateGlobalRules([...globalRules, newRule]);
                                            // Reset selections after adding rule
                                            setSelectedSourceTrait(null);
                                            setSelectedSourceLayer(null);
                                            setSelectedTargetTrait(null);
                                            setSelectedTargetLayer(null);
                                        }}
                                    >
                                        <Plus size={16} />
                                        Add Rule
                                    </button>
                                </div>
                            )}

                            {/* Existing Rules Display */}
                            {globalRules.length > 0 && (
                                <div className={styles.existingRules}>
                                    <h3>Existing Rules</h3>
                                    {globalRules.map(rule => (
                                        <div key={rule.id} className={styles.ruleItem}>
                                            <div className={styles.ruleContent}>
                                                <TraitDisplay 
                                                    layer={layers.find(l => l.id === rule.sourceLayerId)} 
                                                    traitId={rule.sourceTrait} 
                                                />
                                                <button
                                                    className={styles.ruleConditionButton}
                                                    onClick={() => handleUpdateRule(rule.id, {
                                                        type: rule.type === 'require' ? 'exclude' : 'require'
                                                    })}
                                                >
                                                    {rule.type === 'require' ? (
                                                        <>Must Include <ArrowRight size={16} /></>
                                                    ) : (
                                                        <>Cannot Include <Ban size={16} /></>
                                                    )}
                                                </button>
                                                <TraitDisplay 
                                                    layer={layers.find(l => l.id === rule.targetLayerId)} 
                                                    traitId={rule.targetTrait} 
                                                />
                                                <button 
                                                    onClick={() => handleRemoveRule(rule.id)}
                                                    className={styles.removeRuleButton}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

const moveLayer = (layers: Layer[], fromIndex: number, toIndex: number) => {
    // Get only filtered layers that are being displayed
    const displayLayers = [...layers].filter(layer => !layer.isBackground);
    
    // Safety checks
    if (fromIndex < 0 || fromIndex >= displayLayers.length) {
        console.log('Invalid source index', fromIndex);
        return layers;
    }
    
    if (toIndex < 0 || toIndex >= displayLayers.length) {
        console.log('Invalid destination index', toIndex);
        return layers;
    }
    
    // Prevent moving the background layer
    const fromLayer = displayLayers[fromIndex];
    if (fromLayer?.isDefaultBackground === true || fromLayer?.isBackground === true) {
        console.log('Cannot move background layer');
        return layers;
    }
    
    // Create a copy of the layers array
    const newLayers = [...layers];
    
    // Identify the actual layers to move by their IDs
    const sourceLayer = displayLayers[fromIndex];
    const sourceIndex = newLayers.findIndex(l => l.id === sourceLayer.id);
    
    // Move the layer
    const [removed] = newLayers.splice(sourceIndex, 1);
    
    // Find the destination index in the complete layers array
    let destIndex;
    if (toIndex >= displayLayers.length - 1) {
        // If moving to the end, put it at the end of all layers
        destIndex = newLayers.length;
    } else {
        // Otherwise find the position of the destination layer in the complete array
        const destLayer = displayLayers[toIndex];
        destIndex = newLayers.findIndex(l => l.id === destLayer.id);
    }
    
    newLayers.splice(destIndex, 0, removed);
    
    // Re-order all layers
    return newLayers.map((layer, index) => ({
        ...layer,
        order: (layer.isBackground === true) ? 0 : index + 1
    }));
};

// Default background layer
const DEFAULT_BACKGROUND_LAYER: TraitLayer = {
    id: 'background-default',
    name: 'Background',
    displayName: 'Background',
    isBackground: true,
    traits: [],
    order: 0,
    required: true,
    characterId: 'default-character'
};

// Default character
const DEFAULT_CHARACTER: Character = {
    id: 'default-character',
    name: 'Default Character',
    description: 'The default character type',
    supply: 0,
    layers: [],
    imagePreview: ''
};

// Default character creator function
const getDefaultCharacter = (): Omit<Character, 'id'> => ({
    name: 'New Character Type',
    description: '',
    supply: 0,
    layers: [],
    imagePreview: ''
});

// Add helper function to generate unique layer name
const generateUniqueLayerName = (baseName: string, layers: Layer[]): string => {
    let counter = 1;
    let newName = `${baseName} Copy`;
    // Keep adding numbers until we find a unique name
    while (layers.some((layer: Layer) => layer.name === newName)) {
        counter++;
        newName = `${baseName} Copy ${counter}`;
    }
    return newName;
};

// Add validation for trait names
const validateTraitName = (layerId: string, traitName: string, layers: Layer[], traitId?: string): boolean => {
    const layer = layers.find((l: Layer) => l.id === layerId);
    if (!layer) return true;
    
    return !layer.traits.some((t) => 
        t.name.toLowerCase() === traitName.toLowerCase() && 
        (!traitId || t.id !== traitId)
    );
};

// Add this interface for the rarity slider
interface RaritySliderProps {
    value: number;
    onChange: (value: number) => void;
    label: string;
}

const RaritySlider: React.FC<RaritySliderProps> = ({ value, onChange, label }) => {
    // Convert weight (1-10) to descriptive text
    const getRarityText = (weight: number) => {
        if (weight <= 2) return 'Super Rare';
        if (weight <= 4) return 'Rare';
        if (weight <= 7) return 'Uncommon';
        return 'Common';
    };

    // Get color based on weight
    const getRarityColor = (weight: number) => {
        if (weight <= 2) return '#FF6B6B'; // Red for super rare
        if (weight <= 4) return '#9775FA'; // Purple for rare
        if (weight <= 7) return '#4DABF7'; // Blue for uncommon
        return '#51CF66'; // Green for common
    };

    return (
        <div className={styles.raritySliderContainer}>
            <div className={styles.rarityHeader}>
                <span className={styles.rarityLabel}>{label}</span>
                <span 
                    className={styles.rarityValue}
                    style={{ backgroundColor: getRarityColor(value) }}
                >
                    {getRarityText(value)} ({value})
                </span>
            </div>
            <div className={styles.sliderWrapper}>
                <input
                    type="range"
                    min="1"
                    max="10"
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className={styles.raritySlider}
                    style={{ 
                        background: `linear-gradient(to right, 
                            ${getRarityColor(1)}, 
                            ${getRarityColor(5)}, 
                            ${getRarityColor(10)})` 
                    }}
                />
                <div className={styles.rarityIndicators}>
                    <span>Super Rare</span>
                    <span>Common</span>
                </div>
            </div>
        </div>
    );
};

// Update the trait settings component
const TraitSettings = ({ trait, onUpdate }: { trait: Trait; onUpdate: (updates: Partial<Trait>) => void }) => {
    return (
        <div className={styles.traitSettings}>
            <RaritySlider
                value={trait.rarity || 100}
                onChange={(value) => onUpdate({ rarity: value })}
                label="Trait Rarity"
            />
        </div>
    );
};

// Add this component for the trait rarity editor
const TraitRarityEditor = ({ trait, onUpdate }: { 
    trait: Trait; 
    onUpdate: (weight: number) => void;
}) => {
    const getWeightLabel = (weight: number) => {
        if (weight <= 2) return 'Super Rare';
        if (weight <= 4) return 'Rare';
        if (weight <= 7) return 'Uncommon';
        return 'Common';
    };

    const getWeightColor = (weight: number) => {
        if (weight <= 2) return '#FF6B6B';
        if (weight <= 4) return '#9775FA';
        if (weight <= 7) return '#4DABF7';
        return '#51CF66';
    };

    return (
        <div className={styles.traitRarityEditor}>
            <div className={styles.weightButtons}>
                {[1, 3, 5, 8].map((weight) => (
                    <button
                        key={weight}
                        onClick={() => onUpdate(weight)}
                        className={`${styles.weightButton} ${
                            trait.rarity === weight ? styles.weightButtonActive : ''
                        }`}
                        style={{
                            backgroundColor: getWeightColor(weight),
                            opacity: trait.rarity === weight ? 1 : 0.6
                        }}
                    >
                        {getWeightLabel(weight)}
                    </button>
                ))}
            </div>
            <div className={styles.weightSlider}>
                <input
                    type="range"
                    min="1"
                    max="10"
                    value={trait.rarity || 5}
                    onChange={(e) => onUpdate(Number(e.target.value))}
                    className={styles.raritySlider}
                    style={{
                        background: `linear-gradient(to right, 
                            ${getWeightColor(1)}, 
                            ${getWeightColor(5)}, 
                            ${getWeightColor(10)})`
                    }}
                />
                <span className={styles.weightValue} style={{ color: getWeightColor(trait.rarity || 5) }}>
                    Weight: {trait.rarity || 5}
                </span>
            </div>
        </div>
    );
};

// Add this component for trait cards
const TraitCard = ({ trait, layerId, onRarityChange, onDelete, onNameChange }: {
    trait: Trait;
    layerId: string;
    onRarityChange: (layerId: string, traitId: string, value: number) => void;
    onDelete: (layerId: string, traitId: string) => void;
    onNameChange: (layerId: string, traitId: string, newName: string) => void;
}) => {
    const [currentRarity, setCurrentRarity] = useState(trait.rarity || 50);

    const rarityPresets = [
        { type: 'super-rare', label: 'Super', value: 10 },
        { type: 'rare', label: 'Rare', value: 25 },
        { type: 'uncommon', label: 'Uncom', value: 50 },
        { type: 'common', label: 'Common', value: 100 }
    ];

    const handleRarityChange = (value: number) => {
        setCurrentRarity(value);
        onRarityChange(layerId, trait.id, value);
    };

    return (
        <div className={styles.traitCard}>
            <div className={styles.traitImageWrapper}>
                <img src={trait.preview} alt={trait.name} className={styles.traitImage} />
                <button 
                    className={styles.deleteTraitButton}
                    onClick={() => onDelete(layerId, trait.id)}
                    title="Delete trait"
                >
                    <Trash2 size={14} />
                </button>
            </div>
            <div className={styles.traitContent}>
                <input
                    type="text"
                    value={trait.name}
                    onChange={(e) => onNameChange(layerId, trait.id, e.target.value)}
                    className={styles.traitNameInput}
                    placeholder="Trait name"
                />
                <div className={styles.rarityPresets}>
                    {rarityPresets.map(({ type, label, value }) => (
                        <button 
                            key={type}
                            className={`${styles.rarityPreset} ${currentRarity === value ? styles.active : ''}`}
                            data-rarity={type}
                            onClick={() => handleRarityChange(value)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <div className={styles.rarityContainer}>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={currentRarity}
                        onChange={(e) => handleRarityChange(Number(e.target.value))}
                        className={styles.raritySlider}
                    />
                    <span className={styles.rarityValue}>{currentRarity}%</span>
                </div>
            </div>
        </div>
    );
};

// Add function declarations that were removed
const validateLayerName = (name: string, layers: Layer[], currentLayerId?: string): boolean => {
    if (!name.trim()) return false;
    return !layers.some(layer => 
        layer.id !== currentLayerId && 
        layer.name.toLowerCase() === name.toLowerCase()
    );
};

// Make sure the component returns JSX
const TraitUploader: React.FC<TraitUploaderProps> = ({ 
    onNext, 
    onBack, 
    onLayersUpdate, 
    layers: initialLayers, 
    initialRules,
    hideNavigation = false,
    characters: initialCharacters
}) => {
    // Helper function to generate unique IDs
    const generateId = (): string => {
        return `id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    };

    // State setup
    const [layers, setLayers] = useState<TraitLayer[]>(() => {
        if (initialLayers && initialLayers.length > 0) {
            const hasBackgroundLayer = initialLayers.some(layer => layer.id === 'background-default');
            return hasBackgroundLayer ? initialLayers : [DEFAULT_BACKGROUND_LAYER, ...initialLayers];
        }
        return [DEFAULT_BACKGROUND_LAYER];
    });
    
    // Add characters state
    const [characters, setCharacters] = useState<Character[]>(() => {
        if (initialCharacters && initialCharacters.length > 0) {
            return initialCharacters;
        }
        // Create default character with existing layers
        const defaultChar = {
            ...DEFAULT_CHARACTER,
            layers: layers.map(layer => ({...layer, characterId: DEFAULT_CHARACTER.id}))
        };
        return [defaultChar];
    });
    
    // Add active character state
    const [activeCharacterId, setActiveCharacterId] = useState<string>(
        characters.length > 0 ? characters[0].id : DEFAULT_CHARACTER.id
    );
    
    // Add state for character management
    const [isAddingCharacter, setIsAddingCharacter] = useState(false);
    // Modify the type for newCharacter back to Omit<Character, 'id'>
    const [newCharacter, setNewCharacter] = useState<Omit<Character, 'id'>>(getDefaultCharacter());
    
    const [activeLayerId, setActiveLayerId] = useState<string>(layers[0]?.id || '');
    const [newLayerName, setNewLayerName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [showSettings, setShowSettings] = useState<string | null>(null);
    const [totalRarity, setTotalRarity] = useState<Record<string, number>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [showUploadSection, setShowUploadSection] = useState(true);
    const [randomPreview, setRandomPreview] = useState<Record<string, Trait>>({});
    const [showPreviewStrip, setShowPreviewStrip] = useState(false);
    const [previewStripKey, setPreviewStripKey] = useState(0);
    const [globalRules, setGlobalRules] = useState<Rule[]>(initialRules || []);
    const [editingRule, setEditingRule] = useState<string | null>(null);
    const [editingTraitType, setEditingTraitType] = useState<'source' | 'target' | null>(null);
    const [previewCombinations, setPreviewCombinations] = useState<Record<string, Trait>[]>([]);
    const [isAddLayerOpen, setIsAddLayerOpen] = useState<boolean>(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
    const [selectedRuleType, setSelectedRuleType] = useState<'require' | 'exclude'>('require');
    const [selectedSourceLayer, setSelectedSourceLayer] = useState<string | null>(null);
    const [selectedTargetLayer, setSelectedTargetLayer] = useState<string | null>(null);
    const [showGuide, setShowGuide] = useState(false);

    // Effect to filter layers based on active character
    useEffect(() => {
        // Update activeLayerId when character changes
        const characterLayers = layers.filter(layer => 
            !layer.characterId || layer.characterId === activeCharacterId
        );
        
        if (characterLayers.length > 0 && (!activeLayerId || 
            !characterLayers.some(layer => layer.id === activeLayerId))) {
            setActiveLayerId(characterLayers[0].id);
        }
    }, [activeCharacterId, layers, activeLayerId]);
    
    // Update parent when layers or characters change
    useEffect(() => {
        // Update all layers with character IDs
        const allLayers = characters.flatMap(char => 
            char.layers.map(layer => ({...layer, characterId: char.id}))
        );
        
        if (onLayersUpdate) {
            onLayersUpdate(allLayers, globalRules);
        }
        
        // Save characters to localStorage
        if (characters.length > 0) {
            localStorage.setItem('nft_characters', JSON.stringify(characters));
        }
    }, [characters, globalRules, onLayersUpdate]);

    // Add useEffect to load saved data on mount
    useEffect(() => {
        // Load saved data
        const savedData = localStorage.getItem('nft_layers_data');
        if (savedData) {
            try {
                const { layers: savedLayers, rules: savedRules } = JSON.parse(savedData);
                if (savedLayers?.length > 0) {
                    setLayers(savedLayers);
                    if (onLayersUpdate) {
                        onLayersUpdate(savedLayers, savedRules || []);
                    }
                }
            } catch (error) {
                console.error('Error loading saved layers:', error);
            }
        }
    }, []);

    // Add this effect to save changes
    useEffect(() => {
        if (layers.length > 0) {
            try {
                localStorage.setItem('nft_layers_data', JSON.stringify({
                    layers,
                    rules: globalRules,
                    timestamp: Date.now()
                }));
            } catch (error) {
                console.error('Error saving layers:', error);
            }
        }
    }, [layers, globalRules]);

    // Modify the updateLayerSetting function to ensure proper saving
    const updateLayerSetting = useCallback((layerId: string, field: string, value: any) => {
        setLayers(prev => {
            const updatedLayers = prev.map(layer => {
                if (layer.id === layerId) {
                    const updatedLayer = { ...layer, [field]: value };
                    
                    if (field === 'name') {
                        updatedLayer.displayName = value;
                    } else if (field === 'displayName') {
                        updatedLayer.name = value;
                    }
                    
                    return updatedLayer;
                }
                return layer;
            });

            // Save to localStorage immediately after update
            localStorage.setItem('nft_layers_data', JSON.stringify({
                layers: updatedLayers,
                globalRules,
                timestamp: Date.now()
            }));

            return updatedLayers;
        });
    }, [globalRules]);

    // Modify addLayer to save immediately
    const addLayer = () => {
        handleAddLayer();
    };

    const removeLayer = (layerId: string) => {
        // Prevent removal of default background layer
        if (layerId === 'background-default') return;
        
        setLayers(prev => prev.filter(layer => layer.id !== layerId));
    };

    const updateLayerName = useCallback((layerId: string, newName: string) => {
        const layer = layers.find(l => l.id === layerId);
        if (!layer) return;
        
        // Allow empty names during editing
        if (!newName.trim()) {
            setLayers(prev =>
                prev.map(layer =>
                    layer.id === layerId 
                        ? { ...layer, name: newName, displayName: newName } 
                        : layer
                )
            );
            return;
        }
        
        // Check for duplicate names (excluding the current layer)
        const isDuplicate = layers.some(l => 
            l.id !== layerId && 
            l.name.toLowerCase() === newName.trim().toLowerCase()
        );
        
        if (isDuplicate) {
            toast.error('A layer with this name already exists');
            return;
        }
        
        setLayers(prev =>
            prev.map(layer =>
                layer.id === layerId 
                    ? { ...layer, name: newName.trim(), displayName: newName.trim() } 
                    : layer
            )
        );
    }, [layers]);

    const updateTraitName = (layerId: string, traitId: string, newName: string) => {
        setLayers(prev =>
            prev.map(layer => {
                if (layer.id === layerId) {
                    return {
                        ...layer,
                        traits: layer.traits.map(trait => 
                            trait.id === traitId ? { ...trait, name: newName } : trait
                        )
                    };
                }
                return layer;
            })
        );
    };

    const updateTraitRarity = (layerId: string, traitId: string, value: number) => {
        setLayers(prev => prev.map(layer => {
            if (layer.id === layerId) {
                return {
                    ...layer,
                    traits: layer.traits.map(trait => 
                        trait.id === traitId 
                            ? { ...trait, rarity: value }
                            : trait
                    )
                };
            }
            return layer;
        }));
    };

    const removeTrait = (layerId: string, traitId: string) => {
        const updatedLayers = layers.map(layer => {
            if (layer.id === layerId) {
                return {
                    ...layer,
                    traits: layer.traits.filter(trait => trait.id !== traitId)
                };
            }
            return layer;
        });
        
        setLayers(updatedLayers);
        if (onLayersUpdate) {
            onLayersUpdate(updatedLayers, globalRules);
        }
    };

    const toggleLayerRequired = (layerId: string) => {
        const updatedLayers = layers.map(layer =>
            layer.id === layerId ? { ...layer, required: !layer.required } : layer
        );
        setLayers(updatedLayers);
        if (onLayersUpdate) {
            onLayersUpdate(updatedLayers, globalRules);
        }
    };

    const handleDragStart = () => {
        console.log('Drag started');
        setIsDragging(true);
    };

    // Restore the original handleDragEnd function 
    const handleDragEnd = (result: DropResult) => {
        console.log('Drag ended:', result);
        setIsDragging(false);
        
        if (!result.destination) {
            console.log('No destination, ignoring drag');
            return;
        }
        
        // Only consider the filtered layers for the current character
        const filteredLayers = layers.filter(layer => layer.characterId === activeCharacterId)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
        
        // Find the source and destination indices in the filtered layers
        const sourceIndex = result.source.index;
        const destinationIndex = result.destination.index;
        
        // Skip if nothing changed
        if (sourceIndex === destinationIndex) {
            return;
        }
        
        // Create a new array of all layers
        const allLayers = [...layers];
        
        // Get the source layer from the filtered list
        const sourceLayer = filteredLayers[sourceIndex];
        
        // Find its index in the complete layers array
        const actualSourceIndex = allLayers.findIndex(l => l.id === sourceLayer.id);
        
        // Remove the layer from its current position
        const [removed] = allLayers.splice(actualSourceIndex, 1);
        
        // Find the destination layer and its index in the complete array
        const destLayer = destinationIndex < filteredLayers.length 
            ? filteredLayers[destinationIndex] 
            : filteredLayers[filteredLayers.length - 1];
        
        const actualDestIndex = destinationIndex < filteredLayers.length
            ? allLayers.findIndex(l => l.id === destLayer.id)
            : allLayers.length;
        
        // Insert the layer at its new position
        allLayers.splice(actualDestIndex, 0, removed);
        
        // Update the order of all layers
        const updatedLayers = allLayers.map((layer, index) => ({
            ...layer,
            order: layer.isBackground ? 0 : index + 1
        }));
        
        console.log('Layers updated with new order:', updatedLayers);
        setLayers(updatedLayers);
        onLayersUpdate(updatedLayers, globalRules);
    };

    const duplicateLayer = (layerId: string) => {
        const sourceLayer = layers.find(l => l.id === layerId);
        if (!sourceLayer) return;

        const newTraits = sourceLayer.traits.map(trait => ({
            ...trait,
            id: `trait-${Date.now()}-${Math.random()}`
        }));

        const newLayer: Layer = {
            id: `layer-${Date.now()}-${Math.random()}`,
            name: `${sourceLayer.name} (Copy)`,
            displayName: `${sourceLayer.displayName || sourceLayer.name} (Copy)`,
            traits: newTraits,
            isBackground: false, // Never duplicate as background
            characterId: activeCharacterId
        };

        setLayers(prev => reorderLayers([...prev, newLayer]));
        toast.success(`Duplicated layer ${sourceLayer.name}`);
    };

    const handleTraitUpload = async (files: FileList) => {
        if (!activeLayerId) {
            setError('Please select a layer first');
            return;
        }

        const validFiles = Array.from(files).filter(file => 
            file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024
        );

        if (validFiles.length !== files.length) {
            setError('Some files were skipped (invalid type or too large)');
        }

        const CHUNK_SIZE = 10;
        for (let i = 0; i < validFiles.length; i += CHUNK_SIZE) {
            const chunk = validFiles.slice(i, i + CHUNK_SIZE);
            await new Promise(resolve => setTimeout(resolve, 100));

            const newTraits = await Promise.all(chunk.map(async file => {
                const preview = await createImagePreview(file);
                return {
                    id: `trait-${Date.now()}-${Math.random()}`,
                    name: file.name.split('.')[0].replace(/[^a-zA-Z0-9-_]/g, '_'),
                    image: file,
                    preview,
                    rarity: 50, // Default rarity
                    layerName: layers.find(l => l.id === activeLayerId)?.name || '',
                    characterId: activeCharacterId
                };
            }));

            // Update layers with new traits
            const updatedLayers = layers.map(layer => {
                if (layer.id === activeLayerId) {
                    return {
                        ...layer,
                        traits: [...layer.traits, ...newTraits],
                        characterId: activeCharacterId
                    };
                }
                return layer;
            });

            // Update state and notify parent
            setLayers(updatedLayers);
            if (onLayersUpdate) {
                onLayersUpdate(updatedLayers, globalRules);
            }
        }
    };

    

    const handleLayerClick = (layerId: string) => {
        setActiveLayerId(layerId);
    };

    const updateLayerDescription = (layerId: string, description: string) => {
        setLayers(prev =>
            prev.map(layer =>
                layer.id === layerId ? { ...layer, description } : layer
            )
        );
    };

    const updateLayerMaxTraits = (layerId: string, maxTraits: number) => {
        setLayers(prev =>
            prev.map(layer =>
                layer.id === layerId ? { ...layer, maxTraits } : layer
            )
        );
    };

    

    // Helper function to check if a trait is valid based on rules
    const isTraitValid = (
        trait: LibTrait, 
        layerId: string, 
        preview: Record<string, LibTrait>,
        globalRules: Rule[]
    ): boolean => {
        // Get all rules that involve this trait's layer
        const relevantRules = globalRules.filter(rule => 
            (rule.sourceLayerId === layerId && rule.sourceTrait === trait.name) ||
            (rule.targetLayerId === layerId && rule.targetTrait === trait.name)
        );

        // If no rules, trait is valid
        if (relevantRules.length === 0) return true;

        // Check each rule
        for (const rule of relevantRules) {
            if (rule.sourceLayerId === layerId && rule.sourceTrait === trait.name) {
                // This trait is the source
                const targetTrait = preview[rule.targetLayerId];
                
                if (rule.type === 'require') {
                    if (!targetTrait || targetTrait.name !== rule.targetTrait) return false;
                } else if (rule.type === 'exclude') {
                    if (targetTrait && targetTrait.name === rule.targetTrait) return false;
                }
            } else {
                // This trait is the target
                const sourceTrait = preview[rule.sourceLayerId];
                
                if (rule.type === 'require') {
                    if (sourceTrait && trait.name !== rule.targetTrait) return false;
                } else if (rule.type === 'exclude') {
                    if (sourceTrait && sourceTrait.name === rule.sourceTrait) return false;
                }
            }
        }

        return true;
    };

    const generateRandomPreview = useCallback(() => {
        const preview: Record<string, LibTrait> = {};
        
        layers.forEach(layer => {
            // Simple inline validation that allows all traits
            const validTraits = layer.traits.filter(trait => {
                // If no rules, all traits are valid
                if (globalRules.length === 0) return true;
                
                // Get rules relevant to this layer and trait
                const relevantRules = globalRules.filter(rule => 
                    (rule.sourceLayerId === layer.id && rule.sourceTrait === trait.name) ||
                    (rule.targetLayerId === layer.id && rule.targetTrait === trait.name)
                );
                
                // If no relevant rules, trait is valid
                if (relevantRules.length === 0) return true;
                
                // Check each rule
                for (const rule of relevantRules) {
                    if (rule.sourceLayerId === layer.id && rule.sourceTrait === trait.name) {
                        // This trait is the source
                        const targetTrait = preview[rule.targetLayerId];
                        
                        if (rule.type === 'require') {
                            if (!targetTrait || targetTrait.name !== rule.targetTrait) return false;
                        } else if (rule.type === 'exclude') {
                            if (targetTrait && targetTrait.name === rule.targetTrait) return false;
                        }
                    } else {
                        // This trait is the target
                        const sourceTrait = preview[rule.sourceLayerId];
                        
                        if (rule.type === 'require') {
                            if (sourceTrait && trait.name !== rule.targetTrait) return false;
                        } else if (rule.type === 'exclude') {
                            if (sourceTrait && sourceTrait.name === rule.sourceTrait) return false;
                        }
                    }
                }
                
                return true;
            });
            
            if (validTraits.length > 0) {
                const randomTrait = validTraits[Math.floor(Math.random() * validTraits.length)];
                preview[layer.id] = randomTrait;
            }
        });
        
        return preview;
    }, [layers, globalRules]);

    const generatePreviews = useCallback(() => {
        const validCombinations: Record<string, LibTrait>[] = [];
        const maxAttempts = 100;
        let attempts = 0;

        while (validCombinations.length < 5 && attempts < maxAttempts) {
            attempts++;
            const combination: Record<string, LibTrait> = {};
            let isValid = true;
            
            // Always include background first if it exists
            const backgroundLayer = layers.find(l => l.isBackground);
            if (backgroundLayer?.traits.length) {
                const randomTrait = backgroundLayer.traits[Math.floor(Math.random() * backgroundLayer.traits.length)];
                combination[backgroundLayer.id] = randomTrait;
            }

            // Process other layers
            for (const layer of layers.filter(l => !l.isBackground)) {
                if (!layer.traits.length) continue;
                
                const randomTrait = layer.traits[Math.floor(Math.random() * layer.traits.length)];
                combination[layer.id] = randomTrait;
            }

            // Add combination if it's valid and not a duplicate
            if (Object.keys(combination).length > 0) {
                const combinationString = JSON.stringify(combination);
                if (!validCombinations.some(c => JSON.stringify(c) === combinationString)) {
                    validCombinations.push(combination);
                }
            }
        }


        setPreviewCombinations(prev => {
            const prevJson = JSON.stringify(prev);
            const newJson = JSON.stringify(validCombinations);
            return prevJson === newJson ? prev : validCombinations;
        });
        
        setPreviewStripKey(prev => prev + 1);
    }, [layers]);

    const generateMetadata = useCallback((selectedTraits: Record<string, Trait>) => {
        const metadata = {
            name: '', // Your NFT name logic
            description: '', // Your NFT description logic
            attributes: [] as Array<{ trait_type: string; value: string }>
        };

        layers.forEach(layer => {
            const trait = selectedTraits[layer.id];
            // Only include traits from layers that are set to show in metadata
            if (trait && layer.showInMetadata) {
                metadata.attributes.push({
                    trait_type: layer.displayName || layer.name,
                    value: trait.name
                });
            }
        });

        return metadata;
    }, [layers]);

    const updateGlobalRules = (rules: Rule[]) => {
        setGlobalRules(rules);
        // You might want to pass this to parent component if needed
        // onLayersUpdate(layers);
    };

    const handleUpdateRule = (ruleId: string, updates: { type: string }) => {
        const updatedRules = globalRules.map(rule => {
            if (rule.id === ruleId) {
                return {
                    ...rule,
                    ...updates
                };
            }
            return rule;
        });
        
        updateGlobalRules(updatedRules as Rule[]);
    };

    

    // Function to handle layer selection
    const handleLayerSelect = (layerId: string) => {
        setActiveLayerId(layerId);
    };

    // Handle file upload for traits
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, layerId: string) => {
        if (!event.target.files || !layerId) return;

        try {
            const files = Array.from(event.target.files);
            const layerIndex = layers.findIndex(l => l.id === layerId);
            
            if (layerIndex === -1) {
                throw new Error('Layer not found');
            }

            // Create new traits from uploaded files
            const newTraits = await Promise.all(
                files.map(async (file) => {
                    try {
                        const preview = await createImagePreview(file);
                        const layer = layers.find(l => l.id === layerId);
                        if (!layer) {
                            throw new Error('Layer not found');
                        }
                        
                        const trait: Trait = {
                            id: `trait-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            name: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
                            layerName: layer.name,
                            image: preview,
                            preview: preview,
                            rarity: 1, // Default rarity
                            zIndex: layer.order || 0,
                            characterId: layer.characterId
                        };
                        return trait;
                    } catch (error) {
                        console.error('Error processing file:', file.name, error);
                        throw error;
                    }
                })
            );
            
            if (newTraits.length === 0) {
                throw new Error('No valid traits were created');
            }

            // Update the layer with new traits
            setLayers(prevLayers => {
                const updatedLayers = [...prevLayers];
                const updatedLayer = {
                    ...updatedLayers[layerIndex],
                    traits: [
                        ...(updatedLayers[layerIndex].traits || []),
                        ...newTraits
                    ]
                };
                updatedLayers[layerIndex] = updatedLayer;
                return updatedLayers;
            });

            // Clear the input
            event.target.value = '';
            
            // Show success message
            toast.success(`Successfully added ${newTraits.length} trait(s) to layer`);
            
        } catch (error) {
            console.error('File upload failed:', error);
            setError('Failed to upload files. Please try again.');
            toast.error('Failed to upload files');
        }
    };

    // Helper function to create image previews
    const createImagePreview = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    resolve(e.target.result as string);
                } else {
                    reject(new Error('Failed to create preview'));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // Create a stable reference to the layers and rules
    const layersRef = useRef(layers);
    const rulesRef = useRef(globalRules);
    const updateInProgressRef = useRef(false);
    
    // Memoize the update function to prevent unnecessary re-renders
    const updateLayers = useCallback(async () => {
        if (!onLayersUpdate || updateInProgressRef.current) return;
        
        updateInProgressRef.current = true;
        const currentLayers = [...layersRef.current];
        const currentRules = [...(Array.isArray(rulesRef.current) ? rulesRef.current : [])];
        
        try {
            await Promise.resolve(onLayersUpdate(currentLayers, currentRules));
            setError(null);
        } catch (error) {
            console.error('TraitUploader: Error in layer update:', {
                error,
                layers: currentLayers?.length,
                globalRules: currentRules?.length
            });
            
            const errorMessage = error instanceof Error ? error.message : 'Failed to update layers';
            setError(errorMessage);
            toast.error(`Error: ${errorMessage}`);
        } finally {
            updateInProgressRef.current = false;
        }
    }, [onLayersUpdate]);
    
    // Update refs when layers or rules change
    useEffect(() => {
        layersRef.current = layers;
        rulesRef.current = globalRules;
    }, [layers, globalRules]);
    
    // Set up a debounced update effect
    useEffect(() => {
        if (!onLayersUpdate) return;
        
        const timer = setTimeout(() => {
            updateLayers().catch(console.error);
        }, 100); // Small debounce to prevent rapid updates
        
        return () => clearTimeout(timer);
    }, [onLayersUpdate, updateLayers, JSON.stringify(layers), JSON.stringify(globalRules)]);

    // Add validation function inside the component
    

    

    // Add validation when adding new traits
    const handleAddTrait = (layerId: string, files: File[]) => {
        const layer = layers.find(l => l.id === layerId);
        if (!layer) return;

        Promise.all(files.map(async file => {
            const baseName = file.name.replace(/\.[^/.]+$/, "");
            let traitName = baseName;
            let counter = 1;

            while (!validateTraitName(layerId, traitName)) {
                traitName = `${baseName} ${counter}`;
                counter++;
            }

            const preview = await createImagePreview(file);
            return {
                id: `id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                name: traitName,
                preview,
                // Initialize rarity based on layer's rarity type
                rarity: layer.rarityType === 'percent' ? 100 : 1,
                weight: layer.rarityType === 'weight' ? 1 : undefined,
                file,
                layerName: layer.name,
                characterId: layer.characterId
            };
        })).then(newTraits => {
            setLayers(prev => prev.map(layer => {
                if (layer.id === layerId) {
                    return {
                        ...layer,
                        traits: [...layer.traits, ...newTraits]
                    };
                }
                return layer;
            }) as TraitLayer[]);
        });
    };

    // Move generateUniqueLayerName inside component
    const generateUniqueLayerName = useCallback((baseName: string): string => {
        let counter = 1;
        let newName = `${baseName} Copy`;
        
        // Keep adding numbers until we find a unique name
        while (layers.some(layer => layer.name === newName)) {
            counter++;
            newName = `${baseName} Copy ${counter}`;
        }
        return newName;
    }, [layers]);

    // Update handleDuplicateLayer to use the function
    const handleDuplicateLayer = useCallback((layerId: string) => {
        const sourceLayer = layers.find(l => l.id === layerId);
        if (!sourceLayer) return;
        
        // Prevent duplicating the background layer
        if (sourceLayer.isDefaultBackground) {
            toast.error('Cannot duplicate the background layer');
            return;
        }
        
        const newLayerName = generateUniqueLayerName(sourceLayer.name);
        if (!validateLayerName(newLayerName, layers)) {
            toast.error('Failed to generate unique layer name');
            return;
        }
        
        const newLayer: TraitLayer = {
            id: `layer-${Date.now()}`,
            name: newLayerName,
            displayName: newLayerName,
            traits: sourceLayer.traits.map(trait => ({
                ...trait,
                id: `trait-${Date.now()}-${Math.random()}`
            })),
            required: sourceLayer.required,
            order: layers.filter(l => l.characterId === activeCharacterId).length + 1,
            characterId: activeCharacterId,
            showInMetadata: true
        };
        
        setLayers(prev => [...prev, newLayer]);
        toast.success('Layer duplicated successfully');
    }, [layers, generateUniqueLayerName, activeCharacterId]);

    // Add function to validate trait names
    const validateTraitName = useCallback((layerId: string, newName: string, currentTraitId?: string): boolean => {
        const layer = layers.find(l => l.id === layerId);
        if (!layer) return true;
        
        // Check if name is empty or only whitespace
        if (!newName.trim()) return false;
        
        return !layer.traits.some(trait => 
            trait.name.toLowerCase() === newName.toLowerCase() && 
            (!currentTraitId || trait.id !== currentTraitId)
        );
    }, [layers]);

    // Add missing handler functions
    const handleTraitRarityChange = useCallback((layerId: string, traitId: string, value: number) => {
        updateTraitRarity(layerId, traitId, value);
    }, []);

    const handleDeleteTrait = useCallback((layerId: string, traitId: string) => {
        removeTrait(layerId, traitId);
    }, []);

    const handleTraitNameChange = useCallback((layerId: string, traitId: string, newName: string) => {
        updateTraitName(layerId, traitId, newName);
    }, []);

    const handleNext = useCallback(() => {
        const validation = validateLayers(layers);
        if (!validation.isValid) {
            setError(validation.message || 'Please fix the issues before proceeding');
            return;
        }
        onNext();
    }, [layers, onNext]);

    // Add cleanup function
    const cleanupStoredLayerData = useCallback(() => {
        localStorage.removeItem('nft_layers_data');
    }, []);

    // Add cleanup effect
    useEffect(() => {
        return () => {
            cleanupStoredLayerData();
        };
    }, [cleanupStoredLayerData]);

    // Update the layer update function to handle cleanup
    const handleLayersUpdate = useCallback((updatedLayers: TraitLayer[]) => {
        setLayers(updatedLayers);
        onLayersUpdate(updatedLayers, globalRules);
        
        // Store updated data
        try {
            localStorage.setItem('nft_layers_data', JSON.stringify({
                layers: updatedLayers,
                rules: globalRules,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('Failed to save layer data:', error);
            // If storage fails, clean up
            cleanupStoredLayerData();
        }
    }, [onLayersUpdate, globalRules, cleanupStoredLayerData]);

    // Add these new functions
    const handleDeleteTrait = useCallback((layerId: string, traitId: string) => {
        setLayers(prevLayers => prevLayers.map(layer => {
            if (layer.id === layerId) {
                return {
                    ...layer,
                    traits: layer.traits.filter(trait => trait.id !== traitId)
                };
            }
            return layer;
        }));

        // Clean up any rules involving this trait
        const updatedRules = globalRules.filter(rule => 
            !(rule.sourceLayerId === layerId && rule.sourceTrait === traitId) &&
            !(rule.targetLayerId === layerId && rule.targetTrait === traitId)
        );
        
        if (updatedRules.length !== globalRules.length) {
            setGlobalRules(updatedRules);
        }

        // Notify parent component
        if (onLayersUpdate) {
            const updatedLayers = layers.map(layer => {
                if (layer.id === layerId) {
                    return {
                        ...layer,
                        traits: layer.traits.filter(trait => trait.id !== traitId)
                    };
                }
                return layer;
            });
            onLayersUpdate(updatedLayers, updatedRules);
        }

        toast.success('Trait deleted successfully');
    }, [layers, globalRules, onLayersUpdate]);

    const handleTraitRarityChange = useCallback((layerId: string, traitId: string, value: number) => {
        setLayers(prevLayers => prevLayers.map(layer => {
            if (layer.id === layerId) {
                return {
                    ...layer,
                    traits: layer.traits.map(trait => {
                        if (trait.id === traitId) {
                            return { ...trait, rarity: value };
                        }
                        return trait;
                    })
                };
            }
            return layer;
        }));
        
        // Notify parent component of the change
        if (onLayersUpdate) {
            const updatedLayers = layers.map(layer => {
                if (layer.id === layerId) {
                    return {
                        ...layer,
                        traits: layer.traits.map(trait => {
                            if (trait.id === traitId) {
                                return { ...trait, rarity: value };
                            }
                            return trait;
                        })
                    };
                }
                return layer;
            });
            onLayersUpdate(updatedLayers, globalRules);
        }
    }, [layers, globalRules, onLayersUpdate]);

    // Add this function to handle layer ordering
    const reorderLayers = useCallback((layers: Layer[]) => {
        return layers.map((layer, index) => ({
            ...layer,
            order: layer.isBackground ? 0 : index + 1
        }));
    }, []);

    const validateLayers = useCallback(() => {
        const errors: string[] = [];
        const layerNames = new Set<string>();
        
        // Check if background layer exists and has traits
        const backgroundLayer = layers.find(l => 
            l.isDefaultBackground === true || l.isBackground === true
        );
        
        if (!backgroundLayer) {
            errors.push('Background layer is required');
        } else if (!backgroundLayer.traits || backgroundLayer.traits.length === 0) {
            errors.push('Background layer must have at least one trait');
        }
        
        // Check all layers for validation issues
        layers.forEach(layer => {
            // Check for duplicate layer names (excluding background layer)
            if (layer.isDefaultBackground !== true) {
                const lowerName = layer.name.toLowerCase();
                if (layerNames.has(lowerName)) {
                    errors.push(`Duplicate layer name: ${layer.name}`);
                } else {
                    layerNames.add(lowerName);
                }
            }
            
            // Check if non-background layers have traits
            if (layer.isDefaultBackground !== true && (!layer.traits || layer.traits.length === 0)) {
                errors.push(`Layer ${layer.name || layer.id} must have at least one trait`);
            }
        });
        
        if (errors.length) {
            toast.error(errors[0]);
            return false;
        }
        
        return true;
    }, [layers]);

    // Update the onNext handler
    const handleNext = () => {
        if (!validateLayers()) {
            toast.error('Please check your layers configuration');
            return;
        }
        onNext();
    };

    // Add these layer movement functions
    const moveLayerUp = useCallback((layerId: string) => {
        setLayers(prevLayers => {
            const index = prevLayers.findIndex(layer => layer.id === layerId);
            // Don't move if it's the background layer or already at top (after background)
            if (index <= 1 || prevLayers[index]?.isBackground === true) return prevLayers;
            
            const newLayers = [...prevLayers];
            [newLayers[index], newLayers[index - 1]] = [newLayers[index - 1], newLayers[index]];
            
            // Update order for all layers
            return newLayers.map((layer, idx) => ({
                ...layer,
                order: (layer?.isBackground === true) ? 0 : idx
            }));
        });
    }, []);

    const moveLayerDown = useCallback((layerId: string) => {
        setLayers(prevLayers => {
            const index = prevLayers.findIndex(layer => layer.id === layerId);
            // Don't move if it's the last layer or background layer
            if (index === prevLayers.length - 1 || prevLayers[index]?.isBackground === true) return prevLayers;
            
            const newLayers = [...prevLayers];
            [newLayers[index], newLayers[index + 1]] = [newLayers[index + 1], newLayers[index]];
            return reorderLayers(newLayers);
        });
    }, [reorderLayers]);

    // Add this helper function
    const validateLayerName = (name: string, layers: Layer[], currentLayerId?: string): boolean => {
        // Allow empty names (will be caught by final validation)
        if (!name) return true;
        
        // Only check for duplicates if name is not empty
        return !layers.some(layer => 
            layer.name.toLowerCase() === name.toLowerCase() && 
            (!currentLayerId || layer.id !== currentLayerId)
        );
    };

    // Character management functions
    const addCharacter = () => {
        if (!newCharacter.name.trim()) {
            setError('Character name cannot be empty');
            return;
        }

        const newCharacterId = `character-${Date.now()}`;
        const character: Character = {
            ...newCharacter,
            id: newCharacterId,
            layers: []
        };

        setCharacters(prev => [...prev, character]);
        setActiveCharacterId(newCharacterId);
        setIsAddingCharacter(false);
        setNewCharacter(getDefaultCharacter());
    };

    const updateCharacter = (characterId: string, updates: Partial<Character>) => {
        setCharacters(prev => prev.map(character => {
            if (character.id === characterId) {
                return { ...character, ...updates };
            }
            return character;
        }));
    };

    const deleteCharacter = (characterId: string) => {
        // Don't allow deleting the default character
        if (characterId === DEFAULT_CHARACTER.id) {
            toast.error('Cannot delete the default collection');
            return;
        }
        
        // Remove character and its layers
        setCharacters(prev => prev.filter(c => c.id !== characterId));
        setLayers(prev => prev.filter(l => l.characterId !== characterId));
        
        // Switch to default character
        setActiveCharacterId(characters.find(c => c.id !== characterId)?.id || DEFAULT_CHARACTER.id);
    };

    // Add the handleAddLayer function
    const handleAddLayer = () => {
        if (!newLayerName.trim()) {
            setError('Layer name cannot be empty');
            return;
        }

        if (layers.some(layer => layer.name.toLowerCase() === newLayerName.toLowerCase() && 
                                 layer.characterId === activeCharacterId)) {
            setError('Layer with this name already exists for this character');
            return;
        }

        const newLayer: TraitLayer = {
            id: `layer-${Date.now()}`,
            name: newLayerName,
            displayName: newLayerName,
            traits: [],
            required: true,
            order: layers.filter(l => l.characterId === activeCharacterId).length,
            characterId: activeCharacterId
        };

        // Add to layers and to the character
        const updatedLayers = [...layers, newLayer];
        setLayers(updatedLayers);
        
        // Also update the character's layers
        const character = characters.find(c => c.id === activeCharacterId);
        if (character) {
            updateCharacter(activeCharacterId, {
                layers: [...updatedLayers.filter(l => l.characterId === activeCharacterId)]
            });
        }

        // Close the form and reset the input
        setIsAddLayerOpen(false);
        setNewLayerName('');
        setError('');
        
        // Set this as the active layer
        setActiveLayerId(newLayer.id);
    };

    // Get current character info
    const currentCharacter = characters.find(c => c.id === activeCharacterId);

    // Add function to handle adding a new character
    const handleAddCharacter = () => {
        if (!newCharacter.name) return;
        
        const newCharacterId = `id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const character: Character = {
            ...newCharacter,
            id: newCharacterId,
            layers: []
        };

        setCharacters(prev => [...prev, character]);
        setActiveCharacterId(newCharacterId);
        setIsAddingCharacter(false);
        setNewCharacter({
            name: 'New Character Type',
            description: '',
            supply: 0,
            layers: [],
            imagePreview: ''
        });
    };

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                {/* Guide information */}
                <div className={styles.guideContainer}>
                    <div className={styles.guideHeader}>
                        <h2>Trait Manager</h2>
                        <button 
                            className={styles.guideButton}
                            onClick={() => setShowGuide(prevState => !prevState)}
                        >
                            {showGuide ? 'Hide Guide' : 'Show Guide'}
                        </button>
                    </div>
                    
                    {showGuide && (
                        <div className={styles.guideContent}>
                            <div className={styles.guideSection}>
                                <h3>Character Types (Optional)</h3>
                                <p>
                                    Character types allow you to organize your NFT collection into different categories.
                                    Each character type can have its own unique layers and traits, with individual supply settings.
                                </p>
                                <p>
                                    <strong>This feature is completely optional</strong> - if you don't need different character types, 
                                    you can simply use the default character type provided.
                                </p>
                            </div>
                            
                            <div className={styles.guideSection}>
                                <h3>Layers & Traits</h3>
                                <p>
                                    Layers represent categories like "Background", "Body", "Eyes", etc. Each layer 
                                    can contain multiple trait images that will be randomly selected during generation.
                                </p>
                                <p>
                                    Tip: Organize your layers in the order you want them rendered, with background 
                                    layers at the top and foreground layers at the bottom.
                                </p>
                            </div>
                            
                            <div className={styles.guideSection}>
                                <h3>Quick Start</h3>
                                <ol>
                                    <li>Create layers for each part of your NFT (Background, Body, Eyes, etc.)</li>
                                    <li>Upload trait images to each layer</li>
                                    <li>Adjust rarity settings if needed</li>
                                    <li>Create rules between traits if needed (optional)</li>
                                    <li>Preview your combinations</li>
                                </ol>
                            </div>
                        </div>
                    )}
                </div>

                {/* Character dropdown and selector */}
                <div className={styles.charactersHeader}>
                    <h3>
                        Character Types
                        <span className={styles.optionalFeature}>Optional</span>
                    </h3>
                    
                    <div className={styles.characterDropdownContainer}>
                        <select 
                            className={styles.characterDropdown}
                            value={activeCharacterId}
                            onChange={(e) => setActiveCharacterId(e.target.value)}
                            title="Select a character type. This feature is optional - you can use just one character type for your entire collection."
                        >
                            {characters.map(character => (
                                <option key={character.id} value={character.id}>
                                    {character.name}
                                </option>
                            ))}
                        </select>
                        
                        {activeCharacterId && characters.length > 1 && (
                            <button 
                                className={styles.deleteCharacterButton}
                                onClick={() => {
                                    if (window.confirm(`Are you sure you want to delete the "${currentCharacter?.name}" character type?`)) {
                                        deleteCharacter(activeCharacterId);
                                    }
                                }}
                                title="Delete this character type"
                            >
                                <FaTrash />
                            </button>
                        )}
                    </div>
                    
                    <button 
                        className={styles.addCharacterButton} 
                        onClick={() => setIsAddingCharacter(true)}
                        title="Add a new character type"
                    >
                        <FaPlus /> Add Type
                    </button>
                </div>

                {/* Add Character Modal */}
                {isAddingCharacter && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <h3>Add New Character Type</h3>
                            <p className={styles.modalDescription}>
                                Create a new character type to organize traits for a distinct type of NFT in your collection.
                                Each character type can have its own unique layers and traits.
                            </p>
                            <input
                                type="text"
                                placeholder="Character Type Name"
                                value={newCharacter.name}
                                onChange={(e) => setNewCharacter({...newCharacter, name: e.target.value})}
                                className={styles.input}
                                autoFocus
                            />
                            <textarea
                                placeholder="Description (optional)"
                                value={newCharacter.description}
                                onChange={(e) => setNewCharacter({...newCharacter, description: e.target.value})}
                                className={styles.textarea}
                            />
                            <div className={styles.modalButtons}>
                                <button 
                                    className={styles.cancelButton}
                                    onClick={() => {
                                        setIsAddingCharacter(false);
                                        setNewCharacter({
                                            name: 'New Character Type',
                                            description: '',
                                            supply: 0,
                                            layers: [],
                                            imagePreview: ''
                                        });
                                    }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className={styles.addButton}
                                    onClick={handleAddCharacter}
                                    disabled={!newCharacter.name}
                                >
                                    Add Character Type
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Layers panel */}
                <div className={styles.layersPanel}>
                    <div className={styles.sidebar}>
                        <div className={styles.layersHeader}>
                            <h3>Layers</h3>
                            <button 
                                className={styles.addLayerButton}
                                onClick={() => setIsAddLayerOpen(true)}
                                title="Add a new layer like Background, Body, Eyes, etc."
                            >
                                <Plus size={14} />
                                Add Layer
                            </button>
                        </div>
                        
                        {/* Layer help text */}
                        <div className={styles.layerHelpText}>
                            <p>Layers determine how your NFT is structured. Add layers in order from background to foreground.</p>
                        </div>
                        
                        {/* Layer Add Form */}
                        {isAddLayerOpen && (
                            <div className={styles.layerForm}>
                                <input
                                    type="text"
                                    placeholder="Layer Name (e.g. Background, Body, Eyes)"
                                    value={newLayerName}
                                    onChange={(e) => setNewLayerName(e.target.value)}
                                    className={styles.input}
                                    autoFocus
                                />
                                <div className={styles.formActions}>
                                    <button 
                                        className={styles.cancelButton}
                                        onClick={() => setIsAddLayerOpen(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        className={styles.saveButton}
                                        onClick={addLayer}
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        <div className={styles.layersList}>
                            <DragDropContext onDragEnd={handleDragEnd}>
                                <Droppable droppableId="layers-list">
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={`${styles.droppableContainer} ${snapshot.isDraggingOver ? styles.isDraggingOver : ''}`}
                                        >
                                            {layers
                                                .filter(layer => layer.characterId === activeCharacterId)
                                                .sort((a, b) => (a.order || 0) - (b.order || 0))
                                                .map((layer, index) => (
                                                    <Draggable key={layer.id} draggableId={layer.id} index={index} isDragDisabled={layer.isBackground}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                className={`${styles.layerCard} ${layer.id === activeLayerId ? styles.active : ''} ${snapshot.isDragging ? styles.isDragging : ''}`}
                                                                onClick={() => handleLayerSelect(layer.id)}
                                                            >
                                                                <div className={styles.layerCardContent}>
                                                                    <div className={styles.layerCardHeader}>
                                                                        <div className={styles.layerCardLeft}>
                                                                            <div {...provided.dragHandleProps} className={styles.dragHandle}>
                                                                                <GripVertical size={16} />
                                                                            </div>
                                                                            <input
                                                                                type="text"
                                                                                value={layer.name}
                                                                                onChange={(e) => updateLayerName(layer.id, e.target.value)}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                className={styles.layerName}
                                                                                placeholder="Layer name"
                                                                            />
                                                                        </div>
                                                                        
                                                                        <div className={styles.layerCardActions}>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setShowSettings(layer.id);
                                                                                }}
                                                                                className={styles.actionButton}
                                                                                title="Layer Settings"
                                                                            >
                                                                                <Settings size={14} />
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    duplicateLayer(layer.id);
                                                                                }}
                                                                                className={styles.actionButton}
                                                                                title="Duplicate Layer"
                                                                            >
                                                                                <Copy size={14} />
                                                                            </button>
                                                                            <button
                                                                                className={`${styles.actionButton} ${styles.deleteButton}`}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation(); // Prevent layer selection when deleting
                                                                                    removeLayer(layer.id);
                                                                                    // If this was the active layer, clear the selection
                                                                                    if (activeLayerId === layer.id) {
                                                                                        setActiveLayerId('');
                                                                                    }
                                                                                    // If settings were open for this layer, close them
                                                                                    if (showSettings === layer.id) {
                                                                                        setShowSettings(null);
                                                                                    }
                                                                                }}
                                                                                title="Delete layer"
                                                                            >
                                                                                <Trash2 size={16} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    <div className={styles.layerCardStats}>
                                                                        <div className={styles.statBadge}>
                                                                            <span className={styles.statLabel}>Traits:</span>
                                                                            <span className={styles.statValue}>{layer.traits.length}</span>
                                                                        </div>
                                                                        <div className={styles.statBadge}>
                                                                            <span className={styles.statLabel}>Rarity:</span>
                                                                            <span className={styles.statValue}>{layer.layerRarity}%</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </DragDropContext>
                            
                            {/* Empty state message */}
                            {layers.filter(layer => layer.characterId === activeCharacterId).length === 0 && (
                                <div className={styles.emptyLayersMessage}>
                                    <AlertCircle size={24} />
                                    <h4>No Layers Yet</h4>
                                    <p>Click the "Add Layer" button to create your first layer.</p>
                                    <p>Start with layers like:</p>
                                    <ul>
                                        <li>Background</li>
                                        <li>Body</li>
                                        <li>Head</li>
                                        <li>Eyes</li>
                                        <li>Mouth</li>
                                        <li>Accessories</li>
                                    </ul>
                                    <button 
                                        className={styles.addLayerButton}
                                        onClick={() => setIsAddLayerOpen(true)}
                                    >
                                        <Plus size={14} />
                                        Add Your First Layer
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className={styles.mainContent}>
                        <div className={styles.mainHeader}>
                            <div className={styles.headerLeft}>
                                {activeLayerId && (
                                    <input
                                        type="text"
                                        value={layers.find(layer => layer.id === activeLayerId)?.name || ''}
                                        onChange={(e) => updateLayerName(activeLayerId, e.target.value)}
                                        className={styles.layerTitleInput}
                                        placeholder="Layer name"
                                    />
                                )}
                            </div>
                            <div className={styles.headerActions}>
                                <button 
                                    onClick={() => setShowPreviewStrip(!showPreviewStrip)}
                                    className={`${styles.headerButton} ${showPreviewStrip ? styles.active : ''}`}
                                    title="Quick Preview"
                                >
                                    <Eye size={16} />
                                    <span>Preview</span>
                                    {showPreviewStrip ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                                {activeLayerId && (
                                    <>
                                        <button
                                            onClick={() => setShowSettings(activeLayerId)}
                                            className={styles.headerButton}
                                        >
                                            <Settings size={16} />
                                            <span>Settings</span>
                                        </button>
                                        <button 
                                            onClick={() => setShowUploadSection(!showUploadSection)}
                                            className={`${styles.headerButton} ${showUploadSection ? styles.active : ''}`}
                                        >
                                            <ChevronDown 
                                                size={16} 
                                                className={`${styles.dropdownIcon} ${showUploadSection ? styles.active : ''}`} 
                                            />
                                            <span>Add Trait</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        
                        {showPreviewStrip && (
                            <div className={styles.previewStrip}>
                                <div className={styles.previewImages}>
                                    {previewCombinations.map((combination, i) => (
                                        <div key={`${i}-${previewStripKey}`} className={styles.previewItem}>
                                            {Object.entries(combination).map(([layerId, trait], index) => (
                                                <img 
                                                    key={`${layerId}-${index}`}
                                                    src={trait.preview}
                                                    alt={trait.name}
                                                    className={styles.previewLayer}
                                                    style={{ zIndex: index }}
                                                />
                                            ))}
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    onClick={generatePreviews}
                                    className={styles.refreshStripButton}
                                >
                                    <RefreshCw size={14} />
                                </button>
                            </div>
                        )}

                        {activeLayerId ? (
                            <>
                                {showUploadSection && (
                                    <div className={`${styles.uploadSection} ${styles.slideDown}`}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={(e) => handleFileUpload(e, activeLayerId)}
                                            style={{ display: 'none' }}
                                            id={`file-input-${activeLayerId}`}
                                        />
                                        <label 
                                            htmlFor={`file-input-${activeLayerId}`}
                                            className={styles.dropzone}
                                        >
                                            <Upload size={24} />
                                            <p>Click or drag images here to upload</p>
                                            <span>Supports PNG, JPG, GIF (max 5MB)</span>
                                        </label>
                                    </div>
                                )}
                                <div className={styles.traitsGrid}>
                                    {layers.find(layer => layer.id === activeLayerId)?.traits.map(trait => (
                                        <TraitCard
                                            key={trait.id}
                                            trait={trait}
                                            layerId={activeLayerId}
                                            onRarityChange={handleTraitRarityChange}
                                            onDelete={handleDeleteTrait}
                                            onNameChange={handleTraitNameChange}
                                        />
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className={styles.noLayerSelected}>
                                <h2>Select a layer to manage traits</h2>
                                <p>Or create a new layer to get started</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Navigation */}
            {!hideNavigation && (
                <div className={styles.actions}>
                    <button onClick={onBack} className={styles.backButton}>
                        <ArrowLeft size={16} />
                        Back
                    </button>
                    
                    <button
                        onClick={handleNext}
                        disabled={layers.length === 0 || characters.some(c => 
                            layers.filter(l => l.characterId === c.id).length === 0 ||
                            layers.filter(l => l.characterId === c.id).some(l => l.traits.length === 0)
                        )}
                        className={styles.nextButton}
                    >
                        Next
                        <ArrowRight size={16} />
                    </button>
                </div>
            )}
            
            {/* Modals */}
            {showSettings && (
                <LayerSettings 
                    layerId={showSettings}
                    layers={layers}
                    updateLayerSetting={updateLayerSetting}
                    setShowSettings={setShowSettings}
                    globalRules={globalRules}
                    updateGlobalRules={updateGlobalRules}
                />
            )}

            {editingRule && editingTraitType && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Select New Trait</h3>
                            <button 
                                className={styles.closeButton}
                                onClick={() => {
                                    setEditingRule(null);
                                    setEditingTraitType(null);
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className={styles.traitSelectBox}>
                            {layers.map(layer => (
                                layer.traits.map(trait => (
                                    <div
                                        key={trait.id}
                                        className={styles.traitOption}
                                        onClick={() => {
                                            handleUpdateRule(editingRule, {
                                                [`${editingTraitType}LayerId`]: layer.id,
                                                [`${editingTraitType}Trait`]: trait.id,
                                                type: ''
                                            });
                                        }}
                                    >
                                        <img src={trait.preview} alt={trait.name} />
                                        <span>{trait.name}</span>
                                        <small className={styles.layerName}>{layer.name}</small>
                                    </div>
                                ))
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TraitUploader;
