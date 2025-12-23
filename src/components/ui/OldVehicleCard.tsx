import React, { useMemo, useCallback } from "react";
import { Star, Users, Gauge, Fuel, Calendar, CheckCircle } from "lucide-react";
import { Vehicle } from "@/types";
import { Button } from "@/components/ui/Button";

// ============================================
// TYPES
// ============================================
interface VehicleCardProps {
  /** Vehicle data to display */
  vehicle: Vehicle;
  /** Handler when card is clicked */
  onCardClick: () => void;
  /** Handler when book button is clicked */
  onBookClick: (e: React.MouseEvent) => void;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
}

interface SpecItemProps {
  icon: React.ReactNode;
  label: string;
}

interface FeatureItemProps {
  feature: string;
}

// ============================================
// CONSTANTS
// ============================================
const CARD_STYLES = [
  "relative",
  "bg-white",
  "border-[6px]",
  "border-text-100",
  "rounded-xl",
  "shadow-[0.7em_0.7em_0_#000]",
  "hover:shadow-[1em_1em_0_#000]",
  "hover:-translate-x-[0.4em]",
  "hover:-translate-y-[0.4em]",
  "hover:scale-[1.02]",
  "active:shadow-[0.5em_0.5em_0_#000]",
  "active:translate-x-[0.1em]",
  "active:translate-y-[0.1em]",
  "active:scale-[0.98]",
  "transition-all",
  "duration-300",
  "cursor-pointer",
  "overflow-hidden",
  "font-body",
  "focus:outline-none",
  "focus-visible:ring-4",
  "focus-visible:ring-primary-200",
  "focus-visible:ring-offset-2",
].join(" ");

const IMAGE_CONTAINER_STYLES = [
  "relative",
  "h-64",
  "bg-primary-100",
  "border-b-[6px]",
  "border-text-100",
  "overflow-hidden",
].join(" ");

const SPEC_ICON_STYLES = [
  "w-8",
  "h-8",
  "flex",
  "items-center",
  "justify-center",
  "bg-primary-100",
  "border-[2px]",
  "border-text-100",
  "rounded-md",
  "shadow-[0.2em_0.2em_0_rgba(0,0,0,0.2)]",
  "group-hover:bg-primary-200",
  "group-hover:rotate-[-5deg]",
  "transition-all",
].join(" ");

const BUTTON_STYLES = [
  "relative",
  "overflow-hidden",
  "uppercase",
  "tracking-wide",
  "text-sm",
  "font-bold",
  "px-5",
  "py-3",
  "border-[3px]",
  "border-text-100",
  "shadow-[0.3em_0.3em_0_#000]",
  "hover:shadow-[0.4em_0.4em_0_#000]",
  "hover:-translate-x-[0.1em]",
  "hover:-translate-y-[0.1em]",
  "active:shadow-[0.15em_0.15em_0_#000]",
  "active:translate-x-[0.1em]",
  "active:translate-y-[0.1em]",
  "before:absolute",
  "before:top-0",
  "before:left-[-100%]",
  "before:w-full",
  "before:h-full",
  "before:bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)]",
  "before:transition-[left_0.6s_ease]",
  "hover:before:left-[100%]",
].join(" ");

const MAX_VISIBLE_FEATURES = 3;
const STAR_RATING = 5;

// ============================================
// SUB-COMPONENTS
// ============================================
const SpecItem: React.FC<SpecItemProps> = ({ icon, label }) => (
  <div className="flex items-center gap-2 group">
    <div className={SPEC_ICON_STYLES} aria-hidden="true">
      {icon}
    </div>
    <span className="text-sm font-semibold text-text-100">{label}</span>
  </div>
);

const FeatureItem: React.FC<FeatureItemProps> = ({ feature }) => (
  <div className="flex items-center gap-2 text-sm text-text-200 mb-1">
    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" aria-hidden="true" />
    <span>{feature}</span>
  </div>
);

const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
  <div
    className="flex items-center justify-center gap-1 mt-4 text-primary-100"
    role="img"
    aria-label={`${rating} out of ${rating} stars rating`}
  >
    {Array.from({ length: rating }, (_, i) => (
      <Star
        key={`star-${i}`}
        className="w-5 h-5 fill-current"
        aria-hidden="true"
      />
    ))}
  </div>
);

const DecorativePatterns: React.FC = () => (
  <>
    {/* Grid pattern */}
    <div
      className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[length:0.5em_0.5em] pointer-events-none opacity-50 z-[1]"
      aria-hidden="true"
    />
    {/* Radial pattern on hover */}
    <div
      className="absolute inset-0 bg-[radial-gradient(#cfcfcf_1px,transparent_1px)] bg-[length:1em_1em] bg-[position:-0.5em_-0.5em] pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-400 z-[1]"
      aria-hidden="true"
    />
  </>
);

