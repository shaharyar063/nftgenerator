export const updateLayerName = (layerId: string, newName: string, layers: any[], setLayers: any) => {
  setLayers((prev: any[]) => 
    prev.map(layer => 
      layer.id === layerId 
        ? { ...layer, name: newName, displayName: newName }
        : layer
    )
  );
};