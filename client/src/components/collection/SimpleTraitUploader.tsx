import React, { useState, useCallback, useEffect } from 'react';
import { Upload, Plus, X, RefreshCw, Eye, ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Simple types for the component
interface Trait {
  id: string;
  name: string;
  image: string;
  preview: string;
  rarity?: number;
}

interface Layer {
  id: string;
  name: string;
  traits: Trait[];
  isBackground?: boolean;
}

interface SimpleTraitUploaderProps {
  onNext: () => void;
  onBack: () => void;
  onLayersUpdate: (layers: Layer[]) => void;
  layers?: Layer[];
}

const SimpleTraitUploader: React.FC<SimpleTraitUploaderProps> = ({
  onNext,
  onBack,
  onLayersUpdate,
  layers: initialLayers = []
}) => {
  const [layers, setLayers] = useState<Layer[]>(initialLayers);
  const [activeLayerId, setActiveLayerId] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewCombinations, setPreviewCombinations] = useState<Record<string, Trait>[]>([]);

  // Initialize with a default background layer if none exists
  useEffect(() => {
    if (layers.length === 0) {
      const defaultLayer: Layer = {
        id: 'background-default',
        name: 'Background',
        traits: [],
        isBackground: true
      };
      setLayers([defaultLayer]);
      setActiveLayerId(defaultLayer.id);
    }
  }, []);

  // Update parent component when layers change
  useEffect(() => {
    onLayersUpdate(layers);
  }, [layers, onLayersUpdate]);

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !activeLayerId) return;

    try {
      const files = Array.from(event.target.files);
      
      const newTraits = await Promise.all(
        files.map(async (file) => {
          const preview = await createImagePreview(file);
          return {
            id: `trait-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            image: preview,
            preview: preview,
            rarity: 50
          } as Trait;
        })
      );

      setLayers(prev => prev.map(layer => {
        if (layer.id === activeLayerId) {
          return {
            ...layer,
            traits: [...layer.traits, ...newTraits]
          };
        }
        return layer;
      }));

      toast.success(`Added ${newTraits.length} trait(s)`);
      event.target.value = '';
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload files');
    }
  };

  const addLayer = () => {
    const newLayer: Layer = {
      id: `layer-${Date.now()}`,
      name: `Layer ${layers.length}`,
      traits: []
    };
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
  };

  const removeLayer = (layerId: string) => {
    setLayers(prev => prev.filter(layer => layer.id !== layerId));
    if (activeLayerId === layerId) {
      setActiveLayerId(layers[0]?.id || '');
    }
  };

  const removeTrait = (layerId: string, traitId: string) => {
    setLayers(prev => prev.map(layer => {
      if (layer.id === layerId) {
        return {
          ...layer,
          traits: layer.traits.filter(trait => trait.id !== traitId)
        };
      }
      return layer;
    }));
  };

  const generatePreviews = useCallback(() => {
    const previews: Record<string, Trait>[] = [];
    const maxPreviews = 5;

    for (let i = 0; i < maxPreviews; i++) {
      const combination: Record<string, Trait> = {};
      
      layers.forEach(layer => {
        if (layer.traits.length > 0) {
          const randomTrait = layer.traits[Math.floor(Math.random() * layer.traits.length)];
          combination[layer.id] = randomTrait;
        }
      });

      if (Object.keys(combination).length > 0) {
        previews.push(combination);
      }
    }

    setPreviewCombinations(previews);
  }, [layers]);

  const activeLayer = layers.find(layer => layer.id === activeLayerId);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', gap: '2rem', minHeight: '600px' }}>
        {/* Sidebar */}
        <div style={{ width: '300px', flexShrink: 0 }}>
          <div style={{ 
            background: 'white', 
            border: '1px solid #e5e5e5', 
            borderRadius: '8px', 
            overflow: 'hidden' 
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '1rem', 
              background: '#f9fafb', 
              borderBottom: '1px solid #e5e5e5' 
            }}>
              <h3 style={{ margin: 0 }}>Layers</h3>
              <button
                onClick={addLayer}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={16} />
                Add Layer
              </button>
            </div>
            <div style={{ padding: '1rem' }}>
              {layers.map(layer => (
                <div
                  key={layer.id}
                  onClick={() => setActiveLayerId(layer.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    border: '1px solid #e5e5e5',
                    borderRadius: '6px',
                    marginBottom: '0.5rem',
                    cursor: 'pointer',
                    background: activeLayerId === layer.id ? '#eff6ff' : 'white',
                    borderColor: activeLayerId === layer.id ? '#3b82f6' : '#e5e5e5'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>{layer.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {layer.traits.length} traits
                    </div>
                  </div>
                  {!layer.isBackground && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLayer(layer.id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '0.25rem'
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            padding: '1rem',
            background: 'white',
            border: '1px solid #e5e5e5',
            borderRadius: '8px'
          }}>
            <h2 style={{ margin: 0 }}>{activeLayer?.name || 'Select a layer'}</h2>
            <button
              onClick={() => setShowPreview(!showPreview)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: showPreview ? '#3b82f6' : 'white',
                color: showPreview ? 'white' : '#374151',
                border: '1px solid #e5e5e5',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <Eye size={16} />
              Preview
            </button>
          </div>

          {/* Preview Strip */}
          {showPreview && (
            <div style={{
              background: 'white',
              border: '1px solid #e5e5e5',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                flex: 1,
                overflowX: 'auto'
              }}>
                {previewCombinations.map((combination, i) => (
                  <div
                    key={i}
                    style={{
                      width: '60px',
                      height: '60px',
                      flexShrink: 0,
                      border: '1px solid #e5e5e5',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      background: '#f9f9f9',
                      position: 'relative'
                    }}
                  >
                    {Object.entries(combination).map(([layerId, trait], index) => (
                      <img
                        key={`${layerId}-${index}`}
                        src={trait.preview}
                        alt={trait.name}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          zIndex: index
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <button
                onClick={generatePreviews}
                style={{
                  padding: '0.5rem',
                  background: 'white',
                  border: '1px solid #e5e5e5',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <RefreshCw size={14} />
              </button>
            </div>
          )}

          {activeLayerId ? (
            <>
              {/* Upload Section */}
              <div style={{ marginBottom: '2rem' }}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  id={`file-input-${activeLayerId}`}
                />
                <label
                  htmlFor={`file-input-${activeLayerId}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3rem',
                    border: '2px dashed #d1d5db',
                    borderRadius: '8px',
                    background: '#f9fafb',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <Upload size={24} />
                  <p style={{ margin: '0.5rem 0', fontWeight: 500, color: '#374151' }}>
                    Click or drag images here to upload
                  </p>
                  <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    Supports PNG, JPG, GIF (max 5MB)
                  </span>
                </label>
              </div>

              {/* Traits Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                {activeLayer?.traits.map(trait => (
                  <div
                    key={trait.id}
                    style={{
                      background: 'white',
                      border: '1px solid #e5e5e5',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ position: 'relative', aspectRatio: '1', background: '#f9f9f9' }}>
                      <img
                        src={trait.preview}
                        alt={trait.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                      <button
                        onClick={() => removeTrait(activeLayerId, trait.id)}
                        style={{
                          position: 'absolute',
                          top: '0.5rem',
                          right: '0.5rem',
                          background: 'rgba(239, 68, 68, 0.9)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '0.25rem',
                          cursor: 'pointer'
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div style={{ padding: '1rem' }}>
                      <input
                        type="text"
                        value={trait.name}
                        onChange={(e) => {
                          setLayers(prev => prev.map(layer => {
                            if (layer.id === activeLayerId) {
                              return {
                                ...layer,
                                traits: layer.traits.map(t =>
                                  t.id === trait.id ? { ...t, name: e.target.value } : t
                                )
                              };
                            }
                            return layer;
                          }));
                        }}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #e5e5e5',
                          borderRadius: '4px',
                          outline: 'none'
                        }}
                        placeholder="Trait name"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '400px',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              <h2 style={{ marginBottom: '0.5rem', color: '#374151' }}>Select a layer to manage traits</h2>
              <p>Or create a new layer to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '2rem',
        paddingTop: '2rem',
        borderTop: '1px solid #e5e5e5'
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: 'white',
            border: '1px solid #e5e5e5',
            borderRadius: '6px',
            cursor: 'pointer',
            color: '#374151'
          }}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <button
          onClick={onNext}
          disabled={layers.length === 0 || layers.some(layer => layer.traits.length === 0)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: '#3b82f6',
            border: '1px solid #3b82f6',
            borderRadius: '6px',
            cursor: 'pointer',
            color: 'white',
            opacity: layers.length === 0 || layers.some(layer => layer.traits.length === 0) ? 0.5 : 1
          }}
        >
          Next
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default SimpleTraitUploader;