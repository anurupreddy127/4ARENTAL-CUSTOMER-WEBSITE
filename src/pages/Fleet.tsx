/* eslint-disable @typescript-eslint/no-unused-vars */
import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  lazy,
  Suspense,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Car,
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Navbar, Footer } from "@/components/layout";
import { useVehicles } from "@/hooks/useVehicles";
import { useAuth } from "@/hooks/useAuth";
import { Vehicle } from "@/types";
import { Loader, Button, Input, Checkbox, Select } from "@/components/ui";
import { VehicleCard } from "@/components/ui/VehicleCard";

// Lazy load modals
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

// ============================================
// TYPES
// ============================================
type PricingMode = "daily" | "weekly" | "monthly" | "semester";
type SortOption = "recommended" | "price-low" | "price-high" | "newest";

interface FilterState {
  categories: string[];
  minPrice: string;
  maxPrice: string;
  pricingMode: PricingMode;
  search: string;
  sort: SortOption;
}

// ============================================
// CONSTANTS
// ============================================
const VEHICLE_CATEGORIES = [
  { value: "sedan", label: "Sedan" },
  { value: "suv", label: "SUV" },
  { value: "electric", label: "Electric" },
  { value: "hybrid", label: "Hybrid" },
] as const;

const PRICING_MODE_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "semester", label: "Semester (Students)" },
] as const;

const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "newest", label: "Newest First" },
] as const;

const PRICING_MODE_TO_UNIT: Record<
  PricingMode,
  "day" | "week" | "month" | "semester"
> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
  semester: "semester",
};

// ============================================
// HELPER FUNCTIONS
// ============================================
const getVehiclePrice = (vehicle: Vehicle, mode: PricingMode): number => {
  // Access the raw vehicle data for pricing columns
  const vehicleAny = vehicle as unknown as Record<string, unknown>;

  switch (mode) {
    case "daily":
      return (
        (vehicleAny.daily_rate as number) ||
        (vehicleAny.dailyRate as number) ||
        vehicle.price / 30
      );
    case "weekly":
      return (
        (vehicleAny.weekly_rate as number) ||
        (vehicleAny.weeklyRate as number) ||
        vehicle.price / 4
      );
    case "semester":
      return (
        (vehicleAny.semester_rate as number) ||
        (vehicleAny.semesterRate as number) ||
        vehicle.price * 4
      );
    case "monthly":
    default:
      return (
        (vehicleAny.monthly_rate as number) ||
        (vehicleAny.monthlyRate as number) ||
        vehicle.price
      );
  }
};

const parseCategories = (param: string | null): string[] => {
  if (!param) return [];
  return param.split(",").filter(Boolean);
};

