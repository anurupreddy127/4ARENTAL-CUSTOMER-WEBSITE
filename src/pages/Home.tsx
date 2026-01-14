/* eslint-disable @typescript-eslint/no-unused-vars */
// pages/Home.tsx
import React, { Suspense, lazy, useCallback, useState } from "react";
import { Helmet } from "react-helmet-async";
import * as Sentry from "@sentry/react";

// Critical above-the-fold components - load immediately
import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/layout/Hero";
import { Footer } from "@/components/layout/Footer";

// Loading fallback
import { SectionSkeleton } from "@/components/ui/SectionSkeleton";

// Lazy load below-the-fold components (Dynamic Import Pattern)
const BrowseByCategory = lazy(() =>
  import("@/components/features/browse/BrowseByCategory").then((module) => ({
    default: module.BrowseByCategory,
  }))
);

const WhyRentWithUs = lazy(() =>
  import("@/components/features/whyrentwithus/WhyRentWithUs").then(
    (module) => ({
      default: module.WhyRentWithUs,
    })
  )
);

const Testimonials = lazy(() =>
  import("@/components/features/testimonials/Testimonials").then((module) => ({
    default: module.Testimonials,
  }))
);

const ContactSection = lazy(() =>
  import("@/components/features/contact/ContactSection").then((module) => ({
    default: module.ContactSection,
  }))
);

// Modals - lazy load since they're not visible initially
const AuthModal = lazy(() =>
  import("@/components/modals/AuthModal").then((module) => ({
    default: module.AuthModal,
  }))
);

// ============================================
// ERROR FALLBACK COMPONENT
// ============================================
interface SectionErrorFallbackProps {
  sectionName: string;
  resetError?: () => void;
}

const SectionErrorFallback: React.FC<SectionErrorFallbackProps> = ({
  sectionName,
  resetError,
}) => (
  <div
    className="py-16 px-4 text-center bg-gray-100"
    role="alert"
    aria-live="polite"
  >
    <div className="max-w-md mx-auto">
      <p className="text-gray-600 mb-4">
        Unable to load {sectionName}. Please try again.
      </p>
      {resetError && (
        <button
          onClick={resetError}
          className="px-6 py-2 bg-primary-100 text-text-100 rounded-lg hover:bg-primary-200 transition-colors font-medium"
        >
          Retry
        </button>
      )}
    </div>
  </div>
);

// ============================================
// SENTRY ERROR BOUNDARY WRAPPER
// ============================================
interface SentryBoundaryProps {
  children: React.ReactNode;
  sectionName: string;
  fallbackHeight?: string;
}

const SentryBoundary: React.FC<SentryBoundaryProps> = ({
  children,
  sectionName,
  fallbackHeight = "400px",
}) => (
  <Sentry.ErrorBoundary
    fallback={({ resetError }) => (
      <SectionErrorFallback sectionName={sectionName} resetError={resetError} />
    )}
    beforeCapture={(scope) => {
      scope.setTag("section", sectionName);
      scope.setTag("component", "Home");
    }}
  >
    <Suspense fallback={<SectionSkeleton height={fallbackHeight} />}>
      {children}
    </Suspense>
  </Sentry.ErrorBoundary>
);

// ============================================
// HOME PAGE COMPONENT
// ============================================
const Home: React.FC = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Handlers with useCallback for stable references
  const handleAuthModalOpen = useCallback((_mode: "login" | "register") => {
    setIsAuthModalOpen(true);
  }, []);

  const handleAuthModalClose = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  return (
    <>
      {/* SEO Metadata */}
      <Helmet>
        <title>4A Rentals</title>
        <meta
          name="description"
          content="Rent premium vehicles at affordable prices. Browse our fleet of cars, SUVs, and luxury vehicles. Book online today!"
        />
        <meta
          name="keywords"
          content="car rental, vehicle rental, rent a car, luxury cars"
        />
        <link rel="canonical" href="https://4arentals.com" />
        <meta
          property="og:title"
          content="4A Rentals - Premium Vehicle Rentals"
        />
        <meta
          property="og:description"
          content="Rent premium vehicles at affordable prices. Browse our fleet of cars, SUVs, and luxury vehicles."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://4arentals.com" />
      </Helmet>

      {/* Main Layout with Accessibility Landmarks */}
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <Navbar onAuthModalOpen={handleAuthModalOpen} />

        {/* Main Content */}
        <main id="main-content">
          {/* Hero - Critical, loads immediately (wrapped in error boundary) */}
          <Sentry.ErrorBoundary
            fallback={<SectionErrorFallback sectionName="hero section" />}
            beforeCapture={(scope) => {
              scope.setTag("section", "Hero");
              scope.setTag("component", "Home");
            }}
          >
            <Hero />
          </Sentry.ErrorBoundary>

          {/* Browse by Category */}
          <SentryBoundary
            sectionName="browse categories"
            fallbackHeight="400px"
          >
            <BrowseByCategory />
          </SentryBoundary>
          {/* Below-the-fold sections - lazy loaded with error boundaries */}
          <SentryBoundary sectionName="features section" fallbackHeight="400px">
            <WhyRentWithUs />
          </SentryBoundary>

          <SentryBoundary sectionName="testimonials" fallbackHeight="500px">
            <Testimonials />
          </SentryBoundary>

          <SentryBoundary sectionName="contact section" fallbackHeight="600px">
            <ContactSection />
          </SentryBoundary>
        </main>

        {/* Footer */}
        <Footer />

        {/* Auth Modal - Only render when open */}
        {isAuthModalOpen && (
          <Sentry.ErrorBoundary
            fallback={
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white p-8 rounded-xl max-w-md text-center">
                  <p className="text-gray-600 mb-4">
                    Unable to load sign in form. Please refresh and try again.
                  </p>
                  <button
                    onClick={handleAuthModalClose}
                    className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            }
            beforeCapture={(scope) => {
              scope.setTag("section", "AuthModal");
              scope.setTag("component", "Home");
            }}
          >
            <Suspense fallback={null}>
              <AuthModal
                isOpen={isAuthModalOpen}
                onClose={handleAuthModalClose}
              />
            </Suspense>
          </Sentry.ErrorBoundary>
        )}
      </div>
    </>
  );
};

export { Home };
