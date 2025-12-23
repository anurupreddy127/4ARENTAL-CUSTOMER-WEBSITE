import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Car } from "lucide-react";
import { useVehicles } from "@/hooks/useVehicles";
import { useAuth } from "@/hooks/useAuth";
import { BookingModal } from "@/components/modals/BookingModal";
import { Vehicle } from "@/types";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { VehicleCard } from "@/components/ui/VehicleCard";

// ============================================
// TYPES
// ============================================
interface VehicleGridProps {
  onAuthModalOpen: (mode: "login" | "register") => void;
}

interface CategoryOption {
  value: string;
  label: string;
}

// ============================================
// CONSTANTS
// ============================================
const CATEGORIES: CategoryOption[] = [
  { value: "all", label: "All" },
  { value: "economy", label: "Economy" },
  { value: "suv", label: "SUV" },
  { value: "luxury", label: "Luxury" },
];

// ============================================
// COMPONENT
// ============================================
export const VehicleGrid: React.FC<VehicleGridProps> = ({
  onAuthModalOpen,
}) => {
  // State
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [bookingVehicle, setBookingVehicle] = useState<Vehicle | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Hooks
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const {
    vehicles: allVehicles,
    loading: vehiclesLoading,
    error: vehiclesError,
    refetch,
  } = useVehicles(selectedCategory);

  // ============================================
  // MEMOIZED VALUES
  // ============================================
  const filteredVehicles = useMemo(() => {
    if (selectedCategory === "all") {
      return allVehicles;
    }
    return allVehicles.filter(
      (vehicle) => vehicle.category === selectedCategory
    );
  }, [allVehicles, selectedCategory]);

  const isAuthenticated = useMemo(() => Boolean(currentUser), [currentUser]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
  }, []);

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
        onAuthModalOpen("login");
      }
    },
    [currentUser, onAuthModalOpen]
  );

  const handleBookingModalClose = useCallback(() => {
    setIsBookingModalOpen(false);
    setBookingVehicle(null);
    refetch();
  }, [refetch]);

  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  // ============================================
  // RENDER
  // ============================================
  const sectionHeadingId = "vehicle-grid-heading";

  return (
    <>
      <section
        id="vehicles"
        className="py-16 bg-bg-100"
        aria-labelledby={sectionHeadingId}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <header className="text-center mb-12">
            <h2
              id={sectionHeadingId}
              className="font-heading text-4xl text-text-100 mb-4"
            >
              Our Vehicle Categories
            </h2>
            <p className="font-body text-lg text-text-200">
              Choose from our diverse fleet of vehicles
            </p>
          </header>

          {/* Category Tabs */}
          <nav
            className="flex justify-center mb-12"
            aria-label="Vehicle categories"
          >
            <div
              className="bg-white p-1 rounded-full shadow-sm border border-bg-200"
              role="group"
              aria-label="Filter by category"
            >
              {CATEGORIES.map((category) => (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => handleCategoryChange(category.value)}
                  aria-pressed={selectedCategory === category.value}
                  className={`px-6 py-2.5 rounded-full font-body font-medium transition-all text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 focus-visible:ring-offset-2 ${
                    selectedCategory === category.value
                      ? "bg-primary-100 text-text-100 shadow-sm"
                      : "text-text-200 hover:text-text-100"
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Loading State */}
          {vehiclesLoading && (
            <div className="text-center py-12" role="status" aria-live="polite">
              <div className="flex justify-center">
                <Loader />
              </div>
              <p className="mt-4 text-text-200 font-body">
                Loading vehicles...
              </p>
            </div>
          )}

          {/* Error State */}
          {!vehiclesLoading && vehiclesError && (
            <div className="text-center py-12" role="alert">
              <p className="text-red-600 mb-4 font-body">
                Error loading vehicles: {vehiclesError}
              </p>
              <Button onClick={handleRetry} variant="primary">
                Retry
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!vehiclesLoading &&
            !vehiclesError &&
            filteredVehicles.length === 0 && (
              <div className="text-center py-12" role="status">
                <Car
                  className="w-16 h-16 text-bg-300 mx-auto mb-4"
                  aria-hidden="true"
                />
                <p className="text-text-200 font-body">
                  No vehicles available in this category
                </p>
              </div>
            )}

          {/* Vehicle Grid */}
          {!vehiclesLoading &&
            !vehiclesError &&
            filteredVehicles.length > 0 && (
              <ul
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-12 list-none p-0 m-0"
                role="list"
                aria-label={`${filteredVehicles.length} vehicles in ${
                  selectedCategory === "all"
                    ? "all categories"
                    : selectedCategory
                }`}
              >
                {filteredVehicles.map((vehicle) => (
                  <li key={vehicle.id}>
                    <VehicleCard
                      vehicle={vehicle}
                      onCardClick={() => handleVehicleClick(vehicle)}
                      onBookClick={(e) => handleBookingModalOpen(vehicle, e)}
                      isAuthenticated={isAuthenticated}
                    />
                  </li>
                ))}
              </ul>
            )}
        </div>
      </section>

      {/* Booking Modal */}
      <BookingModal
        vehicle={bookingVehicle}
        isOpen={isBookingModalOpen}
        onClose={handleBookingModalClose}
      />
    </>
  );
};
