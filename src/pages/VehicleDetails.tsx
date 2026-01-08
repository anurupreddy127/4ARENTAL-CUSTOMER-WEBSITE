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
} from "lucide-react";
import { Vehicle } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { vehicleService } from "@/services/vehicles/vehicleService";
import { AuthModal, BookingModal } from "@/components/modals";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Navbar, Footer } from "@/components/layout";
import {
  PrintButton,
  VehicleDetailsPrint,
  VehiclePrintData,
} from "@/components/print";

// ============================================
// CONSTANTS
// ============================================
const RATING = 4.9;
const MAX_STARS = 5;

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

// Map vehicle data to print format
function mapToVehiclePrintData(vehicle: Vehicle): VehiclePrintData {
  const images = Array.isArray(vehicle.image) ? vehicle.image : [vehicle.image];

  // Calculate rates from monthly price if not available
  const monthlyRate = vehicle.price;
  const weeklyRate = Math.round(monthlyRate / 4);
  const dailyRate = Math.round(monthlyRate / 30);

  return {
    id: vehicle.id,
    name: vehicle.name,
    category: vehicle.category,
    description: vehicle.description || "",
    images: images,
    dailyRate: dailyRate,
    weeklyRate: weeklyRate,
    monthlyRate: monthlyRate,
    semesterRate: undefined, // Will show only if available
    securityDeposit: 500, // Default security deposit
    features: vehicle.features || [],
    specs: {
      seats: vehicle.specifications?.seats,
      transmission: vehicle.specifications?.transmission,
      fuelType: vehicle.specifications?.fuelType,
      mileageLimit: vehicle.specifications?.mileage
        ? `${vehicle.specifications.mileage.toLocaleString()} miles`
        : undefined,
      year: vehicle.specifications?.year,
      make: vehicle.specifications?.brand,
      model: vehicle.specifications?.model,
      color: vehicle.specifications?.color,
    },
    isAvailable: vehicle.status === "available",
  };
}

// ============================================
// SUB-COMPONENTS
// ============================================
interface StarRatingProps {
  rating: number;
  size?: "sm" | "md";
  showRating?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  size = "md",
  showRating = true,
}) => {
  const sizeClasses = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    <div
      className="flex items-center"
      role="img"
      aria-label={`${rating} out of ${MAX_STARS} stars`}
    >
      {[...Array(MAX_STARS)].map((_, i) => (
        <Star
          key={i}
          className={`${sizeClasses} text-primary-100 fill-current`}
          aria-hidden="true"
        />
      ))}
      {showRating && (
        <span
          className={`ml-2 font-body text-text-200 ${
            size === "sm" ? "text-sm" : ""
          }`}
        >
          ({rating}
          {size === "sm" ? " rating" : ""})
        </span>
      )}
    </div>
  );
};

interface SpecCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

const SpecCard: React.FC<SpecCardProps> = ({ icon, label, value }) => (
  <Card variant="default" padding="md">
    <div aria-hidden="true">{icon}</div>
    <p className="font-body text-sm text-text-200 mt-3">{label}</p>
    <p className="font-body text-xl font-bold text-text-100 capitalize">
      {value}
    </p>
  </Card>
);

interface InfoItemProps {
  label: string;
  value: string | number | undefined;
  mono?: boolean;
  subtext?: string;
}

