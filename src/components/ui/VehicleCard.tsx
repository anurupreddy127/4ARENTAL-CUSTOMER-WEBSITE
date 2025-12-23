import React, { useMemo, useCallback } from "react";
import styled from "styled-components";
import { Star, Users, Gauge, Fuel, Calendar, CheckCircle } from "lucide-react";
import { Vehicle } from "@/types";
import { Button } from "@/components/ui/Button";

// ============================================
// TYPES
// ============================================
interface VehicleCardProps {
  vehicle: Vehicle;
  onCardClick: () => void;
  onBookClick: (e: React.MouseEvent) => void;
  isAuthenticated: boolean;
}

interface SpecItemProps {
  icon: React.ReactNode;
  label: string;
}

interface FeatureItemProps {
  feature: string;
}

// ============================================
// CONSTANTS
// ============================================
const MAX_VISIBLE_FEATURES = 3;
const STAR_RATING = 5;

// ============================================
// SUB-COMPONENTS (same names)
// ============================================
const SpecItem: React.FC<SpecItemProps> = ({ icon, label }) => (
  <div className="spec" role="listitem">
    <span className="specIcon" aria-hidden="true">
      {icon}
    </span>
    <span className="specLabel">{label}</span>
  </div>
);

const FeatureItem: React.FC<FeatureItemProps> = ({ feature }) => (
  <div className="feature" role="listitem">
    <CheckCircle className="featureIcon" aria-hidden="true" />
    <span className="featureText">{feature}</span>
  </div>
);

const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
  <div
    className="stars"
    role="img"
    aria-label={`${rating} out of ${rating} stars rating`}
  >
    {Array.from({ length: rating }, (_, i) => (
      <Star key={`star-${i}`} className="star" aria-hidden="true" />
    ))}
  </div>
);

