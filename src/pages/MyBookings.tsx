/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import * as Sentry from "@sentry/react";
import {
  Calendar,
  MapPin,
  Clock,
  DollarSign,
  Car,
  AlertCircle,
  CheckCircle,
  XCircle,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBookings } from "@/hooks";
import { Booking } from "@/types";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Navbar, Footer } from "@/components/layout";

// ============================================
// CONSTANTS
// ============================================
const FILTER_TABS = [
  { value: "all", label: "All Bookings" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

type FilterValue = (typeof FILTER_TABS)[number]["value"];

// ============================================
// STATUS BADGE CONFIGURATION
// ============================================
interface StatusBadgeConfig {
  bg: string;
  text: string;
  icon: React.ReactNode;
  label: string;
}

const STATUS_BADGES: Record<Booking["status"], StatusBadgeConfig> = {
  pending: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    icon: <Clock className="w-4 h-4" aria-hidden="true" />,
    label: "Pending",
  },
  confirmed: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    icon: <CheckCircle className="w-4 h-4" aria-hidden="true" />,
    label: "Confirmed",
  },
  active: {
    bg: "bg-green-100",
    text: "text-green-800",
    icon: <Car className="w-4 h-4" aria-hidden="true" />,
    label: "Active",
  },
  inspection: {
    bg: "bg-purple-100",
    text: "text-purple-800",
    icon: <AlertCircle className="w-4 h-4" aria-hidden="true" />,
    label: "Inspection",
  },
  completed: {
    bg: "bg-gray-100",
    text: "text-gray-800",
    icon: <CheckCircle className="w-4 h-4" aria-hidden="true" />,
    label: "Completed",
  },
  cancelled: {
    bg: "bg-red-100",
    text: "text-red-800",
    icon: <XCircle className="w-4 h-4" aria-hidden="true" />,
    label: "Cancelled",
  },
};

// ============================================
// SUB-COMPONENTS
// ============================================

