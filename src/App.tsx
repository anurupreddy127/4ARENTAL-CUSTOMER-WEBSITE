// App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import * as Sentry from "@sentry/react";
import { AuthProvider } from "@/context/AuthContext";
import { Home } from "@/pages/Home";
import { Fleet } from "@/pages/Fleet";
import { Contact } from "@/pages/Contact";
import { VehicleDetails } from "@/pages/VehicleDetails";
import { MyBookings } from "@/pages/MyBookings";
import { PrivacyPolicy } from "@/pages/PrivacyPolicy";
import { BookingSuccess } from "@/pages/BookingSuccess";
import { BookingCancelled } from "@/pages/BookingCancelled";
import { ErrorFallback } from "@/components/layout";
import { AuthCallback } from "./pages/AuthCallback";
import { ScrollToTop } from "./utils/ScrollToTop";

function App() {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorFallback error={error} resetError={resetError} />
      )}
      onError={(error, componentStack) => {
        Sentry.setContext("componentStack", {
          stack: componentStack,
        });
      }}
    >
      {/* Default meta tags - pages can override these */}
      <Helmet defaultTitle="4A Rentals" titleTemplate="%s | 4A Rentals">
        <html lang="en" />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Premium car rentals at affordable prices. Browse our fleet of vehicles and book online today."
        />
        <meta name="theme-color" content="#1e40af" />
        {/* Open Graph defaults for social sharing */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="4A Rentals" />
        <meta property="og:locale" content="en_US" />
      </Helmet>

      <AuthProvider>
        <Router>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/fleet" element={<Fleet />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/vehicle/:id" element={<VehicleDetails />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/booking-success" element={<BookingSuccess />} />
            <Route path="/booking-cancelled" element={<BookingCancelled />} />
          </Routes>
        </Router>
      </AuthProvider>
    </Sentry.ErrorBoundary>
  );
}

export default App;
