import { Button } from "@/components/ui/button";
import { ImageIcon } from "lucide-react";

export default function Hero() {
  const scrollToGenerator = () => {
    const element = document.getElementById("generator");
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToGallery = () => {
    const element = document.getElementById("gallery");
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="home" className="pt-16 min-h-screen flex items-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-600/10"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                Create <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">Unique</span> NFTs
              </h1>
              <p className="text-xl text-slate-300 leading-relaxed">
                Generate stunning digital assets with our advanced AI-powered NFT creation tools. 
                Turn your imagination into valuable collectibles.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={scrollToGenerator}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 px-8 py-4 text-lg font-semibold"
                size="lg"
              >
                Start Creating
              </Button>
              <Button 
                onClick={scrollToGallery}
                variant="outline" 
                className="border-slate-600 hover:border-indigo-500 px-8 py-4 text-lg font-semibold"
                size="lg"
              >
                View Gallery
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-8 pt-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-500">Ready</div>
                <div className="text-slate-400">To Generate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-500">For</div>
                <div className="text-slate-400">Your Assets</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-500">Upload</div>
                <div className="text-slate-400">& Create</div>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="animate-float">
              <div className="gradient-border">
                <div className="gradient-border-inner">
                  <div className="w-full h-96 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-lg flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <ImageIcon className="mx-auto text-slate-400" size={64} />
                      <p className="text-slate-400">Your NFT Preview</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
