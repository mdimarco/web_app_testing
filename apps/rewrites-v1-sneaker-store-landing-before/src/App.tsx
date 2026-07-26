import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Marquee from "./components/Marquee";
import Features from "./components/Features";
import Drops from "./components/Drops";
import Testimonials from "./components/Testimonials";
import Newsletter from "./components/Newsletter";
import Footer from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen bg-ink text-paper font-body">
      <Navbar />
      <main>
        <Hero />
        <Marquee />
        <Features />
        <Drops />
        <Testimonials />
        <Newsletter />
      </main>
      <Footer />
    </div>
  );
}
