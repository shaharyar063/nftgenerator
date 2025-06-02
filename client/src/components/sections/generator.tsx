import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import FileUpload from "@/components/ui/file-upload";
import { Wand2, Loader2 } from "lucide-react";

export default function Generator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState("");
  const [collectionSize, setCollectionSize] = useState("");
  const [rarityDistribution, setRarityDistribution] = useState("");
  const [outputFormat, setOutputFormat] = useState("png");

  const handleGenerate = async () => {
    if (!collectionSize || !rarityDistribution) {
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStatus("Initializing generation...");

    // Simulate generation progress
    const interval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsGenerating(false);
          setGenerationStatus("Generation complete!");
          return 100;
        }
        setGenerationStatus(`Processing assets: ${Math.floor(prev * 10)}/1000`);
        return prev + 2;
      });
    }, 100);
  };

  return (
    <section id="generator" className="py-20 bg-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            NFT <span className="bg-gradient-to-r from-amber-500 to-emerald-500 bg-clip-text text-transparent">Generator</span>
          </h2>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Upload your assets, customize parameters, and generate unique NFT collections with our powerful tools.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Upload Section */}
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold mb-4">Upload Assets</h3>
            <FileUpload />
          </div>
          
          {/* Generation Parameters */}
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold mb-4">Generation Settings</h3>
            
            <Card className="glassmorphism border-slate-700">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="collection-size">Collection Size</Label>
                  <Input
                    id="collection-size"
                    type="number"
                    placeholder="1000"
                    value={collectionSize}
                    onChange={(e) => setCollectionSize(e.target.value)}
                    className="bg-slate-900 border-slate-600 focus:border-indigo-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rarity-distribution">Rarity Distribution</Label>
                  <Select value={rarityDistribution} onValueChange={setRarityDistribution}>
                    <SelectTrigger className="bg-slate-900 border-slate-600 focus:border-indigo-500">
                      <SelectValue placeholder="Select distribution" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="rare-focused">Rare Focused</SelectItem>
                      <SelectItem value="common-focused">Common Focused</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Output Format</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant={outputFormat === "png" ? "default" : "outline"}
                      onClick={() => setOutputFormat("png")}
                      className={outputFormat === "png" ? "bg-indigo-500 hover:bg-indigo-600" : "border-slate-600 hover:border-indigo-500"}
                    >
                      PNG
                    </Button>
                    <Button
                      variant={outputFormat === "svg" ? "default" : "outline"}
                      onClick={() => setOutputFormat("svg")}
                      className={outputFormat === "svg" ? "bg-indigo-500 hover:bg-indigo-600" : "border-slate-600 hover:border-indigo-500"}
                    >
                      SVG
                    </Button>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Button 
                    onClick={handleGenerate}
                    disabled={isGenerating || !collectionSize || !rarityDistribution}
                    className="w-full bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-lg font-semibold"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-5 w-5" />
                        Generate Collection
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Generation Progress */}
        {isGenerating && (
          <Card className="mt-12 glassmorphism border-slate-700">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                </div>
                <p className="text-lg font-medium">Generating your NFT collection...</p>
                <Progress value={generationProgress} className="w-full" />
                <p className="text-sm text-slate-400">{generationStatus}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
