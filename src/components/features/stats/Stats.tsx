import React from "react";

// ============================================
// TYPES
// ============================================
interface Statistic {
  id: string;
  value: number;
  displayValue: string;
  label: string;
}

// ============================================
// CONSTANTS
// ============================================
const STATISTICS: Statistic[] = [
  {
    id: "vehicles",
    value: 2500,
    displayValue: "2,500+",
    label: "Vehicles In Fleet",
  },
  {
    id: "customers",
    value: 50000,
    displayValue: "50,000+",
    label: "Happy Customers",
  },
  {
    id: "years",
    value: 25,
    displayValue: "25+",
    label: "Years Of Service",
  },
];

// ============================================
// COMPONENT
// ============================================
export const Stats: React.FC = () => {
  const sectionHeadingId = "stats-section-heading";

  return (
    <section
      className="py-20 bg-bg-100"
      aria-labelledby={sectionHeadingId}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-16">
          <p className="font-body text-sm uppercase tracking-wider text-text-200 mb-3">
            Numbers
          </p>
          <h2
            id={sectionHeadingId}
            className="font-heading text-4xl lg:text-5xl text-text-100 mb-6 uppercase tracking-wide"
          >
            By The Numbers
          </h2>
          <p className="font-body text-lg text-text-200">
            We've been moving people forward since day one
          </p>
        </header>

        {/* Stats Grid */}
        <dl className="grid md:grid-cols-3 gap-12">
          {STATISTICS.map((stat) => (
            <div key={stat.id} className="text-center md:text-left">
              <dd className="text-6xl lg:text-7xl font-bold text-text-100 mb-4">
                <span aria-label={`${stat.value.toLocaleString()} ${stat.label}`}>
                  {stat.displayValue}
                </span>
              </dd>
              <dt className="font-heading text-sm uppercase tracking-wider text-text-100">
                {stat.label}
              </dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
};