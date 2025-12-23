import React from "react";
import { Phone, Mail, MapPin } from "lucide-react";

// ============================================
// CONSTANTS
// ============================================
const CONTACT_INFO = {
  email: "info@4arentals.com",
  phone: "+1 (469) 403-7094",
  phoneHref: "tel:+14694037094",
  address: {
    street: "123 Rental Street",
    city: "Denton",
    state: "Texas",
    zip: "76201",
    country: "USA",
  },
  mapEmbedUrl:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d107101.02887427623!2d-97.21354935!3d33.2148412!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x864dca3d16696f09%3A0x3b5e0e6381eb8c28!2sDenton%2C%20TX!5e0!3m2!1sen!2sus!4v1234567890123!5m2!1sen!2sus",
} as const;

// ============================================
// COMPONENT
// ============================================
export const ContactSection: React.FC = () => {
  const sectionHeadingId = "contact-section-heading";
  const fullAddress = `${CONTACT_INFO.address.street}, ${CONTACT_INFO.address.city}, ${CONTACT_INFO.address.state} ${CONTACT_INFO.address.zip} ${CONTACT_INFO.address.country}`;

  return (
    <section
      id="contact"
      className="py-20 bg-white"
      aria-labelledby={sectionHeadingId}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left Side - Contact Information */}
          <div>
            {/* Header */}
            <header className="mb-12">
              <p className="font-body text-sm uppercase tracking-wider text-text-200 mb-3">
                Reach us
              </p>
              <h2
                id={sectionHeadingId}
                className="font-heading text-4xl lg:text-5xl text-text-100 mb-6 uppercase tracking-wide"
              >
                Get In Touch
              </h2>
              <p className="font-body text-lg text-text-200">
                Have questions or need assistance with your booking?
              </p>
            </header>

            {/* Contact Details */}
            <address className="not-italic space-y-10">
              {/* Email */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <Mail
                    className="w-6 h-6 text-text-100 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <h3 className="font-heading text-sm uppercase tracking-wider text-text-100">
                    Email
                  </h3>
                </div>
                <p className="font-body text-sm text-text-200 mb-1">
                  Send us a message
                </p>
                <a
                  href={`mailto:${CONTACT_INFO.email}`}
                  className="font-body text-base text-text-100 hover:text-primary-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 focus-visible:ring-offset-2 rounded"
                >
                  {CONTACT_INFO.email}
                </a>
              </div>

              {/* Phone */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <Phone
                    className="w-6 h-6 text-text-100 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <h3 className="font-heading text-sm uppercase tracking-wider text-text-100">
                    Phone
                  </h3>
                </div>
                <p className="font-body text-sm text-text-200 mb-1">
                  Call our booking team
                </p>
                <a
                  href={CONTACT_INFO.phoneHref}
                  className="font-body text-base text-text-100 hover:text-primary-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 focus-visible:ring-offset-2 rounded"
                >
                  {CONTACT_INFO.phone}
                </a>
              </div>

              {/* Office */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <MapPin
                    className="w-6 h-6 text-text-100 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <h3 className="font-heading text-sm uppercase tracking-wider text-text-100">
                    Office
                  </h3>
                </div>
                <p className="font-body text-base text-text-100">
                  {fullAddress}
                </p>
              </div>
            </address>
          </div>

          {/* Right Side - Map */}
          <div
            className="h-[500px] lg:h-[600px] rounded-2xl overflow-hidden shadow-lg"
            role="region"
            aria-label="Office location map"
          >
            <iframe
              src={CONTACT_INFO.mapEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Map showing office location at ${CONTACT_INFO.address.city}, ${CONTACT_INFO.address.state}`}
            />
          </div>
        </div>
      </div>
    </section>
  );
};