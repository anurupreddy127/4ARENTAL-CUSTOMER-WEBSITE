import React, { useMemo } from "react";
import { Check } from "lucide-react";

// ============================================
// TYPES
// ============================================
interface Step {
  number: number;
  label: string;
}

interface ProgressStepsProps {
  currentStep: number;
  totalSteps?: number;
}

interface StepIndicatorProps {
  step: Step;
  status: "completed" | "current" | "upcoming";
  isLast: boolean;
}

// ============================================
// CONSTANTS
// ============================================
const STEPS: Step[] = [
  { number: 1, label: "Dates" },
  { number: 2, label: "Details" },
  { number: 3, label: "Confirm" },
] as const;

// ============================================
// HELPER FUNCTIONS
// ============================================
function getStepStatus(
  stepNumber: number,
  currentStep: number
): "completed" | "current" | "upcoming" {
  if (stepNumber < currentStep) return "completed";
  if (stepNumber === currentStep) return "current";
  return "upcoming";
}

function getStepAriaLabel(step: Step, status: "completed" | "current" | "upcoming"): string {
  const statusText =
    status === "completed"
      ? "completed"
      : status === "current"
      ? "current step"
      : "upcoming";
  return `Step ${step.number}: ${step.label}, ${statusText}`;
}

// ============================================
// SUB-COMPONENTS
// ============================================
const StepIndicator: React.FC<StepIndicatorProps> = ({
  step,
  status,
  isLast,
}) => {
  const isActive = status === "completed" || status === "current";
  const isCompleted = status === "completed";

  return (
    <li
      className="flex items-center"
      aria-current={status === "current" ? "step" : undefined}
    >
      <div
        className={`flex items-center gap-2 ${
          isActive ? "text-gray-900" : "text-gray-400"
        }`}
        aria-label={getStepAriaLabel(step, status)}
      >
        {/* Step Circle */}
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
            isActive ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-500"
          }`}
        >
          {isCompleted ? (
            <Check className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <span aria-hidden="true">{step.number}</span>
          )}
        </div>

        {/* Step Label */}
        <span className="text-sm font-medium">{step.label}</span>
      </div>

      {/* Connector Line */}
      {!isLast && (
        <div
          className={`w-8 h-px mx-4 transition-colors ${
            status === "completed" ? "bg-gray-900" : "bg-gray-200"
          }`}
          aria-hidden="true"
        />
      )}
    </li>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
export const ProgressSteps: React.FC<ProgressStepsProps> = ({
  currentStep,
}) => {
  // Memoize step statuses
  const stepsWithStatus = useMemo(() => {
    return STEPS.map((step) => ({
      ...step,
      status: getStepStatus(step.number, currentStep),
    }));
  }, [currentStep]);

  // Memoize progress text for screen readers
  const progressText = useMemo(() => {
    return `Step ${currentStep} of ${STEPS.length}`;
  }, [currentStep]);

  return (
    <nav aria-label="Booking progress" className="mt-4">
      {/* Screen reader announcement */}
      <p className="sr-only" aria-live="polite">
        {progressText}
      </p>

      <ol
        className="flex items-center"
        role="list"
        aria-label="Booking steps"
      >
        {stepsWithStatus.map((step, index) => (
          <StepIndicator
            key={step.number}
            step={step}
            status={step.status}
            isLast={index === STEPS.length - 1}
          />
        ))}
      </ol>
    </nav>
  );
};