// ============================================
// COMPONENT
// ============================================
export const Fleet: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [bookingVehicle, setBookingVehicle] = useState<Vehicle | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Mobile filter drawer state
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Initialize filters from URL params
  const [filters, setFilters] = useState<FilterState>(() => ({
    categories: parseCategories(searchParams.get("category")),
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    pricingMode: (searchParams.get("priceMode") as PricingMode) || "monthly",
    search: searchParams.get("search") || "",
    sort: (searchParams.get("sort") as SortOption) || "recommended",
  }));

  // Fetch all vehicles (we'll filter client-side for flexibility)
  const { vehicles: allVehicles, loading, error, refetch } = useVehicles();

  // ============================================
  // URL SYNC
  // ============================================
  useEffect(() => {
    const params = new URLSearchParams();

    if (filters.categories.length > 0) {
      params.set("category", filters.categories.join(","));
    }
    if (filters.minPrice) {
      params.set("minPrice", filters.minPrice);
    }
    if (filters.maxPrice) {
      params.set("maxPrice", filters.maxPrice);
    }
    if (filters.pricingMode !== "monthly") {
      params.set("priceMode", filters.pricingMode);
    }
    if (filters.search) {
      params.set("search", filters.search);
    }
    if (filters.sort !== "recommended") {
      params.set("sort", filters.sort);
    }

    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  // ============================================
  // FILTERED & SORTED VEHICLES
  // ============================================
  const filteredVehicles = useMemo(() => {
    let result = [...allVehicles];

    // Filter by search
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase().trim();
      result = result.filter((v) => {
        const name = v.name.toLowerCase();
        const brand = v.specifications?.brand?.toLowerCase() || "";
        const model = v.specifications?.model?.toLowerCase() || "";
        return (
          name.includes(searchLower) ||
          brand.includes(searchLower) ||
          model.includes(searchLower)
        );
      });
    }

    // Filter by categories
    if (filters.categories.length > 0) {
      result = result.filter((v) =>
        filters.categories.includes(v.category.toLowerCase())
      );
    }

    // Filter by price range
    const minPrice = filters.minPrice ? parseFloat(filters.minPrice) : null;
    const maxPrice = filters.maxPrice ? parseFloat(filters.maxPrice) : null;

    if (minPrice !== null || maxPrice !== null) {
      result = result.filter((v) => {
        const price = getVehiclePrice(v, filters.pricingMode);
        if (minPrice !== null && price < minPrice) return false;
        if (maxPrice !== null && price > maxPrice) return false;
        return true;
      });
    }

    // Sort
    switch (filters.sort) {
      case "price-low":
        result.sort(
          (a, b) =>
            getVehiclePrice(a, filters.pricingMode) -
            getVehiclePrice(b, filters.pricingMode)
        );
        break;
      case "price-high":
        result.sort(
          (a, b) =>
            getVehiclePrice(b, filters.pricingMode) -
            getVehiclePrice(a, filters.pricingMode)
        );
        break;
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "recommended":
      default:
        // Keep original order
        break;
    }

    return result;
  }, [allVehicles, filters]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilters((prev) => ({ ...prev, search: e.target.value }));
    },
    []
  );

  const handleCategoryToggle = useCallback((category: string) => {
    setFilters((prev) => {
      const exists = prev.categories.includes(category);
      return {
        ...prev,
        categories: exists
          ? prev.categories.filter((c) => c !== category)
          : [...prev.categories, category],
      };
    });
  }, []);

  const handleMinPriceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/[^0-9]/g, "");
      setFilters((prev) => ({ ...prev, minPrice: value }));
    },
    []
  );

  const handleMaxPriceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/[^0-9]/g, "");
      setFilters((prev) => ({ ...prev, maxPrice: value }));
    },
    []
  );

  const handlePricingModeChange = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, pricingMode: value as PricingMode }));
  }, []);

  const handleSortChange = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, sort: value as SortOption }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      categories: [],
      minPrice: "",
      maxPrice: "",
      pricingMode: "monthly",
      search: "",
      sort: "recommended",
    });
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

  const toggleFilters = useCallback(() => {
    setIsFilterOpen((prev) => !prev);
  }, []);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.categories.length > 0 ||
      filters.minPrice !== "" ||
      filters.maxPrice !== "" ||
      filters.pricingMode !== "monthly" ||
      filters.search !== ""
    );
  }, [filters]);

  // ============================================
  // RENDER: FILTER SECTION
  // ============================================
  const renderFilters = () => (
    <div className="space-y-6">
      {/* Car Type */}
      <div>
        <h3 className="text-sm font-semibold text-text-100 mb-3 uppercase tracking-wide">
          Car Type
        </h3>
        <div className="space-y-2">
          {VEHICLE_CATEGORIES.map((category) => (
            <Checkbox
              key={category.value}
              checked={filters.categories.includes(category.value)}
              onChange={() => handleCategoryToggle(category.value)}
              label={category.label}
            />
          ))}
        </div>
      </div>

      {/* Pricing Mode */}
      <div>
        <h3 className="text-sm font-semibold text-text-100 mb-3 uppercase tracking-wide">
          Pricing
        </h3>
        <Select
          value={filters.pricingMode}
          onChange={handlePricingModeChange}
          options={PRICING_MODE_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
          }))}
          placeholder="Select pricing"
        />
      </div>

      {/* Price Range */}
      <div>
        <h3 className="text-sm font-semibold text-text-100 mb-3 uppercase tracking-wide">
          Price Range
        </h3>
        <div className="flex gap-2 items-center">
          <Input
            type="text"
            placeholder="Min"
            value={filters.minPrice}
            onChange={handleMinPriceChange}
            className="text-center"
            aria-label="Minimum price"
          />
          <span className="text-text-200">—</span>
          <Input
            type="text"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={handleMaxPriceChange}
            className="text-center"
            aria-label="Maximum price"
          />
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="w-full text-text-200 hover:text-text-100"
        >
          Clear All Filters
        </Button>
      )}
    </div>
  );

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-bg-100">
      <Helmet>
        <title>Our Fleet</title>
        <meta
          name="description"
          content="Browse our diverse fleet of rental vehicles. From budget-friendly sedans to spacious SUVs and eco-friendly electric vehicles. All well-maintained and ready for your journey."
        />
        <meta property="og:title" content="Our Fleet | 4A Rentals" />
        <meta
          property="og:description"
          content="Browse our diverse fleet of rental vehicles."
        />
        <link rel="canonical" href="https://4arentals.com/fleet" />
      </Helmet>

      <Navbar onAuthModalOpen={handleAuthModalOpen} />

      <main id="main-content" className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <header className="mb-8 text-center">
            <h1 className="font-heading text-3xl lg:text-4xl text-text-100 mb-2 uppercase tracking-wide">
              Our Fleet
            </h1>
            <p className="font-body text-text-200">
              Find the perfect vehicle for your next journey
            </p>
          </header>

          {/* Search and Sort Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search by make, model, or name..."
                value={filters.search}
                onChange={handleSearchChange}
                icon={<Search className="w-5 h-5" />}
                aria-label="Search vehicles"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="w-full sm:w-48">
              <Select
                value={filters.sort}
                onChange={handleSortChange}
                options={SORT_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
              />
            </div>
          </div>

          {/* Mobile Filter Toggle */}
          <div className="lg:hidden mb-6">
            <button
              onClick={toggleFilters}
              className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl border border-bg-200 w-full justify-between"
              aria-expanded={isFilterOpen}
              aria-controls="mobile-filters"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-text-100">
                <SlidersHorizontal className="w-5 h-5" />
                Filters
                {hasActiveFilters && (
                  <span className="bg-primary-100 text-text-100 text-xs px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </span>
              {isFilterOpen ? (
                <ChevronUp className="w-5 h-5 text-text-200" />
              ) : (
                <ChevronDown className="w-5 h-5 text-text-200" />
              )}
            </button>

            {/* Mobile Filters Panel */}
            {isFilterOpen && (
              <div
                id="mobile-filters"
                className="mt-4 p-4 bg-white rounded-xl border border-bg-200"
              >
                {renderFilters()}
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex gap-8">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="bg-white rounded-xl border border-bg-200 p-5 sticky top-28">
                <h2 className="text-sm font-semibold text-text-100 mb-4 uppercase tracking-wide flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                </h2>
                {renderFilters()}
              </div>
            </aside>

            {/* Vehicle Grid */}
            <section className="flex-1" aria-label="Available vehicles">
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
                  <p className="font-body text-text-200 mb-4">
                    No vehicles match your filters
                  </p>
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearFilters}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Results Count */}
                  <p className="text-sm text-text-200 mb-4">
                    {filteredVehicles.length} vehicle
                    {filteredVehicles.length !== 1 ? "s" : ""} found
                  </p>

                  {/* Grid */}
                  <div
                    className="grid md:grid-cols-2 xl:grid-cols-3 gap-8"
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
                        displayPrice={Math.round(
                          getVehiclePrice(vehicle, filters.pricingMode)
                        )}
                        priceUnit={PRICING_MODE_TO_UNIT[filters.pricingMode]}
                      />
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </main>

      <Footer />

      {/* Modals */}
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
