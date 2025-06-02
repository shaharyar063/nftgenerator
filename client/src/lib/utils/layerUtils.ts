import { TraitLayer } from '@/lib/types';

/**
 * Updates the name of a layer and returns the updated layers array
 * @param layerId ID of the layer to update
 * @param newName New name for the layer
 * @param layers Current layers array
 * @returns Updated layers array
 */
export const updateLayerName = (
    layerId: string,
    newName: string,
    layers: TraitLayer[]
): TraitLayer[] => {
    return layers.map(layer => {
        if (layer.id === layerId) {
            return { ...layer, name: newName };
        }
        return layer;
    });
};

/**
 * Validates if a layer name is unique
 * @param name Layer name to validate
 * @param layers Current layers array
 * @param currentLayerId Optional current layer ID to exclude from uniqueness check
 * @returns Boolean indicating if the name is valid
 */
export const validateLayerName = (
    name: string,
    layers: TraitLayer[],
    currentLayerId?: string
): boolean => {
    if (!name.trim()) return false;
    
    return !layers.some(
        layer => 
            layer.name.toLowerCase() === name.toLowerCase() && 
            layer.id !== currentLayerId
    );
};

/**
 * Generate a unique layer name based on a base name
 * @param baseName Base name to start with
 * @param layers Current layers array
 * @returns Unique layer name
 */
export const generateUniqueLayerName = (
    baseName: string,
    layers: TraitLayer[]
): string => {
    let counter = 1;
    let uniqueName = baseName;
    
    while (layers.some(layer => layer.name.toLowerCase() === uniqueName.toLowerCase())) {
        uniqueName = `${baseName} ${counter}`;
        counter++;
    }
    
    return uniqueName;
};

/**
 * Reorder layers by swapping positions
 * @param layers Current layers array
 * @param fromIndex Source index
 * @param toIndex Destination index
 * @returns Reordered layers array
 */
export const reorderLayers = (
    layers: TraitLayer[],
    fromIndex: number,
    toIndex: number
): TraitLayer[] => {
    const result = [...layers];
    const [removed] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, removed);
    
    // Update order property
    return result.map((layer, index) => ({
        ...layer,
        order: index
    }));
}; 