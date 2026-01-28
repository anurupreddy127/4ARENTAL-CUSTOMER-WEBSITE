/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import * as Sentry from "@sentry/react";
import {
  ArrowLeft,
  ArrowRight,
  Star,
  CheckCircle,
  Users,
  Settings,
  Fuel,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Shield,
} from "lucide-react";
import { Vehicle, Review } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { usePricing, useVehicleRates } from "@/hooks/usePricing";
import { useReviews } from "@/hooks/useReviews";
import { vehicleService } from "@/services/vehicles/vehicleService";
import { AuthModal, BookingModal } from "@/components/modals";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Navbar, Footer } from "@/components/layout";

// ============================================
// CONSTANTS
// ============================================
const MAX_STARS = 5;

// Statuses that indicate a vehicle is booked (not available for new bookings)
const BOOKED_STATUSES: Vehicle["status"][] = ["reserved", "rented"];

// Statuses that are allowed to be viewed on the details page
const VIEWABLE_STATUSES: Vehicle["status"][] = [
  "available",
  "reserved",
  "rented",
];

const CONTACT_INFO = {
  phone: "+1 (469) 403-7094",
  phoneHref: "tel:+14694037094",
  email: "info@4arentals.com",
  location: "Denton, Texas",
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================
function logError(message: string, error: unknown): void {
  if (import.meta.env.PROD) {
    Sentry.captureException(error, {
      tags: { component: "VehicleDetails" },
      extra: { message },
    });
  } else {
    console.error(`[VehicleDetails] ${message}:`, error);
  }
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getMinDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

function getDefaultReturnDate(pickupDate: string): string {
  if (!pickupDate) return "";
  const pickup = new Date(pickupDate);
  pickup.setDate(pickup.getDate() + 7); // Default 7 days
  return pickup.toISOString().split("T")[0];
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface StarRatingProps {
  rating: number;
  size?: "sm" | "md" | "lg";
  showRating?: boolean;
  totalReviews?: number;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  size = "md",
  showRating = true,
  totalReviews,
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <div
      className="flex items-center gap-1"
      role="img"
      aria-label={`${rating} out of ${MAX_STARS} stars`}
    >
      {[...Array(MAX_STARS)].map((_, i) => (
        <Star
          key={i}
          className={`${sizeClasses[size]} ${
            i < Math.floor(rating)
              ? "text-primary-100 fill-current"
              : "text-bg-300"
          }`}
          aria-hidden="true"
        />
      ))}
      {showRating && (
        <span className="ml-1 font-body text-text-200 text-sm">
          {rating.toFixed(1)}
          {totalReviews !== undefined && (
            <span className="text-text-200">
              {" "}
              ({totalReviews} review{totalReviews !== 1 ? "s" : ""})
            </span>
          )}
        </span>
      )}
    </div>
  );
};

interface SpecBadgeProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const SpecBadge: React.FC<SpecBadgeProps> = ({ icon, label, value }) => (
  <div className="flex flex-col items-center p-4 bg-bg-100 rounded-xl">
    <div className="text-text-200 mb-2" aria-hidden="true">
      {icon}
    </div>
    <p className="text-xs text-text-200 uppercase tracking-wide">{label}</p>
    <p className="font-semibold text-text-100 capitalize">{value}</p>
  </div>
);

interface PricingTierProps {
  label: string;
  rate: number;
  period: string;
  perDay?: number;
  badge?: string;
  badgeColor?: "green" | "blue";
}

const PricingTier: React.FC<PricingTierProps> = ({
  label,
  rate,
  period,
  perDay,
  badge,
  badgeColor = "green",
}) => (
  <div className="flex items-center justify-between p-4 border border-bg-200 rounded-xl hover:border-primary-200 transition-colors">
    <div>
      <p className="font-semibold text-text-100">{label}</p>
      {perDay && (
        <p className="text-sm text-text-200">${perDay.toFixed(0)}/day</p>
      )}
    </div>
    <div className="text-right">
      <p className="font-bold text-text-100 text-lg">{formatCurrency(rate)}</p>
      <p className="text-xs text-text-200">{period}</p>
      {badge && (
        <span
          className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${
            badgeColor === "green"
              ? "bg-green-100 text-green-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {badge}
        </span>
      )}
    </div>
  </div>
);

interface ReviewCardProps {
  review: Review;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => (
  <div className="p-4 bg-white border border-bg-200 rounded-xl">
    {/* Stars */}
    <div className="flex items-center gap-1 mb-3">
      {[...Array(MAX_STARS)].map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < review.rating ? "text-primary-100 fill-current" : "text-bg-300"
          }`}
          aria-hidden="true"
        />
      ))}
    </div>

    {/* Comment */}
    {review.comment && (
      <p className="text-text-100 font-body mb-3">"{review.comment}"</p>
    )}

    {/* Reviewer info */}
    <div className="flex items-center justify-between">
      <div>
        <p className="font-semibold text-text-100">{review.reviewerName}</p>
        {review.isVerified && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Verified Renter
          </p>
        )}
      </div>
      <p className="text-xs text-text-200">{formatDate(review.createdAt)}</p>
    </div>
  </div>
);

interface InfoItemProps {
  label: string;
  value: string | number | undefined;
  mono?: boolean;
}

const InfoItem: React.FC<InfoItemProps> = ({ label, value, mono }) => {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-text-200 uppercase tracking-wide mb-1">
        {label}
      </dt>
      <dd
        className={`text-text-100 font-medium ${
          mono ? "font-mono text-sm" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
};

const BookedBanner: React.FC = () => (
  <div
    className="bg-gray-900 text-white px-4 py-3 rounded-xl flex items-center gap-3"
    role="status"
    aria-live="polite"
  >
    <div className="bg-white/20 rounded-full p-2">
      <Calendar className="w-5 h-5" />
    </div>
    <div>
      <p className="font-semibold">Currently Booked</p>
      <p className="text-sm text-gray-300">
        This vehicle is not available for booking right now
      </p>
    </div>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================
export const VehicleDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Vehicle state
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">(
    "login",
  );

  // Image gallery state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Price calculator state
  const [pickupDate, setPickupDate] = useState("");
  const [returnDate, setReturnDate] = useState("");

  // Hooks
  const { rates, loading: ratesLoading } = useVehicleRates(vehicle?.id || null);
  const { reviews, stats, hasReviews } = useReviews({
    vehicleId: vehicle?.id || null,
    enabled: Boolean(vehicle?.id),
  });
  const {
    pricing,
    loading: pricingLoading,
    error: pricingError,
  } = usePricing({
    vehicleId: vehicle?.id || null,
    pickupDate: pickupDate || null,
    returnDate: returnDate || null,
    enabled: Boolean(pickupDate && returnDate),
  });

  // Check if vehicle is currently booked
  const isBooked = useMemo(
    () => vehicle !== null && BOOKED_STATUSES.includes(vehicle.status),
    [vehicle],
  );

  // ============================================
  // MEMOIZED VALUES
  // ============================================
  const images = useMemo(() => {
    if (!vehicle) return [];
    return Array.isArray(vehicle.image) ? vehicle.image : [vehicle.image];
  }, [vehicle]);

  const hasMultipleImages = useMemo(() => images.length > 1, [images]);

  const pageTitle = useMemo(() => {
    if (loading) return "Loading... | 4A Rentals";
    if (error || !vehicle) return "Vehicle Not Available | 4A Rentals";
    return `${vehicle.name} | 4A Rentals`;
  }, [loading, error, vehicle]);

  const displayRating = useMemo(() => {
    if (stats?.averageRating) return stats.averageRating;
    if (vehicle?.averageRating) return vehicle.averageRating;
    return null;
  }, [stats, vehicle]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleAuthModalOpen = useCallback((mode: "login" | "register") => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const handleAuthModalClose = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const handleBookingModalOpen = useCallback(() => {
    // Don't allow booking if vehicle is booked
    if (isBooked) return;

    if (currentUser) {
      setIsBookingModalOpen(true);
    } else {
      setIsAuthModalOpen(true);
    }
  }, [currentUser, isBooked]);

  const handleBookingModalClose = useCallback(() => {
    setIsBookingModalOpen(false);
  }, []);

  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleGoHome = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handlePreviousImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const handleNextImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  const handleThumbnailClick = useCallback((index: number) => {
    setCurrentImageIndex(index);
  }, []);

  const handlePickupDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newPickupDate = e.target.value;
      setPickupDate(newPickupDate);

      // Auto-set return date if not set or if it's before pickup
      if (!returnDate || newPickupDate >= returnDate) {
        setReturnDate(getDefaultReturnDate(newPickupDate));
      }
    },
    [returnDate],
  );

  const handleReturnDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setReturnDate(e.target.value);
    },
    [],
  );

  // ============================================
  // DATA FETCHING
  // ============================================
  useEffect(() => {
    let cancelled = false;

    if (!id) {
      setError("Vehicle ID not provided");
      setLoading(false);
      return;
    }

    const fetchVehicle = async () => {
      try {
        setLoading(true);
        setError(null);

        const vehicleData = await vehicleService.getVehicle(id);

        if (cancelled) return;

        if (vehicleData) {
          // Allow viewing available, reserved, and rented vehicles
          if (VIEWABLE_STATUSES.includes(vehicleData.status)) {
            setVehicle(vehicleData);
          } else {
            // Block vehicles in maintenance, inspection, sold, etc.
            setError("This vehicle is not currently available");
            setVehicle(null);
          }
        } else {
          setError("Vehicle not found");
        }
      } catch (err) {
        if (cancelled) return;
        logError("Failed to fetch vehicle", err);
        setError("Failed to load vehicle details");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchVehicle();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // ============================================
  // RENDER - LOADING STATE
  // ============================================
  if (loading) {
    return (
      <div className="min-h-screen bg-bg-100 flex items-center justify-center">
        <Helmet>
          <title>{pageTitle}</title>
        </Helmet>
        <div className="text-center">
          <Loader />
          <p className="mt-4 font-body text-text-200">
            Loading vehicle details...
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER - ERROR STATE
  // ============================================
  if (error || !vehicle) {
    return (
      <div className="min-h-screen bg-bg-100 flex items-center justify-center">
        <Helmet>
          <title>{pageTitle}</title>
        </Helmet>
        <div className="text-center">
          <h1 className="font-heading text-3xl text-text-100 mb-4 uppercase">
            Vehicle Not Available
          </h1>
          <p className="font-body text-text-200 mb-6">{error}</p>
          <Button onClick={handleGoHome} variant="primary">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER - MAIN CONTENT
  // ============================================
  return (
    <div className="min-h-screen bg-bg-100">
      <Helmet>
        <title>{pageTitle}</title>
        <meta
          name="description"
          content={`Rent the ${vehicle.name}. ${vehicle.specifications.seats} seats, ${vehicle.specifications.transmission} transmission.`}
        />
      </Helmet>

      <Navbar onAuthModalOpen={handleAuthModalOpen} />

      <main id="main-content" className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={handleGoBack}
            className="flex items-center gap-2 font-body text-text-200 hover:text-primary-200 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {/* Title & Rating Row */}
          {/* Title & Rating Row */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <h1 className="font-heading text-3xl lg:text-4xl text-text-100 uppercase tracking-wide">
                {vehicle.name}
              </h1>
              {displayRating && (
                <div className="mt-2">
                  <StarRating
                    rating={displayRating}
                    totalReviews={stats?.totalReviews || vehicle.reviewCount}
                  />
                </div>
              )}
            </div>
            <span className="inline-block px-3 py-1 bg-primary-100 text-text-100 text-sm font-medium rounded-full uppercase">
              {vehicle.category}
            </span>
          </div>

          {/* Booked Status Banner */}
          {isBooked && (
            <div className="mb-6">
              <BookedBanner />
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Images & Details */}
            <div className="lg:col-span-2 space-y-8">
              {/* Image Gallery */}
              <section aria-label="Vehicle images">
                <div className="relative rounded-2xl overflow-hidden bg-bg-200">
                  <img
                    src={images[currentImageIndex]}
                    alt={`${vehicle.name} - Image ${currentImageIndex + 1}`}
                    className="w-full h-80 lg:h-96 object-cover"
                  />

                  {hasMultipleImages && (
                    <>
                      <button
                        onClick={handlePreviousImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg"
                        aria-label="Previous image"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleNextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg"
                        aria-label="Next image"
                      >
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnails */}
                {hasMultipleImages && (
                  <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
                    {images.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => handleThumbnailClick(index)}
                        className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                          currentImageIndex === index
                            ? "border-primary-200"
                            : "border-bg-200 hover:border-primary-100"
                        }`}
                      >
                        <img
                          src={img}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {/* Quick Specs Bar */}
              <section aria-label="Quick specifications">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <SpecBadge
                    icon={<Fuel className="w-6 h-6" />}
                    label="Fuel Type"
                    value={vehicle.specifications.fuelType}
                  />
                  <SpecBadge
                    icon={<Settings className="w-6 h-6" />}
                    label="Transmission"
                    value={vehicle.specifications.transmission}
                  />
                  <SpecBadge
                    icon={<Users className="w-6 h-6" />}
                    label="Capacity"
                    value={`${vehicle.specifications.seats} Passengers`}
                  />
                  <SpecBadge
                    icon={<Calendar className="w-6 h-6" />}
                    label="Year"
                    value={String(vehicle.specifications.year)}
                  />
                </div>
              </section>

              {/* Specifications */}
              <Card variant="default" padding="lg">
                <h2 className="font-heading text-xl text-text-100 uppercase tracking-wide mb-6">
                  Specifications
                </h2>
                <dl className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <InfoItem
                    label="Brand & Model"
                    value={`${vehicle.specifications.brand} ${vehicle.specifications.model}`}
                  />
                  <InfoItem
                    label="Color"
                    value={vehicle.specifications.color}
                  />
                  <InfoItem
                    label="Interior"
                    value={vehicle.specifications.interior}
                  />
                  <InfoItem
                    label="Interior Color"
                    value={vehicle.specifications.interiorColor}
                  />
                  <InfoItem
                    label="Drive Train"
                    value={vehicle.specifications.driveTrain}
                  />
                  <InfoItem
                    label="Cylinders"
                    value={vehicle.specifications.cylinders}
                  />
                  <InfoItem
                    label="Engine"
                    value={vehicle.specifications.engine}
                  />
                  <InfoItem
                    label="Fuel Economy"
                    value={vehicle.specifications.fuelEconomy}
                  />
                  <InfoItem
                    label="VIN"
                    value={vehicle.specifications.vin}
                    mono
                  />
                </dl>
              </Card>

              {/* Features & Amenities */}
              {vehicle.features.length > 0 && (
                <Card variant="default" padding="lg">
                  <h2 className="font-heading text-xl text-text-100 uppercase tracking-wide mb-6">
                    Features & Amenities
                  </h2>
                  <ul className="grid md:grid-cols-2 gap-3">
                    {vehicle.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="font-body text-text-100">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Customer Reviews - Only show if reviews exist */}
              {hasReviews && (
                <Card variant="default" padding="lg">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-heading text-xl text-text-100 uppercase tracking-wide">
                      Customer Reviews
                    </h2>
                    {stats && (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-text-100">
                          {stats.averageRating?.toFixed(1)}
                        </span>
                        <div>
                          <StarRating
                            rating={stats.averageRating || 0}
                            size="sm"
                            showRating={false}
                          />
                          <p className="text-xs text-text-200">
                            {stats.totalReviews} review
                            {stats.totalReviews !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Right Column - Pricing & Booking */}
            <div className="lg:col-span-1">
              <div className="sticky top-28 space-y-6">
                {/* Pricing Tiers */}
                <Card variant="default" padding="lg">
                  <h3 className="font-heading text-lg text-text-100 uppercase tracking-wide mb-4">
                    Pricing Tiers
                  </h3>

                  {ratesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader />
                    </div>
                  ) : rates ? (
                    <div className="space-y-3">
                      <PricingTier
                        label="Weekly"
                        rate={rates.weeklyRate}
                        period="7 Days"
                        perDay={rates.weeklyRate / 7}
                      />
                      <PricingTier
                        label="Monthly"
                        rate={rates.monthlyRate}
                        period="30 Days"
                        perDay={rates.monthlyRate / 30}
                        badge="SAVE 18%"
                        badgeColor="green"
                      />
                      <PricingTier
                        label="Semester"
                        rate={rates.semesterRate}
                        period="4 Months"
                        perDay={rates.semesterRate / 120}
                        badge="STUDENT EXCLUSIVE"
                        badgeColor="blue"
                      />
                    </div>
                  ) : null}
                </Card>

                {/* Price Calculator */}
                <Card variant="default" padding="lg">
                  <h3 className="font-heading text-lg text-text-100 uppercase tracking-wide mb-4">
                    Calculate Your Price
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-200 mb-2">
                        Pick-up Date
                      </label>
                      <input
                        type="date"
                        value={pickupDate}
                        onChange={handlePickupDateChange}
                        min={getMinDate()}
                        className="w-full px-4 py-3 border border-bg-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-200 mb-2">
                        Drop-off Date
                      </label>
                      <input
                        type="date"
                        value={returnDate}
                        onChange={handleReturnDateChange}
                        min={pickupDate || getMinDate()}
                        className="w-full px-4 py-3 border border-bg-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200"
                      />
                    </div>

                    {/* Price Result */}
                    {pickupDate && returnDate && (
                      <div className="pt-4 border-t border-bg-200">
                        {pricingLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader />
                            <span className="ml-2 text-sm text-text-200">
                              Calculating...
                            </span>
                          </div>
                        ) : pricingError ? (
                          <p className="text-sm text-red-600">{pricingError}</p>
                        ) : pricing ? (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-text-200">
                                {pricing.rentalDays} days (
                                {pricing.pricingMethod})
                              </span>
                              <span className="text-text-100">
                                {formatCurrency(pricing.rentalAmount)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-text-200">
                                Security Deposit
                              </span>
                              <span className="text-text-100">
                                {formatCurrency(pricing.securityDeposit)}
                              </span>
                            </div>
                            <div className="flex justify-between font-bold pt-2 border-t border-bg-200">
                              <span className="text-text-100">
                                Estimated Total
                              </span>
                              <span className="text-primary-300 text-xl">
                                {formatCurrency(pricing.totalDueNow)}
                              </span>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleBookingModalOpen}
                    variant={isBooked ? "secondary" : "primary"}
                    fullWidth
                    size="lg"
                    className={`mt-6 ${isBooked ? "opacity-60 cursor-not-allowed" : ""}`}
                    disabled={isBooked}
                    aria-label={
                      isBooked
                        ? "This vehicle is currently booked"
                        : currentUser
                          ? `Book ${vehicle.name}`
                          : "Sign in to book"
                    }
                  >
                    {isBooked
                      ? "Currently Booked"
                      : currentUser
                        ? "Book Now"
                        : "Sign In to Book"}
                  </Button>

                  {!isBooked && (
                    <p className="text-center text-xs text-text-200 mt-3 flex items-center justify-center gap-1">
                      <Shield className="w-4 h-4" />
                      Secure Booking Transaction
                    </p>
                  )}
                </Card>

                {/* Contact Info */}
                <Card variant="default" padding="lg">
                  <h3 className="font-heading text-sm uppercase tracking-wide text-text-100 mb-4">
                    Need Help?
                  </h3>
                  <address className="not-italic space-y-3">
                    <a
                      href={CONTACT_INFO.phoneHref}
                      className="flex items-center gap-3 text-sm text-text-200 hover:text-primary-200"
                    >
                      <Phone className="w-4 h-4" />
                      {CONTACT_INFO.phone}
                    </a>
                    <a
                      href={`mailto:${CONTACT_INFO.email}`}
                      className="flex items-center gap-3 text-sm text-text-200 hover:text-primary-200"
                    >
                      <Mail className="w-4 h-4" />
                      {CONTACT_INFO.email}
                    </a>
                    <p className="flex items-center gap-3 text-sm text-text-200">
                      <MapPin className="w-4 h-4" />
                      {CONTACT_INFO.location}
                    </p>
                  </address>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={handleAuthModalClose}
        initialMode={authModalMode}
      />

      <BookingModal
        vehicle={vehicle}
        isOpen={isBookingModalOpen}
        onClose={handleBookingModalClose}
      />
    </div>
  );
};
