import React, { useState, useEffect } from 'react';
import { Plus, X, Edit, Trash2, ArrowLeft, ArrowRight, Layers, Info } from 'lucide-react';
import { Character, TraitLayer } from '@/lib/types';
import styles from '@/styles/components/collection/CharacterManager.module.css';
import TraitUploader from './TraitUploader';

interface CharacterManagerProps {
    initialCharacters?: Character[];
    onBack: () => void;
    onNext: () => void;
    onCharactersUpdate: (characters: Character[]) => void;
}

const DEFAULT_CHARACTER: Omit<Character, 'id'> = {
    name: 'New Character',
    description: 'A new character type for your collection',
    supply: 10,
    layers: []
};

const CharacterManager: React.FC<CharacterManagerProps> = ({
    initialCharacters = [],
    onBack,
    onNext,
    onCharactersUpdate
}) => {
    const [characters, setCharacters] = useState<Character[]>(initialCharacters.length > 0 ? initialCharacters : []);
    const [activeCharacterId, setActiveCharacterId] = useState<string | null>(initialCharacters[0]?.id || null);
    const [isAddingCharacter, setIsAddingCharacter] = useState(false);
    const [newCharacter, setNewCharacter] = useState<Omit<Character, 'id'>>(DEFAULT_CHARACTER);
    const [isEditingCharacter, setIsEditingCharacter] = useState<string | null>(null);
    const [characterToDelete, setCharacterToDelete] = useState<string | null>(null);

    useEffect(() => {
        // Load characters from localStorage if available
        const savedCharacters = localStorage.getItem('nft_characters');
        if (savedCharacters && !initialCharacters.length) {
            try {
                const parsed = JSON.parse(savedCharacters);
                setCharacters(parsed);
                if (parsed.length > 0) {
                    setActiveCharacterId(parsed[0].id);
                }
            } catch (e) {
                console.error('Failed to parse saved characters:', e);
            }
        }
    }, [initialCharacters]);

    useEffect(() => {
        // Save characters to localStorage whenever they change
        if (characters.length > 0) {
            localStorage.setItem('nft_characters', JSON.stringify(characters));
            onCharactersUpdate(characters);
        }
    }, [characters, onCharactersUpdate]);

    const addCharacter = () => {
        if (!newCharacter.name.trim()) {
            alert('Character name cannot be empty');
            return;
        }

        const newCharacterId = `character-${Date.now()}`;
        const character: Character = {
            ...newCharacter,
            id: newCharacterId,
            layers: []
        };

        const updatedCharacters = [...characters, character];
        setCharacters(updatedCharacters);
        setActiveCharacterId(newCharacterId);
        setIsAddingCharacter(false);
        setNewCharacter(DEFAULT_CHARACTER);
    };

    const updateCharacter = (characterId: string, updates: Partial<Character>) => {
        const updatedCharacters = characters.map(character => {
            if (character.id === characterId) {
                return { ...character, ...updates };
            }
            return character;
        });
        setCharacters(updatedCharacters);
    };

    const deleteCharacter = (characterId: string) => {
        const updatedCharacters = characters.filter(character => character.id !== characterId);
        setCharacters(updatedCharacters);
        
        if (activeCharacterId === characterId) {
            setActiveCharacterId(updatedCharacters[0]?.id || null);
        }
        
        setCharacterToDelete(null);
    };

    const handleLayersUpdate = (characterId: string, layers: TraitLayer[]) => {
        updateCharacter(characterId, { layers });
    };

    const renderCharacterForm = () => (
        <div className={styles.characterForm}>
            <h3>{isEditingCharacter ? 'Edit Character' : 'Add New Character'}</h3>
            
            <div className={styles.formGroup}>
                <label htmlFor="characterName">Character Name</label>
                <input
                    id="characterName"
                    type="text"
                    value={newCharacter.name}
                    onChange={(e) => setNewCharacter(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Heroes, Villains, etc."
                    className={styles.input}
                />
            </div>
            
            <div className={styles.formGroup}>
                <label htmlFor="characterDescription">Description (Optional)</label>
                <textarea
                    id="characterDescription"
                    value={newCharacter.description || ''}
                    onChange={(e) => setNewCharacter(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of this character type"
                    className={styles.textarea}
                />
            </div>
            
            <div className={styles.formGroup}>
                <label htmlFor="characterSupply">Target Supply</label>
                <input
                    id="characterSupply"
                    type="number"
                    min="1"
                    value={newCharacter.supply}
                    onChange={(e) => setNewCharacter(prev => ({ ...prev, supply: parseInt(e.target.value) || 1 }))}
                    className={styles.input}
                />
                <p className={styles.inputHelp}>Number of NFTs to generate for this character type</p>
            </div>
            
            <div className={styles.formActions}>
                <button 
                    className={styles.cancelButton}
                    onClick={() => {
                        setIsAddingCharacter(false);
                        setIsEditingCharacter(null);
                        setNewCharacter(DEFAULT_CHARACTER);
                    }}
                >
                    <X size={16} />
                    Cancel
                </button>
                
                <button 
                    className={styles.saveButton}
                    onClick={isEditingCharacter ? 
                        () => {
                            updateCharacter(isEditingCharacter, newCharacter);
                            setIsEditingCharacter(null);
                            setNewCharacter(DEFAULT_CHARACTER);
                        } : 
                        addCharacter
                    }
                >
                    <Plus size={16} />
                    {isEditingCharacter ? 'Update Character' : 'Add Character'}
                </button>
            </div>
        </div>
    );

    const renderCharactersList = () => (
        <div className={styles.charactersList}>
            <h3>Character Types</h3>
            
            {characters.length === 0 ? (
                <div className={styles.noCharacters}>
                    <p>No character types created yet</p>
                    <p>Create character types to organize traits for different NFT categories</p>
                </div>
            ) : (
                <div className={styles.charactersGrid}>
                    {characters.map(character => (
                        <div 
                            key={character.id}
                            className={`${styles.characterCard} ${activeCharacterId === character.id ? styles.active : ''}`}
                            onClick={() => setActiveCharacterId(character.id)}
                        >
                            <div className={styles.characterPreview}>
                                {character.imagePreview ? (
                                    <img src={character.imagePreview} alt={character.name} />
                                ) : (
                                    <div className={styles.placeholderImage}>
                                        <Layers size={32} />
                                    </div>
                                )}
                            </div>
                            
                            <div className={styles.characterInfo}>
                                <h4>{character.name}</h4>
                                <p>Target Supply: {character.supply}</p>
                                <p className={styles.layerCount}>
                                    {character.layers.length} Layer{character.layers.length !== 1 ? 's' : ''} | 
                                    {character.layers.reduce((count, layer) => count + layer.traits.length, 0)} Trait{character.layers.reduce((count, layer) => count + layer.traits.length, 0) !== 1 ? 's' : ''}
                                </p>
                            </div>
                            
                            <div className={styles.characterActions}>
                                <button 
                                    className={styles.editButton}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsEditingCharacter(character.id);
                                        setNewCharacter({
                                            name: character.name,
                                            description: character.description || '',
                                            supply: character.supply,
                                            layers: character.layers,
                                            imagePreview: character.imagePreview
                                        });
                                    }}
                                >
                                    <Edit size={16} />
                                </button>
                                
                                <button 
                                    className={styles.deleteButton}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCharacterToDelete(character.id);
                                    }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <button 
                className={styles.addCharacterButton}
                onClick={() => {
                    setIsAddingCharacter(true);
                    setNewCharacter(DEFAULT_CHARACTER);
                }}
            >
                <Plus size={16} />
                Add Character Type
            </button>
        </div>
    );

    const renderActiveCharacterContent = () => {
        const activeCharacter = characters.find(c => c.id === activeCharacterId);
        
        if (!activeCharacter) {
            return (
                <div className={styles.noActiveCharacter}>
                    <p>Select a character type from the list or create a new one</p>
                </div>
            );
        }
        
        return (
            <div className={styles.activeCharacterContent}>
                <div className={styles.activeCharacterHeader}>
                    <h2>{activeCharacter.name}</h2>
                    <p>{activeCharacter.description}</p>
                    <div className={styles.characterStatBadge}>
                        Target Supply: {activeCharacter.supply} NFTs
                    </div>
                </div>
                
                <div className={styles.traitUploaderWrapper}>
                    <TraitUploader 
                        onNext={() => {}} // We're managing navigation at a higher level
                        onBack={() => {}} // We're managing navigation at a higher level
                        onLayersUpdate={(layers) => handleLayersUpdate(activeCharacter.id, layers)}
                        layers={activeCharacter.layers}
                        hideNavigation={true}
                        characters={[activeCharacter]}
                    />
                </div>
            </div>
        );
    };

    const handleNext = () => {
        // Make sure we have at least one character with layers
        if (characters.length === 0) {
            alert('You need to create at least one character type');
            return;
        }

        // Check if any character has no layers
        const emptyCharacters = characters.filter(c => c.layers.length === 0);
        if (emptyCharacters.length > 0) {
            const names = emptyCharacters.map(c => c.name).join(', ');
            alert(`The following character types have no layers: ${names}`);
            return;
        }

        // Proceed to next step
        onNext();
    };

    return (
        <div className={styles.characterManager}>
            {isAddingCharacter || isEditingCharacter ? (
                renderCharacterForm()
            ) : (
                <>
                    <div className={styles.sidebar}>
                        {renderCharactersList()}
                    </div>
                    
                    <div className={styles.mainContent}>
                        {renderActiveCharacterContent()}
                    </div>
                    
                    <div className={styles.actions}>
                        <button className={styles.backButton} onClick={onBack}>
                            <ArrowLeft size={16} />
                            Back
                        </button>
                        
                        <button 
                            className={styles.nextButton} 
                            onClick={handleNext}
                            disabled={characters.length === 0}
                        >
                            Next
                            <ArrowRight size={16} />
                        </button>
                    </div>
                    
                    {characterToDelete && (
                        <div className={styles.modal}>
                            <div className={styles.modalContent}>
                                <h3>Delete Character</h3>
                                <p>Are you sure you want to delete this character? This action cannot be undone.</p>
                                
                                <div className={styles.modalActions}>
                                    <button 
                                        className={styles.cancelButton}
                                        onClick={() => setCharacterToDelete(null)}
                                    >
                                        Cancel
                                    </button>
                                    
                                    <button 
                                        className={styles.deleteButton}
                                        onClick={() => deleteCharacter(characterToDelete)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default CharacterManager; 