// ============================================
// MAIN COMPONENT (same name)
// ============================================
export const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicle,
  onCardClick,
  onBookClick,
  isAuthenticated,
}) => {
  const imageUrl = useMemo(
    () => (Array.isArray(vehicle.image) ? vehicle.image[0] : vehicle.image),
    [vehicle.image]
  );

  const imageAlt = useMemo(() => {
    const { year, brand, model, name } = vehicle.specifications
      ? { ...vehicle.specifications, name: vehicle.name }
      : { year: "", brand: "", model: "", name: vehicle.name };

    return year && brand && model ? `${year} ${brand} ${model}` : name;
  }, [vehicle.name, vehicle.specifications]);

  const specs = useMemo(
    () => [
      {
        icon: <Users className="luc" />,
        label: `${vehicle.specifications.seats} Seats`,
      },
      {
        icon: <Gauge className="luc" />,
        label: vehicle.specifications.transmission,
      },
      {
        icon: <Fuel className="luc" />,
        label: vehicle.specifications.fuelType,
      },
      {
        icon: <Calendar className="luc" />,
        label: String(vehicle.specifications.year),
      },
    ],
    [vehicle.specifications]
  );

  const visibleFeatures = useMemo(
    () => vehicle.features.slice(0, MAX_VISIBLE_FEATURES),
    [vehicle.features]
  );

  const buttonText = useMemo(
    () => (isAuthenticated ? "Book Now" : "Sign In"),
    [isAuthenticated]
  );

  const cardAriaLabel = useMemo(
    () =>
      `${vehicle.name}, $${vehicle.price} per month. Click to view details.`,
    [vehicle.name, vehicle.price]
  );

  // handlers (same names)
  const handleCardClick = useCallback(() => onCardClick(), [onCardClick]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        if ((event.target as HTMLElement).tagName !== "BUTTON") {
          event.preventDefault();
          onCardClick();
        }
      }
    },
    [onCardClick]
  );

  const handleBookClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onBookClick(e);
    },
    [onBookClick]
  );

  return (
    <StyledWrapper>
      <article
        className="card"
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={cardAriaLabel}
      >
        {/* IMAGE */}
        <div className="imageWrap">
          <img className="image" src={imageUrl} alt={imageAlt} loading="lazy" />
        </div>

        {/* CONTENT */}
        <div className="content">
          <h3 className="title">{vehicle.name}</h3>

          <div
            className="specGrid"
            role="list"
            aria-label="Vehicle specifications"
          >
            {specs.map((s) => (
              <SpecItem key={s.label} icon={s.icon} label={s.label} />
            ))}
          </div>

          <div className="featureBox" role="list" aria-label="Vehicle features">
            {visibleFeatures.map((f) => (
              <FeatureItem key={f} feature={f} />
            ))}
          </div>

          <div className="bottomRow">
            <div className="price" aria-label={`$${vehicle.price} per month`}>
              <span className="dollar" aria-hidden="true">
                $
              </span>
              <span className="amount">{vehicle.price}</span>
              <span className="per">/mo</span>
            </div>

            <Button
              onClick={handleBookClick}
              variant="primary"
              className="cta"
              aria-label={
                isAuthenticated ? `Book ${vehicle.name}` : "Sign in to book"
              }
            >
              {buttonText}
            </Button>
          </div>

          <StarRating rating={STAR_RATING} />
        </div>
      </article>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  /* Your requested base card design, but responsive-friendly */
  .card {
    width: 100%;
    max-width: 360px;
    background: var(--bg-200, rgb(236, 236, 236));
    border-radius: 18px;
    overflow: hidden;

    box-shadow: rgba(0, 0, 0, 0.35) 0px 2px 4px,
      rgba(0, 0, 0, 0.22) 0px 7px 13px -3px,
      rgba(0, 0, 0, 0.18) 0px -3px 0px inset;

    transition: transform 0.25s ease, box-shadow 0.25s ease;
    cursor: pointer;
    outline: none;
  }

  .card:hover {
    transform: translateY(-2px);
    box-shadow: rgba(0, 0, 0, 0.4) 0px 6px 16px,
      rgba(0, 0, 0, 0.25) 0px 10px 22px -6px,
      rgba(0, 0, 0, 0.16) 0px -3px 0px inset;
  }

  .card:focus-visible {
    box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.35),
      rgba(0, 0, 0, 0.35) 0px 6px 16px, rgba(0, 0, 0, 0.25) 0px 10px 22px -6px,
      rgba(0, 0, 0, 0.16) 0px -3px 0px inset;
  }

  /* IMAGE */
  .imageWrap {
    height: 170px;
    background: var(--bg-300, #c4c4c4);
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }

  .image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  /* CONTENT */
  .content {
    padding: 12px 12px 14px;
  }

  .title {
    margin: 2px 0 10px;
    font-family: "Julius Sans One", sans-serif;
    font-size: 16px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-100, #333333);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .specGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 10px;
  }

  .spec {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 14px;
    background: var(--bg-100, #f7f7f7);
    border: 1px solid rgba(0, 0, 0, 0.08);
  }

  .specIcon {
    width: 28px;
    height: 28px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: rgba(255, 215, 0, 0.25);
    color: var(--text-100, #333333);
  }

  .luc {
    width: 14px;
    height: 14px;
  }

  .specLabel {
    font-size: 12px;
    font-weight: 800;
    color: var(--text-100, #333333);
  }

  .featureBox {
    padding: 10px;
    border-radius: 14px;
    background: #fff;
    border: 1px dashed rgba(0, 0, 0, 0.14);
    margin-bottom: 12px;
  }

  .feature {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 3px 0;
  }

  .featureIcon {
    width: 16px;
    height: 16px;
    color: var(--primary-300, #917800);
    flex-shrink: 0;
  }

  .featureText {
    font-size: 12px;
    color: var(--text-200, #5c5c5c);
    font-weight: 600;
  }

  .bottomRow {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  .price {
    display: flex;
    align-items: baseline;
    gap: 2px;
    color: var(--text-100, #333333);
    font-weight: 900;
  }

  .dollar {
    font-size: 14px;
    opacity: 0.9;
  }

  .amount {
    font-size: 28px;
    line-height: 1;
  }

  .per {
    font-size: 12px;
    color: var(--text-200, #5c5c5c);
    font-weight: 700;
    margin-left: 4px;
  }

  .cta {
    border-radius: 14px;
    padding: 10px 14px;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
    background: var(--primary-100, #ffd700);
    color: var(--text-100, #333333);
    border: 1px solid rgba(0, 0, 0, 0.12);
    box-shadow: 0 8px 18px rgba(255, 215, 0, 0.22);
  }

  .stars {
    display: flex;
    justify-content: center;
    gap: 6px;
  }

  .star {
    width: 16px;
    height: 16px;
    color: var(--primary-200, #ddb900);
    fill: currentColor;
  }
`;

export default VehicleCard;