const InfoItem: React.FC<InfoItemProps> = ({ label, value, mono, subtext }) => {
  if (!value) return null;

  return (
    <div>
      <dt className="font-semibold text-text-100 mb-2">{label}</dt>
      <dd className={`text-text-200 ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </dd>
      {subtext && <p className="text-xs text-text-200 mt-1">{subtext}</p>}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
export const VehicleDetails: React.FC = () => {
  // DEBUG: Component render
  console.log("🚗 [VehicleDetails] ========== COMPONENT RENDER ==========");

  // Router hooks
  const { id } = useParams<{ id: string }>();
  console.log("🚗 [VehicleDetails] URL param id:", id);

  const navigate = useNavigate();

  // Auth - get loading state too!
  const { currentUser, loading: authLoading } = useAuth();
  console.log("🚗 [VehicleDetails] Auth state:", {
    hasUser: !!currentUser,
    userId: currentUser?.id?.slice(0, 8),
    authLoading,
  });

  // State
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">(
    "login"
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
    return `${vehicle.name} - ${vehicle.specifications.brand} ${vehicle.specifications.model} | 4A Rentals`;
  }, [loading, error, vehicle]);

  const pageDescription = useMemo(() => {
    if (!vehicle) return "Vehicle details";
    return `Rent the ${vehicle.specifications.year} ${vehicle.specifications.brand} ${vehicle.specifications.model}. ${vehicle.specifications.seats} seats, ${vehicle.specifications.transmission} transmission, ${vehicle.specifications.fuelType} fuel. Starting at $${vehicle.price}/month.`;
  }, [vehicle]);

  // Memoized print data
  const vehiclePrintData = useMemo(() => {
    if (!vehicle) return null;
    return mapToVehiclePrintData(vehicle);
  }, [vehicle]);

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
    if (currentUser) {
      setIsBookingModalOpen(true);
    } else {
      setIsAuthModalOpen(true);
    }
  }, [currentUser]);

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

  // ============================================
  // DATA FETCHING
  // ============================================
  useEffect(() => {
    // Create a unique ID for this effect instance
    const effectId = Math.random().toString(36).slice(2, 8);
    console.log(`🔵 [VehicleDetails] useEffect START (id: ${effectId})`);
    console.log(`🔵 [VehicleDetails] Current id param: ${id}`);

    // Track if this effect instance is still active
    let cancelled = false;

    if (!id) {
      console.log(`🔵 [VehicleDetails] No ID provided, setting error`);
      setError("Vehicle ID not provided");
      setLoading(false);
      return;
    }

    const fetchVehicle = async () => {
      console.log(
        `🟡 [VehicleDetails] fetchVehicle START (effectId: ${effectId})`
      );

      try {
        setLoading(true);
        setError(null);

        console.log(
          `🟡 [VehicleDetails] Calling vehicleService.getVehicle("${id}")...`
        );
        const startTime = Date.now();

        const vehicleData = await vehicleService.getVehicle(id);

        const endTime = Date.now();
        console.log(
          `🟡 [VehicleDetails] vehicleService returned in ${
            endTime - startTime
          }ms`
        );
        console.log(
          `🟡 [VehicleDetails] cancelled=${cancelled}, vehicleData=${!!vehicleData}`
        );

        // Check if this effect was cancelled while we were fetching
        if (cancelled) {
          console.log(
            `🟠 [VehicleDetails] Effect was CANCELLED, ignoring result`
          );
          return;
        }

        if (vehicleData) {
          if (vehicleData.status !== "available") {
            console.log(
              `🟡 [VehicleDetails] Vehicle not available, status: ${vehicleData.status}`
            );
            setError("This vehicle is not currently available for booking");
            setVehicle(null);
          } else {
            console.log(
              `🟢 [VehicleDetails] SUCCESS! Setting vehicle: ${vehicleData.name}`
            );
            setVehicle(vehicleData);
          }
        } else {
          console.log(`🔴 [VehicleDetails] Vehicle not found`);
          setError("Vehicle not found");
        }
      } catch (err) {
        if (cancelled) {
          console.log(
            `🟠 [VehicleDetails] Effect was CANCELLED during error handling`
          );
          return;
        }
        console.error(`🔴 [VehicleDetails] Fetch ERROR:`, err);
        logError("Failed to fetch vehicle", err);
        setError("Failed to load vehicle details");
      } finally {
        if (!cancelled) {
          console.log(`🟡 [VehicleDetails] Setting loading=false`);
          setLoading(false);
        }
      }
    };

    fetchVehicle();

    // Cleanup function
    return () => {
      console.log(`🧹 [VehicleDetails] useEffect CLEANUP (id: ${effectId})`);
      cancelled = true;
    };
  }, [id]);

  // DEBUG: Log current state
  console.log("🚗 [VehicleDetails] Current state:", {
    loading,
    error,
    hasVehicle: !!vehicle,
  });

  // ============================================
  // RENDER - LOADING STATE
  // ============================================
  if (loading) {
    console.log("🚗 [VehicleDetails] Rendering LOADING state");
    return (
      <div className="min-h-screen bg-bg-100 flex items-center justify-center">
        <Helmet>
          <title>{pageTitle}</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <div className="text-center" role="status" aria-live="polite">
          <div className="flex justify-center mb-4">
            <Loader />
          </div>
          <p className="font-body text-text-200">Loading vehicle details...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER - ERROR STATE
  // ============================================
  if (error || !vehicle) {
    console.log("🚗 [VehicleDetails] Rendering ERROR state:", error);
    return (
      <div className="min-h-screen bg-bg-100 flex items-center justify-center">
        <Helmet>
          <title>{pageTitle}</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <div className="text-center" role="alert">
          <h1 className="font-heading text-3xl text-text-100 mb-4 uppercase">
            Vehicle Not Available
          </h1>
          <p className="font-body text-text-200 mb-6">
            {error || "The vehicle you are looking for is not available."}
          </p>
          <Button onClick={handleGoHome} variant="primary">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  console.log("🚗 [VehicleDetails] Rendering MAIN content for:", vehicle.name);

  // ============================================
  // RENDER - MAIN CONTENT
  // ============================================
  return (
    <div className="min-h-screen bg-bg-100">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={`https://4arentals.com/vehicle/${id}`} />
      </Helmet>

      <Navbar onAuthModalOpen={handleAuthModalOpen} />

      <main id="main-content">
        <div className="pt-32 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Back Button & Print Button */}
            <nav
              aria-label="Breadcrumb"
              className="mb-8 flex items-center justify-between"
            >
              <button
                type="button"
                onClick={handleGoBack}
                className="flex items-center gap-2 font-body text-text-200 hover:text-primary-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 rounded-lg px-2 py-1"
                aria-label="Go back to previous page"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>Back</span>
              </button>

              {/* Print Button */}
              {vehiclePrintData && (
                <PrintButton
                  content={<VehicleDetailsPrint data={vehiclePrintData} />}
                  title={vehicle.name}
                  variant="secondary"
                  size="sm"
                  label="Print Details"
                  showPreview={true}
                />
              )}
            </nav>

            {/* Vehicle Image Gallery */}
            <section aria-label="Vehicle images" className="mb-8">
              {/* Main Image */}
              <div className="relative">
                <img
                  src={images[currentImageIndex]}
                  alt={`${vehicle.name} - Image ${currentImageIndex + 1} of ${
                    images.length
                  }`}
                  className="w-full h-96 object-cover rounded-2xl"
                />

                {/* Navigation Arrows */}
                {hasMultipleImages && (
                  <>
                    <button
                      type="button"
                      onClick={handlePreviousImage}
                      aria-label="Previous image"
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200"
                    >
                      <ArrowLeft
                        className="w-5 h-5 text-text-100"
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextImage}
                      aria-label="Next image"
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200"
                    >
                      <ArrowRight
                        className="w-5 h-5 text-text-100"
                        aria-hidden="true"
                      />
                    </button>
                  </>
                )}

                {/* Image Counter */}
                {hasMultipleImages && (
                  <div
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-body"
                    aria-live="polite"
                  >
                    {currentImageIndex + 1} / {images.length}
                  </div>
                )}
              </div>

              {/* Thumbnail Strip */}
              {hasMultipleImages && (
                <div
                  className="flex gap-3 mt-4 overflow-x-auto pb-2"
                  role="group"
                  aria-label="Image thumbnails"
                >
                  {images.map((img, index) => (
                    <button
                      key={`thumbnail-${index}`}
                      type="button"
                      onClick={() => handleThumbnailClick(index)}
                      aria-label={`View image ${index + 1}`}
                      aria-pressed={currentImageIndex === index}
                      className={`flex-shrink-0 w-24 h-20 rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 ${
                        currentImageIndex === index
                          ? "border-primary-200 shadow-md"
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

            <div className="grid lg:grid-cols-3 gap-12">
              {/* Main Content */}
              <div className="lg:col-span-2">
                {/* Title and Price */}
                <header className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
                  <div>
                    <h1 className="font-heading text-4xl text-text-100 mb-2 uppercase tracking-wide">
                      {vehicle.name}
                    </h1>
                    <p className="font-body text-xl text-text-200 capitalize">
                      {vehicle.category} Vehicle
                    </p>
                    <div className="mt-2">
                      <StarRating rating={RATING} />
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-heading text-4xl font-bold text-text-100">
                      <span className="sr-only">Price: </span>${vehicle.price}
                    </p>
                    <p className="font-body text-text-200">/month</p>
                  </div>
                </header>

                {/* Specifications Grid */}
                <section aria-labelledby="specs-heading" className="mb-8">
                  <h2 id="specs-heading" className="sr-only">
                    Vehicle Specifications
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <SpecCard
                      icon={<Users className="w-8 h-8 text-blue-600" />}
                      label="Seats"
                      value={vehicle.specifications.seats}
                    />
                    <SpecCard
                      icon={<Settings className="w-8 h-8 text-green-600" />}
                      label="Transmission"
                      value={vehicle.specifications.transmission}
                    />
                    <SpecCard
                      icon={<Fuel className="w-8 h-8 text-purple-600" />}
                      label="Fuel Type"
                      value={vehicle.specifications.fuelType}
                    />
                    <SpecCard
                      icon={<Calendar className="w-8 h-8 text-orange-600" />}
                      label="Year"
                      value={vehicle.specifications.year}
                    />
                    {vehicle.specifications.color && (
                      <SpecCard
                        icon={
                          <div className="w-8 h-8 bg-bg-300 rounded-full" />
                        }
                        label="Color"
                        value={vehicle.specifications.color}
                      />
                    )}
                    {vehicle.specifications.cylinders && (
                      <SpecCard
                        icon={<Settings className="w-8 h-8 text-red-600" />}
                        label="Cylinders"
                        value={vehicle.specifications.cylinders}
                      />
                    )}
                  </div>
                </section>

                {/* Vehicle Information */}
                <Card variant="default" padding="lg" className="mb-8">
                  <h2 className="font-heading text-2xl text-text-100 mb-6 uppercase tracking-wide">
                    Vehicle Information
                  </h2>
                  <dl className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 font-body text-sm">
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
                      label="Transmission"
                      value={vehicle.specifications.transmission}
                    />
                    <InfoItem
                      label="Cylinders"
                      value={vehicle.specifications.cylinders}
                    />
                    <InfoItem
                      label="VIN"
                      value={vehicle.specifications.vin}
                      mono
                    />
                    <InfoItem
                      label="Engine"
                      value={vehicle.specifications.engine}
                    />
                    {vehicle.specifications.mileage && (
                      <InfoItem
                        label="Mileage"
                        value={`${vehicle.specifications.mileage.toLocaleString()} miles`}
                      />
                    )}
                    <InfoItem
                      label="Stock #"
                      value={vehicle.specifications.stockNumber}
                    />
                    <InfoItem
                      label="Fuel Economy"
                      value={vehicle.specifications.fuelEconomy}
                      subtext="Estimated By E.P.A. - Actual Mileage May Vary"
                    />
                  </dl>
                </Card>

                {/* Features */}
                <Card variant="default" padding="lg">
                  <h2 className="font-heading text-2xl text-text-100 mb-6 uppercase tracking-wide">
                    Features & Amenities
                  </h2>
                  <ul className="grid md:grid-cols-2 gap-4" role="list">
                    {vehicle.features.map((feature, index) => (
                      <li
                        key={`feature-${index}`}
                        className="flex items-center gap-3"
                      >
                        <CheckCircle
                          className="w-5 h-5 text-green-500 flex-shrink-0"
                          aria-hidden="true"
                        />
                        <span className="font-body text-text-100">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>

              {/* Sidebar */}
              <aside className="lg:col-span-1" aria-label="Booking">
                <Card variant="default" padding="lg" className="sticky top-32">
                  <div className="text-center mb-6">
                    <p className="font-heading text-4xl font-bold text-text-100 mb-2">
                      <span className="sr-only">Price: </span>${vehicle.price}
                    </p>
                    <p className="font-body text-text-200">/month</p>
                    <div className="flex justify-center mt-3">
                      <StarRating rating={RATING} size="sm" />
                    </div>
                  </div>

                  <Button
                    onClick={handleBookingModalOpen}
                    variant="primary"
                    fullWidth
                    size="lg"
                    className="mb-4"
                  >
                    {currentUser ? "Book This Vehicle" : "Sign In to Book"}
                  </Button>

                  {/* Print Button in Sidebar */}
                  {vehiclePrintData && (
                    <PrintButton
                      content={<VehicleDetailsPrint data={vehiclePrintData} />}
                      title={vehicle.name}
                      variant="secondary"
                      size="md"
                      label="Print Vehicle Details"
                      showPreview={true}
                      className="w-full mb-6"
                    />
                  )}

                  <div className="border-t border-bg-200 pt-6">
                    <h3 className="font-heading text-sm uppercase tracking-wide text-text-100 mb-4">
                      Need Help?
                    </h3>
                    <address className="not-italic space-y-3">
                      <a
                        href={CONTACT_INFO.phoneHref}
                        className="flex items-center gap-3 font-body text-sm text-text-200 hover:text-primary-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 rounded"
                      >
                        <Phone
                          className="w-4 h-4 flex-shrink-0"
                          aria-hidden="true"
                        />
                        <span>{CONTACT_INFO.phone}</span>
                      </a>
                      <a
                        href={`mailto:${CONTACT_INFO.email}`}
                        className="flex items-center gap-3 font-body text-sm text-text-200 hover:text-primary-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 rounded"
                      >
                        <Mail
                          className="w-4 h-4 flex-shrink-0"
                          aria-hidden="true"
                        />
                        <span>{CONTACT_INFO.email}</span>
                      </a>
                      <p className="flex items-center gap-3 font-body text-sm text-text-200">
                        <MapPin
                          className="w-4 h-4 flex-shrink-0"
                          aria-hidden="true"
                        />
                        <span>{CONTACT_INFO.location}</span>
                      </p>
                    </address>
                  </div>
                </Card>
              </aside>
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
