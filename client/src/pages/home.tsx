import Navigation from "@/components/ui/navigation";
import Hero from "@/components/sections/hero";
import Generator from "@/components/sections/generator";
import Gallery from "@/components/sections/gallery";
import Features from "@/components/sections/features";
import Footer from "@/components/sections/footer";

export default function Home() {
  return (
    <div className="bg-slate-900 text-slate-100">
      <Navigation />
      <Hero />
      <Generator />
      <Gallery />
      <Features />
      <Footer />
    </div>
  );
}
