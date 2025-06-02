import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Upload, Zap, Download } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-6">
            NFT Generator
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Create unique NFT collections with layered artwork. Upload your traits and generate thousands of unique combinations automatically.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center p-6">
            <CardHeader>
              <Upload className="h-12 w-12 mx-auto mb-4 text-purple-600" />
              <CardTitle>Upload Traits</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Upload your layer artwork and organize traits by categories like background, body, accessories, etc.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardHeader>
              <Zap className="h-12 w-12 mx-auto mb-4 text-blue-600" />
              <CardTitle>Generate Collection</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Set rarity weights and let our algorithm create unique combinations. Preview before finalizing your collection.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardHeader>
              <Download className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <CardTitle>Download & Deploy</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Export your collection with metadata, images, and rarity stats. Ready for minting on your preferred blockchain.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Link href="/generator">
            <Button size="lg" className="text-lg px-8 py-6">
              Start Creating
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
