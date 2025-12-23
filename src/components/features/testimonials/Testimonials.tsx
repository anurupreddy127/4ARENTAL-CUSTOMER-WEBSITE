import React from "react";
import { Star } from "lucide-react";

// ============================================
// TYPES
// ============================================
interface Testimonial {
  id: string;
  name: string;
  role: string;
  rating: number;
  text: string;
  image: string;
}

// ============================================
// CONSTANTS
// ============================================
const MAX_RATING = 5;

const TESTIMONIALS: Testimonial[] = [
  {
    id: "briana-patton",
    name: "Briana Patton",
    role: "Operations Manager",
    rating: 5,
    text: "This ERP revolutionized our operations, streamlining finance and inventory. The cloud-based platform keeps us productive, even remotely.",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150",
  },
  {
    id: "bilal-ahmed",
    name: "Bilal Ahmed",
    role: "IT Manager",
    rating: 5,
    text: "Implementing this ERP was smooth and quick. The customizable, user-friendly interface made team training effortless.",
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150&h=150",
  },
  {
    id: "saman-malik",
    name: "Saman Malik",
    role: "Customer Support Lead",
    rating: 5,
    text: "The support team is exceptional, guiding us through setup and providing ongoing assistance, ensuring our satisfaction.",
    image:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150&h=150",
  },
  {
    id: "omar-raza",
    name: "Omar Raza",
    role: "CEO",
    rating: 5,
    text: "This ERP's seamless integration enhanced our business operations and efficiency. Highly recommend for its intuitive interface.",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150",
  },
  {
    id: "zainab-hussain",
    name: "Zainab Hussain",
    role: "Project Manager",
    rating: 5,
    text: "Its robust features and quick support have transformed our workflow, making us significantly more efficient.",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150",
  },
  {
    id: "aliza-khan",
    name: "Aliza Khan",
    role: "Business Analyst",
    rating: 5,
    text: "The smooth implementation exceeded expectations. It streamlined processes, improving overall business performance.",
    image:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150&h=150",
  },
];

// ============================================
// SUB-COMPONENTS
// ============================================

interface StarRatingProps {
  rating: number;
  maxRating?: number;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxRating = MAX_RATING,
}) => (
  <div
    className="flex items-center gap-1"
    role="img"
    aria-label={`${rating} out of ${maxRating} stars`}
  >
    {[...Array(maxRating)].map((_, index) => (
      <Star
        key={index}
        className={`w-5 h-5 ${
          index < rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
        }`}
        aria-hidden="true"
      />
    ))}
  </div>
);

interface TestimonialCardProps {
  testimonial: Testimonial;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({ testimonial }) => (
  <article className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
    <div className="mb-4">
      <StarRating rating={testimonial.rating} />
    </div>

    <blockquote className="flex-1 mb-6">
      <p className="font-body text-text-200 leading-relaxed text-base">
        "{testimonial.text}"
      </p>
    </blockquote>

    <footer className="flex items-center">
      <img
        src={testimonial.image}
        alt=""
        className="w-12 h-12 rounded-full object-cover mr-4 ring-2 ring-gray-100"
        loading="lazy"
      />
      <div>
        <cite className="font-body font-semibold text-text-100 not-italic block">
          {testimonial.name}
        </cite>
        <p className="font-body text-sm text-text-200">{testimonial.role}</p>
      </div>
    </footer>
  </article>
);

// ============================================
// MAIN COMPONENT
// ============================================
export const Testimonials: React.FC = () => {
  const sectionHeadingId = "testimonials-section-heading";

  return (
    <section className="py-16 bg-bg-100" aria-labelledby={sectionHeadingId}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <header className="text-center mb-12">
          <h2
            id={sectionHeadingId}
            className="font-heading text-4xl text-text-100 mb-4 uppercase tracking-wide"
          >
            Real Stories
          </h2>
          <p className="font-body text-lg text-text-200">
            What Our Customers Say
          </p>
        </header>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" role="list">
          {TESTIMONIALS.map((testimonial) => (
            <div key={testimonial.id} role="listitem">
              <TestimonialCard testimonial={testimonial} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
