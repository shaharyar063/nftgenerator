import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Upload, Download, ArrowLeft } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface TraitLayer {
  id: string;
  name: string;
  files: File[];
}

interface GenerationProgress {
  current: number;
  total: number;
  status: string;
}

export default function Generator() {
  const [layers, setLayers] = useState<TraitLayer[]>([]);
  const [supply, setSupply] = useState(100);
  const [collectionName, setCollectionName] = useState("");
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({ current: 0, total: 0, status: "" });
  const { toast } = useToast();

  const onDrop = (acceptedFiles: File[], layerId?: string) => {
    if (!layerId) return;
    
    const imageFiles = acceptedFiles.filter(file => file.type.startsWith('image/'));
    
    setLayers(prev => prev.map(layer => 
      layer.id === layerId 
        ? { ...layer, files: [...layer.files, ...imageFiles] }
        : layer
    ));

    toast({
      title: "Files uploaded",
      description: `Added ${imageFiles.length} files to layer`,
    });
  };

  const addLayer = () => {
    const newLayer: TraitLayer = {
      id: `layer-${Date.now()}`,
      name: `Layer ${layers.length + 1}`,
      files: []
    };
    setLayers(prev => [...prev, newLayer]);
  };

  const removeLayer = (layerId: string) => {
    setLayers(prev => prev.filter(layer => layer.id !== layerId));
  };

  const updateLayerName = (layerId: string, name: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, name } : layer
    ));
  };

  const generateCollection = async () => {
    if (layers.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one layer with images",
        variant: "destructive",
      });
      return;
    }

    if (!collectionName.trim()) {
      toast({
        title: "Error", 
        description: "Please enter a collection name",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setProgress({ current: 0, total: supply, status: "Starting generation..." });

    try {
      // Simulate generation process
      for (let i = 1; i <= supply; i++) {
        await new Promise(resolve => setTimeout(resolve, 50));
        setProgress({ 
          current: i, 
          total: supply, 
          status: `Generating NFT ${i} of ${supply}...` 
        });
      }

      setProgress({ current: supply, total: supply, status: "Generation complete!" });
      
      toast({
        title: "Success",
        description: `Generated ${supply} NFTs successfully!`,
      });

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate collection",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const LayerDropzone = ({ layer }: { layer: TraitLayer }) => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop: (files) => onDrop(files, layer.id),
      accept: {
        'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
      }
    });

    return (
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-gray-300 hover:border-primary'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">
          {isDragActive 
            ? "Drop the files here..." 
            : "Drag & drop images here, or click to select"
          }
        </p>
        {layer.files.length > 0 && (
          <p className="text-xs text-green-600 mt-2">
            {layer.files.length} files uploaded
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>NFT Collection Generator</CardTitle>
          <CardDescription>
            Upload layer images and generate unique NFT combinations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="collectionName">Collection Name</Label>
              <Input
                id="collectionName"
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                placeholder="My NFT Collection"
              />
            </div>
            <div>
              <Label htmlFor="supply">Supply</Label>
              <Input
                id="supply"
                type="number"
                value={supply}
                onChange={(e) => setSupply(Number(e.target.value))}
                min="1"
                max="10000"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your NFT collection..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Trait Layers</CardTitle>
          <CardDescription>
            Add layers and upload trait images for each layer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {layers.map((layer) => (
              <Card key={layer.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <Input
                      value={layer.name}
                      onChange={(e) => updateLayerName(layer.id, e.target.value)}
                      className="max-w-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeLayer(layer.id)}
                    >
                      Remove Layer
                    </Button>
                  </div>
                  <LayerDropzone layer={layer} />
                </CardContent>
              </Card>
            ))}
            
            <Button onClick={addLayer} variant="outline" className="w-full">
              Add Layer
            </Button>
          </div>
        </CardContent>
      </Card>

      {isGenerating && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{progress.status}</span>
                <span>{progress.current}/{progress.total}</span>
              </div>
              <Progress value={(progress.current / progress.total) * 100} />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <Button 
          onClick={generateCollection} 
          disabled={isGenerating || layers.length === 0}
          className="flex-1"
        >
          {isGenerating ? "Generating..." : "Generate Collection"}
        </Button>
        
        {progress.current === progress.total && progress.total > 0 && (
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        )}
      </div>
    </div>
  );
}