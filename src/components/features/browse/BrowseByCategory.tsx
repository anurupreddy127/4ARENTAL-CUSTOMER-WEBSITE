import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useCategoryPricing } from "@/hooks/useCategoryPricing";
import { Loader } from "@/components/ui";

// ============================================
// TYPES
// ============================================
interface CategoryConfig {
  id: string;
  name: string;
  tagline: string;
  image: string;
}

// ============================================
// CONSTANTS
// ============================================
const CATEGORIES: CategoryConfig[] = [
  {
    id: "sedan",
    name: "Sedan",
    tagline: "Fuel efficient & reliable",
    image: "/sedan.jpg",
  },
  {
    id: "suv",
    name: "SUV",
    tagline: "Spacious & powerful",
    image: "/suv.jpg",
  },
  {
    id: "electric",
    name: "Electric",
    tagline: "Eco-friendly & modern",
    image: "/electric.jpg",
  },
  {
    id: "hybrid",
    name: "Hybrid",
    tagline: "Best of both worlds",
    image: "/hybrid.jpg",
  },
];

// ============================================
// SUB-COMPONENTS
// ============================================
interface CategoryCardProps {
  category: CategoryConfig;
  monthlyPrice: number | null;
  onClick: () => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  monthlyPrice,
  onClick,
}) => {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    },
    [onClick]
  );

  return (
    <article
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      className="group bg-white rounded-2xl overflow-hidden border border-bg-200 shadow-sm hover:shadow-lg hover:border-primary-200 transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 focus-visible:ring-offset-2"
      aria-label={`Browse ${category.name} vehicles${
        monthlyPrice ? `. Starting from $${monthlyPrice} per month.` : ""
      }`}
    >
      {/* Image - Increased height */}
      <div className="relative h-52 sm:h-56 lg:h-52 xl:h-56 bg-bg-200 overflow-hidden">
        <img
          src={category.image}
          alt={`${category.name} vehicles`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content - Increased padding */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-heading text-xl text-text-100 uppercase tracking-wide">
              {category.name}
            </h3>
            <p className="font-body text-sm text-text-200 mt-1">
              {category.tagline}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-bg-100 flex items-center justify-center group-hover:bg-primary-100 transition-colors flex-shrink-0">
            <ArrowRight className="w-5 h-5 text-text-200 group-hover:text-text-100 transition-colors" />
          </div>
        </div>

        {/* Pricing */}
        <div className="mt-5 pt-5 border-t border-bg-200">
          {monthlyPrice !== null && monthlyPrice > 0 ? (
            <p className="font-body">
              <span className="text-text-200">From </span>
              <span className="font-bold text-text-100 text-xl">
                ${monthlyPrice}
              </span>
              <span className="text-text-200">/month</span>
            </p>
          ) : (
            <p className="font-body text-text-200">View pricing</p>
          )}
        </div>
      </div>
    </article>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
export const BrowseByCategory: React.FC = () => {
  const navigate = useNavigate();
  const { pricing, loading, error } = useCategoryPricing();

  const handleCategoryClick = useCallback(
    (categoryId: string) => {
      navigate(`/fleet?category=${categoryId}`);
    },
    [navigate]
  );

  const sectionHeadingId = "browse-category-heading";

  // Don't show section if there's an error
  if (error) {
    return null;
  }

  return (
    <section
      id="browse-categories"
      className="py-16 bg-bg-100"
      aria-labelledby={sectionHeadingId}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <header className="text-center mb-12">
          <h2
            id={sectionHeadingId}
            className="font-heading text-3xl lg:text-4xl text-text-100 mb-3 uppercase tracking-wide"
          >
            Browse by Category
          </h2>
          <p className="font-body text-lg text-text-200">
            Find the perfect vehicle for your journey
          </p>
        </header>

        {/* Loading State */}
        {loading && (
          <div
            className="flex justify-center py-12"
            role="status"
            aria-live="polite"
          >
            <Loader />
          </div>
        )}

        {/* Category Grid */}
        {!loading && (
          <div
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
            role="list"
            aria-label="Vehicle categories"
          >
            {CATEGORIES.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                monthlyPrice={pricing[category.id] || null}
                onClick={() => handleCategoryClick(category.id)}
              />
            ))}
          </div>
        )}

        {/* View All Link */}
        {!loading && (
          <div className="text-center mt-10">
            <button
              onClick={() => navigate("/fleet")}
              className="inline-flex items-center gap-2 font-body font-medium text-primary-300 hover:text-primary-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 focus-visible:ring-offset-2 rounded-lg px-2 py-1"
            >
              View all vehicles
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