/** Status badge component */
const StatusBadge: React.FC<{ status: Booking["status"] }> = ({ status }) => {
  const badge = STATUS_BADGES[status] || STATUS_BADGES.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-medium ${badge.bg} ${badge.text}`}
    >
      {badge.icon}
      {badge.label}
    </span>
  );
};

/** Info item component for booking details grid */
interface InfoItemProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  subValue?: string;
  isLarge?: boolean;
}

const InfoItem: React.FC<InfoItemProps> = ({
  icon,
  iconBg,
  label,
  value,
  subValue,
  isLarge,
}) => (
  <div className="flex items-start gap-3">
    <div
      className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}
      aria-hidden="true"
    >
      {icon}
    </div>
    <div>
      <p className="font-body text-xs text-text-200 mb-1">{label}</p>
      <p
        className={`font-body ${
          isLarge ? "text-lg font-bold" : "text-sm font-semibold"
        } text-text-100`}
      >
        {value}
      </p>
      {subValue && (
        <p className="font-body text-xs text-text-200">{subValue}</p>
      )}
    </div>
  </div>
);

/** Status message configuration */
interface StatusMessageConfig {
  bg: string;
  border: string;
  text: string;
  content: React.ReactNode;
}

/** Status message component */
const StatusMessage: React.FC<{ status: Booking["status"] }> = ({ status }) => {
  const messages: Partial<Record<Booking["status"], StatusMessageConfig>> = {
    pending: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-800",
      content: (
        <>
          <strong>Pending Confirmation:</strong> We'll contact you within 24
          hours to confirm your reservation and arrange payment.
        </>
      ),
    },
    confirmed: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-800",
      content: (
        <>
          <strong>Confirmed:</strong> Your booking is confirmed! We'll contact
          you before the pickup date with further instructions.
        </>
      ),
    },
    active: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-800",
      content: (
        <>
          <strong>Active Rental:</strong> You currently have this vehicle.
          Please return it by the return date.
        </>
      ),
    },
  };

  const message = messages[status];
  if (!message) return null;

  return (
    <div className={`${message.bg} border ${message.border} rounded-lg p-3`}>
      <p className={`font-body text-sm ${message.text}`}>{message.content}</p>
    </div>
  );
};

// ============================================
// DRIVER TYPES (for type safety)
// ============================================
interface AdditionalDriverDisplay {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  driversLicense: string;
  dateOfBirth: string;
  isVerified?: boolean;
}

interface PrimaryDriverDisplay {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  driversLicense: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
}

interface BookingVehicle {
  name: string;
  image: string | string[];
  specifications: {
    seats: number;
    transmission: string;
    fuelType: string;
  };
}

// ============================================
// BOOKING CARD COMPONENT
// ============================================
interface BookingCardProps {
  booking: Booking;
  vehicle: BookingVehicle | undefined;
  primaryDriver: PrimaryDriverDisplay | undefined;
  additionalDrivers: AdditionalDriverDisplay[] | undefined;
}

const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  vehicle,
  primaryDriver,
  additionalDrivers,
}) => {
  const pickupDate = new Date(booking.pickupDate);
  const returnDate = new Date(booking.returnDate);
  const duration = Math.ceil(
    (returnDate.getTime() - pickupDate.getTime()) / (1000 * 3600 * 24)
  );

  return (
    <Card variant="default" padding="lg">
      <article className="flex flex-col lg:flex-row gap-6">
        {/* Vehicle Image */}
        <div className="lg:w-64 flex-shrink-0">
          {vehicle ? (
            <img
              src={
                Array.isArray(vehicle.image) ? vehicle.image[0] : vehicle.image
              }
              alt={vehicle.name}
              className="w-full h-48 lg:h-full object-cover rounded-xl"
              loading="lazy"
            />
          ) : (
            <div
              className="w-full h-48 lg:h-full bg-bg-200 rounded-xl flex items-center justify-center"
              aria-label="Vehicle image not available"
            >
              <Car className="w-12 h-12 text-bg-300" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Booking Details */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-heading text-2xl text-text-100 mb-2 uppercase">
                {vehicle ? vehicle.name : "Vehicle Details Unavailable"}
              </h3>
              {vehicle && (
                <p className="font-body text-text-200 text-sm capitalize">
                  {vehicle.specifications.seats} seats •{" "}
                  {vehicle.specifications.transmission} •{" "}
                  {vehicle.specifications.fuelType}
                </p>
              )}
            </div>
            <StatusBadge status={booking.status} />
          </div>

          {/* Booking Info Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <InfoItem
              icon={<Calendar className="w-5 h-5 text-blue-600" />}
              iconBg="bg-blue-100"
              label="Pickup Date"
              value={pickupDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              subValue={pickupDate.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            />

            <InfoItem
              icon={<Calendar className="w-5 h-5 text-green-600" />}
              iconBg="bg-green-100"
              label="Return Date"
              value={returnDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              subValue={returnDate.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            />

            <InfoItem
              icon={<Clock className="w-5 h-5 text-purple-600" />}
              iconBg="bg-purple-100"
              label="Duration"
              value={`${duration} ${duration === 1 ? "day" : "days"}`}
              subValue={`(${Math.ceil(duration / 30)} ${
                Math.ceil(duration / 30) === 1 ? "month" : "months"
              })`}
            />

            <InfoItem
              icon={<MapPin className="w-5 h-5 text-orange-600" />}
              iconBg="bg-orange-100"
              label="Pickup Location"
              value={booking.pickupLocation}
            />

            <InfoItem
              icon={<DollarSign className="w-5 h-5 text-green-600" />}
              iconBg="bg-green-100"
              label="Total Price"
              value={`$${booking.totalPrice.toLocaleString()}`}
              isLarge
            />

            <InfoItem
              icon={<Calendar className="w-5 h-5 text-text-200" />}
              iconBg="bg-bg-200"
              label="Booked On"
              value={new Date(booking.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            />
          </div>

          {/* Primary Driver Info */}
          <div className="bg-bg-100 rounded-lg p-4 mb-4">
            <h4 className="font-heading text-sm uppercase tracking-wide text-text-100 mb-3">
              Primary Driver
            </h4>
            {primaryDriver ? (
              <div className="grid md:grid-cols-3 gap-3 font-body text-sm">
                <div>
                  <span className="text-text-200">Name:</span>{" "}
                  <span className="font-medium text-text-100">
                    {primaryDriver.firstName} {primaryDriver.lastName}
                  </span>
                </div>
                <div>
                  <span className="text-text-200">Email:</span>{" "}
                  <span className="font-medium text-text-100">
                    {primaryDriver.email}
                  </span>
                </div>
                <div>
                  <span className="text-text-200">Phone:</span>{" "}
                  <span className="font-medium text-text-100">
                    {primaryDriver.phone}
                  </span>
                </div>
                <div>
                  <span className="text-text-200">License:</span>{" "}
                  <span className="font-medium text-text-100">
                    {primaryDriver.driversLicense}
                  </span>
                </div>
                <div className="md:col-span-2">
                  <span className="text-text-200">Address:</span>{" "}
                  <span className="font-medium text-text-100">
                    {primaryDriver.streetAddress}, {primaryDriver.city},{" "}
                    {primaryDriver.state} {primaryDriver.zipCode}
                  </span>
                </div>
              </div>
            ) : (
              <p className="font-body text-sm text-text-200">
                Loading driver information...
              </p>
            )}
          </div>

          {/* Additional Drivers Section */}
          {additionalDrivers && additionalDrivers.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-blue-600" aria-hidden="true" />
                <h4 className="font-heading text-sm uppercase tracking-wide text-blue-900">
                  Additional Drivers ({additionalDrivers.length})
                </h4>
                <span className="ml-auto font-body text-sm font-medium text-blue-700">
                  +${additionalDrivers.length * 50}
                </span>
              </div>
              <div className="space-y-3">
                {additionalDrivers.map((driver) => (
                  <div
                    key={driver.id}
                    className="bg-white rounded-lg p-3 border border-blue-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-body font-medium text-text-100">
                        {driver.firstName} {driver.lastName}
                      </p>
                      {driver.isVerified && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-body font-medium">
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-2 font-body text-xs text-text-200">
                      <div>
                        <span>Email:</span> {driver.email}
                      </div>
                      <div>
                        <span>Phone:</span> {driver.phone}
                      </div>
                      <div>
                        <span>License:</span> {driver.driversLicense}
                      </div>
                      <div>
                        <span>DOB:</span>{" "}
                        {new Date(driver.dateOfBirth).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Messages */}
          <StatusMessage status={booking.status} />
        </div>
      </article>
    </Card>
  );
};

// ============================================
// LOADING SCREEN COMPONENT
// ============================================
interface LoadingScreenProps {
  title: string;
  message: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ title, message }) => (
  <div className="min-h-screen bg-bg-100 flex items-center justify-center">
    <Helmet>
      <title>{title}</title>
      <meta name="robots" content="noindex" />
    </Helmet>
    <div className="text-center" role="status" aria-live="polite">
      <div className="flex justify-center mb-4">
        <Loader />
      </div>
      <p className="font-body text-text-200">{message}</p>
    </div>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================
export const MyBookings: React.FC = () => {
  // Get auth state - including loading!
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterValue>("all");

  // Only fetch bookings when we have a confirmed user
  const { bookings, loading: bookingsLoading, error } = useBookings();

  // Redirect ONLY when auth is done loading AND user is not logged in
  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate("/");
    }
  }, [currentUser, authLoading, navigate]);

  // Log errors to Sentry
  useEffect(() => {
    if (error) {
      if (import.meta.env.PROD) {
        Sentry.captureException(new Error(error), {
          tags: {
            component: "MyBookings",
            userId: currentUser?.id,
          },
          extra: {
            filter,
            bookingsCount: bookings.length,
          },
        });
      } else {
        console.error("[MyBookings] Error loading bookings:", error);
      }
    }
  }, [error, currentUser?.id, filter, bookings.length]);

  // Stable handlers
  const handleAuthModalOpen = useCallback((_mode: "login" | "register") => {
    // User is already logged in on this page
  }, []);

  const handleFilterChange = useCallback((value: FilterValue) => {
    setFilter(value);
  }, []);

  // Memoized filtered bookings
  const filteredBookings = useMemo(() => {
    if (filter === "all") return bookings;
    return bookings.filter((b) => b.status === filter);
  }, [bookings, filter]);

  // Memoized booking counts per status
  const bookingCounts = useMemo(() => {
    const counts: Record<string, number> = { all: bookings.length };
    FILTER_TABS.forEach((tab) => {
      if (tab.value !== "all") {
        counts[tab.value] = bookings.filter(
          (b) => b.status === tab.value
        ).length;
      }
    });
    return counts;
  }, [bookings]);

  // Show loading while auth is still determining
  if (authLoading) {
    return (
      <LoadingScreen title="Loading..." message="Checking authentication..." />
    );
  }

  // Show loading while bookings are loading
  if (bookingsLoading) {
    return (
      <LoadingScreen
        title="Loading Bookings..."
        message="Loading your bookings..."
      />
    );
  }

  return (
    <div className="min-h-screen bg-bg-100">
      <Helmet>
        <title>My Bookings</title>
        <meta
          name="description"
          content="View and manage your vehicle rental bookings with 4A Rentals."
        />
        <meta name="robots" content="noindex" />
      </Helmet>

      <Navbar onAuthModalOpen={handleAuthModalOpen} />

      <main id="main-content">
        <div className="pt-32 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Page Header */}
            <header className="mb-12">
              <h1 className="font-heading text-4xl text-text-100 mb-3 uppercase tracking-wide">
                My Bookings
              </h1>
              <p className="font-body text-lg text-text-200">
                View and manage your vehicle rental bookings
              </p>
            </header>

            {/* Error Message */}
            {error && (
              <div
                className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 font-body"
                role="alert"
              >
                Unable to load your bookings. Please try again later.
              </div>
            )}

            {/* Filter Tabs */}
            <nav className="mb-8 overflow-x-auto" aria-label="Filter bookings">
              <div
                className="flex gap-2 min-w-max"
                role="group"
                aria-label="Booking status filters"
              >
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => handleFilterChange(tab.value)}
                    aria-pressed={filter === tab.value}
                    className={`px-5 py-2.5 rounded-lg text-sm font-body font-medium transition-colors ${
                      filter === tab.value
                        ? "bg-primary-100 text-text-100"
                        : "bg-white text-text-200 hover:text-text-100 border-2 border-bg-200"
                    }`}
                  >
                    {tab.label} ({bookingCounts[tab.value]})
                  </button>
                ))}
              </div>
            </nav>

            {/* Bookings List */}
            {filteredBookings.length === 0 ? (
              <Card
                variant="default"
                padding="lg"
                className="text-center py-12"
              >
                <div
                  className="w-16 h-16 bg-bg-200 rounded-full flex items-center justify-center mx-auto mb-4"
                  aria-hidden="true"
                >
                  <Calendar className="w-8 h-8 text-bg-300" />
                </div>
                <h2 className="font-heading text-2xl text-text-100 mb-3 uppercase">
                  {filter === "all"
                    ? "No bookings yet"
                    : `No ${filter} bookings`}
                </h2>
                <p className="font-body text-text-200 mb-6">
                  {filter === "all"
                    ? "You haven't made any bookings yet. Browse our fleet to get started!"
                    : `You don't have any ${filter} bookings.`}
                </p>
                <Link to="/fleet">
                  <Button
                    variant="primary"
                    icon={<Car className="w-4 h-4" aria-hidden="true" />}
                  >
                    Browse Vehicles
                  </Button>
                </Link>
              </Card>
            ) : (
              <section aria-label="Bookings list">
                <div className="space-y-6">
                  {filteredBookings.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      vehicle={
                        booking.vehicle
                          ? {
                              name: booking.vehicle.name,
                              image: booking.vehicle.image,
                              specifications: {
                                seats:
                                  booking.vehicle.specifications?.seats || 0,
                                transmission:
                                  booking.vehicle.specifications
                                    ?.transmission || "automatic",
                                fuelType:
                                  booking.vehicle.specifications?.fuelType ||
                                  "gasoline",
                              },
                            }
                          : undefined
                      }
                      primaryDriver={
                        booking.primaryDriver
                          ? {
                              firstName: booking.primaryDriver.firstName,
                              lastName: booking.primaryDriver.lastName,
                              email: booking.primaryDriver.email,
                              phone: booking.primaryDriver.phone,
                              driversLicense:
                                booking.primaryDriver.driversLicense,
                              streetAddress:
                                booking.primaryDriver.streetAddress,
                              city: booking.primaryDriver.city,
                              state: booking.primaryDriver.state,
                              zipCode: booking.primaryDriver.zipCode,
                            }
                          : undefined
                      }
                      additionalDrivers={booking.additionalDrivers?.map(
                        (d) => ({
                          id: d.id,
                          firstName: d.firstName,
                          lastName: d.lastName,
                          email: d.email,
                          phone: d.phone,
                          driversLicense: d.driversLicense,
                          dateOfBirth: d.dateOfBirth,
                          isVerified: d.isVerified,
                        })
                      )}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
