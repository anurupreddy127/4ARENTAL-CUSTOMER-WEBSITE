import React, { useCallback } from "react";
import { ArrowRight } from "lucide-react";

export const Hero: React.FC = () => {
  const handleBrowseClick = useCallback(() => {
    const vehiclesSection = document.querySelector("#vehicles");
    if (vehiclesSection) {
      vehiclesSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } else {
      // Fallback: scroll to approximate position or navigate
      window.scrollTo({
        top: window.innerHeight,
        behavior: "smooth",
      });
    }
  }, []);

  return (
    <section
      id="home"
      className="pt-20 h-screen relative overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Background image */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <img
          src="/hero.png"
          alt=""
          className="w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-between py-16">
        {/* Main Heading - Top Left */}
        <div className="mt-8">
          <h1
            id="hero-heading"
            className="font-heading text-4xl sm:text-5xl lg:text-6xl xl:text-7xl text-white leading-tight uppercase tracking-wide"
          >
            Drive The Road
            <br />
            Ahead With
            <br />
            Confidence
          </h1>
        </div>

        {/* Bottom Content - Right Aligned */}
        <div className="flex justify-end mb-8">
          <div className="max-w-lg space-y-6">
            <p className="font-body text-lg text-white leading-relaxed">
              Find your perfect vehicle in seconds. Reserve now and hit the road
              whenever you're ready.
            </p>

            <button
              onClick={handleBrowseClick}
              className="group flex items-center gap-3 text-white hover:text-primary-100 transition-all duration-300 font-body font-semibold text-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-lg px-1 py-1"
              aria-label="Browse our fleet of vehicles"
            >
              Browse Our Fleet
              <ArrowRight
                className="w-6 h-6 transform group-hover:translate-x-2 transition-transform duration-300"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};