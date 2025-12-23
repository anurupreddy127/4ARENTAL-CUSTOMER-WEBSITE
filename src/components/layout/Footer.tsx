// components/layout/Footer.tsx
import React from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MapPin } from "lucide-react";

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="bg-bg-100 border-t border-bg-200 py-12"
      aria-label="Site footer"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div>
            <Link to="/" className="inline-block mb-4" aria-label="4A Rentals home">
              <img
                src="/4arentals-logo.png"
                alt="4A Rentals"
                className="h-12 w-auto"
              />
            </Link>
            <p className="font-body text-text-200 mb-4 text-sm">
              Your trusted partner for car rentals. Experience the freedom of
              the road with our exceptional service.
            </p>
          </div>

          {/* Quick Links */}
          <nav aria-labelledby="footer-nav-heading">
            <h3
              id="footer-nav-heading"
              className="font-heading text-sm uppercase tracking-wider text-text-100 mb-4"
            >
              Quick Links
            </h3>
            <ul className="space-y-2 font-body text-text-200 text-sm">
              <li>
                <Link
                  to="/"
                  className="hover:text-primary-200 transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/fleet"
                  className="hover:text-primary-200 transition-colors"
                >
                  Vehicles
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="hover:text-primary-200 transition-colors"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </nav>

          {/* Services */}
          <nav aria-labelledby="footer-services-heading">
            <h3
              id="footer-services-heading"
              className="font-heading text-sm uppercase tracking-wider text-text-100 mb-4"
            >
              Services
            </h3>
            <ul className="space-y-2 font-body text-text-200 text-sm">
              <li>
                <Link
                  to="/fleet?category=economy"
                  className="hover:text-primary-200 transition-colors"
                >
                  Economy Cars
                </Link>
              </li>
              <li>
                <Link
                  to="/fleet?category=suv"
                  className="hover:text-primary-200 transition-colors"
                >
                  SUV Rentals
                </Link>
              </li>
              <li>
                <Link
                  to="/fleet?category=luxury"
                  className="hover:text-primary-200 transition-colors"
                >
                  Luxury Vehicles
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="hover:text-primary-200 transition-colors"
                >
                  Long-term Rentals
                </Link>
              </li>
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <h3
              id="footer-contact-heading"
              className="font-heading text-sm uppercase tracking-wider text-text-100 mb-4"
            >
              Contact
            </h3>
            <address className="not-italic space-y-2 font-body text-text-200 text-sm">
              <p>
                <a
                  href="tel:+14694037094"
                  className="hover:text-primary-200 transition-colors inline-flex items-center gap-2"
                  aria-label="Call us at +1 469 403 7094"
                >
                  <Phone className="w-4 h-4" aria-hidden="true" />
                  +1 (469) 403-7094
                </a>
              </p>
              <p>
                <a
                  href="mailto:info@4arentals.com"
                  className="hover:text-primary-200 transition-colors inline-flex items-center gap-2"
                  aria-label="Email us at info@4arentals.com"
                >
                  <Mail className="w-4 h-4" aria-hidden="true" />
                  info@4arentals.com
                </a>
              </p>
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>
                  123 Rental Street
                  <br />
                  Denton, Texas 76201
                </span>
              </p>
            </address>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-bg-200 pt-8 flex flex-col sm:flex-row justify-between items-center">
          <p className="font-body text-text-200 text-sm">
            &copy; {currentYear} 4A Rentals. All rights reserved.
          </p>
          <nav
            className="flex space-x-6 mt-4 sm:mt-0"
            aria-label="Legal navigation"
          >
            <Link
              to="/privacy-policy"
              className="font-body text-text-200 hover:text-primary-200 transition-colors text-sm"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="font-body text-text-200 hover:text-primary-200 transition-colors text-sm"
            >
              Terms of Service
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
};