const DecorativeElements: React.FC = () => (
  <>
    {/* Dot pattern */}
    <div
      className="absolute bottom-8 left-[-2em] w-32 h-16 opacity-30 rotate-[-10deg] pointer-events-none z-[1]"
      aria-hidden="true"
    >
      <svg viewBox="0 0 80 40" aria-hidden="true">
        <circle fill="#000" r={3} cy={10} cx={10} />
        <circle fill="#000" r={3} cy={10} cx={30} />
        <circle fill="#000" r={3} cy={10} cx={50} />
        <circle fill="#000" r={3} cy={10} cx={70} />
        <circle fill="#000" r={3} cy={20} cx={20} />
        <circle fill="#000" r={3} cy={20} cx={40} />
        <circle fill="#000" r={3} cy={20} cx={60} />
        <circle fill="#000" r={3} cy={30} cx={10} />
        <circle fill="#000" r={3} cy={30} cx={30} />
        <circle fill="#000" r={3} cy={30} cx={50} />
        <circle fill="#000" r={3} cy={30} cx={70} />
      </svg>
    </div>

    {/* Accent square */}
    <div
      className="absolute w-10 h-10 bg-accent-100 border-[3px] border-text-100 rounded-md rotate-45 -bottom-5 right-8 z-0 group-hover:rotate-[55deg] group-hover:scale-110 transition-transform duration-300"
      aria-hidden="true"
    />

    {/* Approved stamp */}
    <div
      className="absolute bottom-6 left-6 w-16 h-16 flex items-center justify-center border-[3px] border-text-100 border-opacity-30 rounded-full rotate-[-15deg] opacity-20 z-[1]"
      aria-hidden="true"
    >
      <span className="text-xs font-bold uppercase tracking-wide">Approved</span>
    </div>

    {/* Corner notch */}
    <div
      className="absolute bottom-0 left-0 w-6 h-6 bg-white border-r-[4px] border-t-[4px] border-text-100 rounded-tr-lg z-[1]"
      aria-hidden="true"
    />
  </>
);

// ============================================
// MAIN COMPONENT
// ============================================
export const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicle,
  onCardClick,
  onBookClick,
  isAuthenticated,
}) => {
  // ============================================
  // MEMOIZED VALUES
  // ============================================
  const imageUrl = useMemo(() => {
    return Array.isArray(vehicle.image) ? vehicle.image[0] : vehicle.image;
  }, [vehicle.image]);

  const imageAlt = useMemo(() => {
    const { year, brand, model, name } = vehicle.specifications 
      ? { ...vehicle.specifications, name: vehicle.name }
      : { year: "", brand: "", model: "", name: vehicle.name };
    
    return year && brand && model
      ? `${year} ${brand} ${model}`
      : name;
  }, [vehicle.name, vehicle.specifications]);

  const specs = useMemo(() => [
    { icon: <Users className="w-4 h-4" />, label: `${vehicle.specifications.seats} Seats` },
    { icon: <Gauge className="w-4 h-4" />, label: vehicle.specifications.transmission },
    { icon: <Fuel className="w-4 h-4" />, label: vehicle.specifications.fuelType },
    { icon: <Calendar className="w-4 h-4" />, label: String(vehicle.specifications.year) },
  ], [vehicle.specifications]);

  const visibleFeatures = useMemo(() => {
    return vehicle.features.slice(0, MAX_VISIBLE_FEATURES);
  }, [vehicle.features]);

  const buttonText = useMemo(() => {
    return isAuthenticated ? "Book Now" : "Sign In";
  }, [isAuthenticated]);

  const cardAriaLabel = useMemo(() => {
    return `${vehicle.name}, $${vehicle.price} per month. Click to view details.`;
  }, [vehicle.name, vehicle.price]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleCardClick = useCallback(() => {
    onCardClick();
  }, [onCardClick]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        // Only trigger if not clicking the button
        if ((event.target as HTMLElement).tagName !== "BUTTON") {
          event.preventDefault();
          onCardClick();
        }
      }
    },
    [onCardClick]
  );

  const handleBookClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onBookClick(e);
    },
    [onBookClick]
  );

  // ============================================
  // RENDER
  // ============================================
  return (
    <article
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className={CARD_STYLES}
      role="button"
      tabIndex={0}
      aria-label={cardAriaLabel}
    >
      <DecorativePatterns />

      {/* Vehicle Image Section */}
      <div className={IMAGE_CONTAINER_STYLES}>
        <div
          className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(0,0,0,0.1),rgba(0,0,0,0.1)_0.5em,transparent_0.5em,transparent_1em)] opacity-30 pointer-events-none"
          aria-hidden="true"
        />
        <img
          src={imageUrl}
          alt={imageAlt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Card Body */}
      <div className="relative p-6 z-[2]">
        {/* Vehicle Name */}
        <h3 className="font-heading text-2xl text-text-100 mb-4 uppercase tracking-wide">
          {vehicle.name}
        </h3>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6" role="list" aria-label="Vehicle specifications">
          {specs.map((spec) => (
            <SpecItem key={spec.label} icon={spec.icon} label={spec.label} />
          ))}
        </div>

        {/* Features */}
        <div className="mb-6" role="list" aria-label="Vehicle features">
          {visibleFeatures.map((feature) => (
            <FeatureItem key={feature} feature={feature} />
          ))}
        </div>

        {/* Divider with scissors */}
        <div
          className="relative border-t-[2px] border-dashed border-text-100 opacity-15 mb-6 mt-6"
          aria-hidden="true"
        >
          <div className="absolute top-[-0.8em] left-1/2 -translate-x-1/2 bg-white px-2 text-xl">
            ✂
          </div>
        </div>

        {/* Price and Action */}
        <div className="flex justify-between items-center">
          <div className="relative">
            <div className="text-4xl font-bold text-text-100" aria-label={`$${vehicle.price} per month`}>
              <span className="text-xl align-top" aria-hidden="true">$</span>
              <span>{vehicle.price}</span>
            </div>
            <div className="text-sm font-semibold text-text-200" aria-hidden="true">
              per month
            </div>
            <div
              className="absolute bottom-1 left-0 w-full h-2 bg-primary-100 opacity-50 -z-10"
              aria-hidden="true"
            />
          </div>

          <Button
            onClick={handleBookClick}
            variant="primary"
            className={BUTTON_STYLES}
            aria-label={isAuthenticated ? `Book ${vehicle.name}` : "Sign in to book"}
          >
            {buttonText}
          </Button>
        </div>

        <StarRating rating={STAR_RATING} />
      </div>

      <DecorativeElements />
    </article>
  );
};