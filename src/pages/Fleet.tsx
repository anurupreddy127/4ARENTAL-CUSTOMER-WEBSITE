/* eslint-disable @typescript-eslint/no-unused-vars */
// Fleet.tsx
import React, { useState, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Car } from "lucide-react";
import { Navbar, Footer } from "@/components/layout";
import { useVehicles } from "@/hooks/useVehicles";
import { useAuth } from "@/hooks/useAuth";
import { Vehicle } from "@/types";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { VehicleCard } from "@/components/ui/VehicleCard";

// Lazy load modals - only loaded when needed
const BookingModal = lazy(() =>
  import("@/components/modals/BookingModal").then((m) => ({
    default: m.BookingModal,
  }))
);
const AuthModal = lazy(() =>
  import("@/components/modals/AuthModal").then((m) => ({
    default: m.AuthModal,
  }))
);

// Constants
const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "economy", label: "Economy" },
  { value: "suv", label: "SUV" },
  { value: "electric", label: "Electric" },
] as const;

type CategoryValue = (typeof CATEGORIES)[number]["value"];

export const Fleet: React.FC = () => {
  // Auth state
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Filter state
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryValue>("all");

  // Booking state
  const [bookingVehicle, setBookingVehicle] = useState<Vehicle | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const {
    vehicles: allVehicles,
    loading,
    error,
    refetch,
  } = useVehicles(selectedCategory);

  // Memoized filtered vehicles
  const filteredVehicles = React.useMemo(() => {
    if (selectedCategory === "all") {
      return allVehicles;
    }
    return allVehicles.filter(
      (vehicle) => vehicle.category.toLowerCase() === selectedCategory
    );
  }, [allVehicles, selectedCategory]);

  // Stable handler references
  const handleVehicleClick = useCallback(
    (vehicle: Vehicle) => {
      navigate(`/vehicle/${vehicle.id}`);
    },
    [navigate]
  );

  const handleBookingModalOpen = useCallback(
    (vehicle: Vehicle, e: React.MouseEvent) => {
      e.stopPropagation();
      if (currentUser) {
        setBookingVehicle(vehicle);
        setIsBookingModalOpen(true);
      } else {
        setShowAuthModal(true);
      }
    },
    [currentUser]
  );

  const handleBookingModalClose = useCallback(() => {
    setIsBookingModalOpen(false);
    setBookingVehicle(null);
    refetch();
  }, [refetch]);

  const handleAuthModalOpen = useCallback((_mode: "login" | "register") => {
    setShowAuthModal(true);
  }, []);

  const handleAuthModalClose = useCallback(() => {
    setShowAuthModal(false);
  }, []);

  const handleCategoryChange = useCallback((category: CategoryValue) => {
    setSelectedCategory(category);
  }, []);

  return (
    <div className="min-h-screen bg-bg-100">
      <Helmet>
        <title>Our Fleet</title>
        <meta
          name="description"
          content="Browse our diverse fleet of rental vehicles. From budget-friendly economy cars to spacious SUVs and eco-friendly electric vehicles. All well-maintained and ready for your journey."
        />
        <meta property="og:title" content="Our Fleet | 4A Rentals" />
        <meta
          property="og:description"
          content="Browse our diverse fleet of rental vehicles."
        />
        <link rel="canonical" href="https://4arentals.com/fleet" />
      </Helmet>

      <Navbar onAuthModalOpen={handleAuthModalOpen} />

      <main id="main-content">
        {/* Hero Section */}
        <section
          className="pt-32 pb-8 bg-white"
          aria-labelledby="fleet-heading"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1
                id="fleet-heading"
                className="font-heading text-4xl lg:text-5xl text-text-100 mb-6 uppercase tracking-wide"
              >
                Our Fleet
              </h1>
              <p className="font-body text-xl text-text-200 max-w-3xl mx-auto leading-relaxed">
                Choose from our diverse collection of vehicles, from
                budget-friendly economy cars to sedans. All vehicles are
                regularly maintained and thoroughly cleaned.
              </p>
            </div>
          </div>
        </section>

        {/* Category Filter */}
        <section
          className="py-8 bg-bg-100"
          aria-label="Vehicle category filter"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center mb-8">
              <div
                className="bg-white p-1 rounded-full shadow-sm border border-bg-200"
                role="group"
                aria-label="Filter by vehicle category"
              >
                {CATEGORIES.map((category) => (
                  <button
                    key={category.value}
                    onClick={() => handleCategoryChange(category.value)}
                    aria-pressed={selectedCategory === category.value}
                    className={`px-6 py-2.5 rounded-full font-body font-medium transition-all text-sm ${
                      selectedCategory === category.value
                        ? "bg-primary-100 text-text-100 shadow-sm"
                        : "text-text-200 hover:text-text-100"
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Fleet Grid */}
        <section className="pb-16 bg-bg-100" aria-label="Available vehicles">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="text-center py-12" aria-live="polite">
                <div className="flex justify-center">
                  <Loader />
                </div>
                <p className="mt-4 font-body text-text-200">
                  Loading vehicles...
                </p>
              </div>
            ) : error ? (
              <div className="text-center py-12" role="alert">
                <p className="font-body text-red-600 mb-4">
                  Error loading vehicles. Please try again.
                </p>
                <Button onClick={refetch} variant="primary">
                  Retry
                </Button>
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="text-center py-12">
                <Car
                  className="w-16 h-16 text-bg-300 mx-auto mb-4"
                  aria-hidden="true"
                />
                <p className="font-body text-text-200">
                  No vehicles available in this category
                </p>
              </div>
            ) : (
              <div
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-12"
                role="list"
                aria-label={`${filteredVehicles.length} vehicles available`}
              >
                {filteredVehicles.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    onCardClick={() => handleVehicleClick(vehicle)}
                    onBookClick={(e) => handleBookingModalOpen(vehicle, e)}
                    isAuthenticated={!!currentUser}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />

      {/* Lazy-loaded Modals - only render when open */}
      {showAuthModal && (
        <Suspense fallback={null}>
          <AuthModal isOpen={showAuthModal} onClose={handleAuthModalClose} />
        </Suspense>
      )}

      {isBookingModalOpen && bookingVehicle && (
        <Suspense fallback={null}>
          <BookingModal
            vehicle={bookingVehicle}
            isOpen={isBookingModalOpen}
            onClose={handleBookingModalClose}
          />
        </Suspense>
      )}
    </div>
  );
};
