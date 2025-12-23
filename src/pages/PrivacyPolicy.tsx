/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import * as Sentry from "@sentry/react";
import { Navbar, Footer } from "@/components/layout";
import { Shield, FileText, Clock, AlertCircle } from "lucide-react";

// Info card component
interface InfoCardProps {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  description: string;
}

const InfoCard: React.FC<InfoCardProps> = ({
  icon,
  iconColor,
  title,
  description,
}) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
    <div className={iconColor} aria-hidden="true">
      {icon}
    </div>
    <h2 className="font-semibold text-gray-900 mb-2">{title}</h2>
    <p className="text-gray-600 text-sm">{description}</p>
  </div>
);

export const PrivacyPolicy: React.FC = () => {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);

  // Navbar auth modal handler (not used on this page but required by Navbar)
  const handleAuthModalOpen = useCallback((_mode: "login" | "register") => {
    // Privacy policy is a public page, auth modal not typically needed
  }, []);

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);

    // Load Usercentrics script
    const script = document.createElement("script");
    script.id = "usercentrics-ppg";
    script.setAttribute(
      "privacy-policy-id",
      "37b3e59a-9d45-4452-a166-465d24908cbf"
    );
    script.src = "https://policygenerator.usercentrics.eu/api/privacy-policy";
    script.async = true;

    // Handle script load success
    script.onload = () => {
      setScriptLoaded(true);
      // Hide loading indicator
      const loadingEl = document.getElementById("privacy-loading");
      if (loadingEl) {
        loadingEl.style.display = "none";
      }
    };

    // Handle script load error
    script.onerror = () => {
      setScriptError(true);
      if (import.meta.env.PROD) {
        Sentry.captureMessage(
          "Failed to load Usercentrics privacy policy script",
          {
            level: "warning",
            tags: { component: "PrivacyPolicy" },
          }
        );
      } else {
        console.error("[PrivacyPolicy] Failed to load privacy policy script");
      }
    };

    document.body.appendChild(script);

    // Cleanup
    return () => {
      const existingScript = document.getElementById("usercentrics-ppg");
      if (existingScript && existingScript.parentNode) {
        existingScript.parentNode.removeChild(existingScript);
      }
    };
  }, []);

  // Format current date for "Updated" card
  const lastUpdatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Helmet>
        <title>Privacy Policy</title>
        <meta
          name="description"
          content="Learn how 4A Rentals collects, uses, and protects your personal information. Your privacy is important to us."
        />
        <link rel="canonical" href="https://4arentals.com/privacy-policy" />
      </Helmet>

      <Navbar onAuthModalOpen={handleAuthModalOpen} />

      {/* Hero Section */}
      {/* Hero Section */}
      <header className="bg-gradient-to-r from-gray-900 to-gray-800 text-white pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-4">
            <Shield className="w-12 h-12" aria-hidden="true" />
            <h1 className="text-4xl md:text-5xl font-bold">Privacy Policy</h1>
          </div>
          <p className="text-gray-300 text-lg max-w-3xl">
            Your privacy is important to us. This policy explains how we
            collect, use, and protect your personal information.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="flex-grow py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Info Cards */}
          <section
            className="grid md:grid-cols-3 gap-6 mb-12"
            aria-label="Privacy highlights"
          >
            <InfoCard
              icon={<FileText className="w-8 h-8 mb-3" />}
              iconColor="text-blue-600"
              title="Transparent"
              description="We're clear about what data we collect and why"
            />

            <InfoCard
              icon={<Shield className="w-8 h-8 mb-3" />}
              iconColor="text-green-600"
              title="Secure"
              description="Your data is protected with industry-standard security"
            />

            <InfoCard
              icon={<Clock className="w-8 h-8 mb-3" />}
              iconColor="text-purple-600"
              title="Updated"
              description={`Last updated: ${lastUpdatedDate}`}
            />
          </section>

          {/* Privacy Policy Content */}
          <section
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12"
            aria-label="Privacy policy details"
          >
            {/* Usercentrics Privacy Policy will be injected here */}
            <div className="uc-privacy-policy prose prose-gray max-w-none">
              {/* The Usercentrics script will populate this div */}
            </div>

            {/* Loading state */}
            {!scriptLoaded && !scriptError && (
              <div
                id="privacy-loading"
                className="text-center py-12"
                role="status"
                aria-live="polite"
              >
                <div
                  className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"
                  aria-hidden="true"
                />
                <p className="text-gray-600">Loading privacy policy...</p>
              </div>
            )}

            {/* Error state */}
            {scriptError && (
              <div
                className="text-center py-12"
                role="alert"
                aria-live="assertive"
              >
                <AlertCircle
                  className="w-12 h-12 text-red-500 mx-auto mb-4"
                  aria-hidden="true"
                />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Unable to Load Privacy Policy
                </h2>
                <p className="text-gray-600 mb-4">
                  We couldn't load the full privacy policy. Please try again
                  later or contact us for more information.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center justify-center px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium"
                >
                  Try Again
                </button>
              </div>
            )}
          </section>

          {/* Contact Section */}
          <section
            className="mt-12 bg-blue-50 rounded-2xl p-8 border border-blue-100"
            aria-labelledby="privacy-questions-heading"
          >
            <h2
              id="privacy-questions-heading"
              className="text-2xl font-bold text-gray-900 mb-4"
            >
              Questions About Your Privacy?
            </h2>
            <p className="text-gray-700 mb-6">
              If you have any questions or concerns about our privacy practices,
              please don't hesitate to contact us.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="mailto:privacy@4arentals.com"
                className="inline-flex items-center justify-center px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium"
              >
                Email Privacy Team
              </a>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-gray-900 rounded-xl hover:bg-gray-50 transition-colors font-medium border-2 border-gray-200"
              >
                Contact Support
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};
