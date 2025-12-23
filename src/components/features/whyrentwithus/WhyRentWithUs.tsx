import React from "react";
import { ArrowRight } from "lucide-react";

// ============================================
// TYPES
// ============================================
interface Advantage {
  id: string;
  label: string;
  title: string;
  description: string;
  image: string;
  link: string;
}

// ============================================
// CONSTANTS
// ============================================
const ADVANTAGES: Advantage[] = [
  {
    id: "flexibility",
    label: "Flexibility",
    title: "Rent For A Day Or A Month",
    description: "Adjust your plans without penalty",
    image:
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop",
    link: "#flexibility",
  },
  {
    id: "coverage",
    label: "Coverage",
    title: "Comprehensive Insurance Included",
    description: "Protection from start to finish",
    image:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop",
    link: "#coverage",
  },
  {
    id: "support",
    label: "Support",
    title: "Twenty-Four Hour Roadside Assistance",
    description: "Help when you need it most",
    image:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&h=400&fit=crop",
    link: "#support",
  },
];

// ============================================
// SUB-COMPONENTS
// ============================================
interface AdvantageCardProps {
  advantage: Advantage;
}

const AdvantageCard: React.FC<AdvantageCardProps> = ({ advantage }) => {
  const headingId = `advantage-heading-${advantage.id}`;

  return (
    <article
      className="group bg-white border-2 border-bg-200 rounded-xl overflow-hidden hover:border-primary-200 hover:shadow-lg transition-all duration-300 flex flex-col"
      aria-labelledby={headingId}
    >
      {/* Card Content */}
      <div className="p-8 flex-1">
        <p className="font-body text-sm font-semibold text-text-200 mb-4 uppercase tracking-wide">
          {advantage.label}
        </p>
        <h3
          id={headingId}
          className="font-heading text-2xl text-text-100 mb-4 uppercase leading-tight"
        >
          {advantage.title}
        </h3>
        <p className="font-body text-text-200 mb-6">{advantage.description}</p>
        <a
          href={advantage.link}
          className="inline-flex items-center gap-2 font-body font-semibold text-text-100 hover:text-primary-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 focus-visible:ring-offset-2 rounded"
          aria-label={`Learn more about ${advantage.title.toLowerCase()}`}
        >
          <span>Learn</span>
          <ArrowRight
            className="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
            aria-hidden="true"
          />
        </a>
      </div>

      {/* Card Image */}
      <div className="h-64 overflow-hidden">
        <img
          src={advantage.image}
          alt=""
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </div>
    </article>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
export const WhyRentWithUs: React.FC = () => {
  const sectionHeadingId = "why-rent-with-us-heading";

  return (
    <section
      className="py-20 bg-white"
      aria-labelledby={sectionHeadingId}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="text-center mb-16">
          <p className="font-body text-sm uppercase tracking-wider text-text-200 mb-3">
            Advantages
          </p>
          <h2
            id={sectionHeadingId}
            className="font-heading text-4xl lg:text-5xl text-text-100 mb-4 uppercase tracking-wide"
          >
            Why Rent With Us
          </h2>
          <p className="font-body text-lg text-text-200 max-w-2xl mx-auto">
            We handle the details so you focus on the drive
          </p>
        </header>

        {/* Cards Grid */}
        <ul
          className="grid md:grid-cols-3 gap-8 list-none p-0 m-0"
          role="list"
        >
          {ADVANTAGES.map((advantage) => (
            <li key={advantage.id}>
              <AdvantageCard advantage={advantage} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};