/* eslint-disable @typescript-eslint/no-unused-vars */
// Contact.tsx
import React, { useState, useCallback, lazy, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import { Navbar, Footer } from "@/components/layout";
import { ContactSection, ContactForm } from "@/components/features/contact";
import { Card } from "@/components/ui/Card";

// Lazy load modal - only loaded when needed
const AuthModal = lazy(() =>
  import("@/components/modals/AuthModal").then((m) => ({
    default: m.AuthModal,
  }))
);

export const Contact: React.FC = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Stable handler references
  const handleAuthModalOpen = useCallback((_mode: "login" | "register") => {
    setIsAuthModalOpen(true);
  }, []);

  const handleAuthModalClose = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-bg-100">
      <Helmet>
        <title>Contact Us</title>
        <meta
          name="description"
          content="Get in touch with 4A Rentals. We're here to help with your car rental needs. Find our location, hours, and contact information."
        />
        <meta property="og:title" content="Contact Us | 4A Rentals" />
        <meta
          property="og:description"
          content="Get in touch with 4A Rentals for your car rental needs."
        />
        <link rel="canonical" href="https://4arentals.com/contact" />
      </Helmet>

      <Navbar onAuthModalOpen={handleAuthModalOpen} />

      <main id="main-content">
        {/* Hero Section */}
        <section
          className="pt-32 pb-8 bg-white"
          aria-labelledby="contact-heading"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1
                id="contact-heading"
                className="font-heading text-4xl lg:text-5xl text-text-100 mb-6 uppercase tracking-wide"
              >
                Contact Us
              </h1>
              <p className="font-body text-xl text-text-200 max-w-3xl mx-auto leading-relaxed">
                Have questions or need assistance? We're here to help!
              </p>
            </div>
          </div>
        </section>

        {/* Contact Info + Map */}
        <ContactSection />

        {/* Contact Form */}
        <ContactForm />

        {/* FAQ Section */}
        <section className="py-20 bg-white" aria-labelledby="faq-heading">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="font-body text-sm uppercase tracking-wider text-text-200 mb-3">
                FAQ
              </p>
              <h2
                id="faq-heading"
                className="font-heading text-4xl text-text-100 mb-4 uppercase tracking-wide"
              >
                Frequently Asked Questions
              </h2>
              <p className="font-body text-lg text-text-200">
                Quick answers to common questions
              </p>
            </div>

            <div className="space-y-6">
              <Card variant="default" padding="lg">
                <h3 className="font-heading text-xl text-text-100 mb-3 uppercase">
                  What do I need to rent a car?
                </h3>
                <p className="font-body text-text-200">
                  You'll need a valid driver's license, credit card, and to be
                  at least 21 years old. International visitors need a valid
                  passport and international driving permit.
                </p>
              </Card>

              <Card variant="default" padding="lg">
                <h3 className="font-heading text-xl text-text-100 mb-3 uppercase">
                  Can I modify or cancel my reservation?
                </h3>
                <p className="font-body text-text-200">
                  Yes! You can modify or cancel your reservation up to 24 hours
                  before your pickup time without any fees. Changes within 24
                  hours may incur a small fee.
                </p>
              </Card>

              <Card variant="default" padding="lg">
                <h3 className="font-heading text-xl text-text-100 mb-3 uppercase">
                  Is insurance included?
                </h3>
                <p className="font-body text-text-200">
                  All our rentals include basic insurance coverage. We also
                  offer additional coverage options for extra peace of mind at
                  competitive rates.
                </p>
              </Card>

              <Card variant="default" padding="lg">
                <h3 className="font-heading text-xl text-text-100 mb-3 uppercase">
                  Do you offer student discounts?
                </h3>
                <p className="font-body text-text-200">
                  Yes! We offer special rates for students with valid student
                  ID. Contact us for more information about our student discount
                  program.
                </p>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Lazy-loaded Modal - only render when open */}
      {isAuthModalOpen && (
        <Suspense fallback={null}>
          <AuthModal isOpen={isAuthModalOpen} onClose={handleAuthModalClose} />
        </Suspense>
      )}
    </div>
  );
};
