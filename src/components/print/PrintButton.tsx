import React, { useState, useCallback, ReactNode } from "react";
import { Printer, X, Download } from "lucide-react";
import { usePrint } from "./usePrint";

// ============================================
// TYPES
// ============================================
interface PrintButtonProps {
  /** The content to print - can be a React component */
  content: ReactNode;
  /** Title for the print document */
  title?: string;
  /** Button variant */
  variant?: "primary" | "secondary" | "icon" | "text";
  /** Button size */
  size?: "sm" | "md" | "lg";
  /** Additional class names */
  className?: string;
  /** Button text (for non-icon variants) */
  label?: string;
  /** Show preview modal before printing */
  showPreview?: boolean;
  /** Callback before print */
  onBeforePrint?: () => void;
  /** Callback after print */
  onAfterPrint?: () => void;
}

// ============================================
// PREVIEW MODAL COMPONENT
// ============================================
interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  title: string;
  children: ReactNode;
}

const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  onPrint,
  title,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            Print Preview: {title}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrint}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={onPrint}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Save as PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
export const PrintButton: React.FC<PrintButtonProps> = ({
  content,
  title = "Print",
  variant = "secondary",
  size = "md",
  className = "",
  label = "Print",
  showPreview = true,
  onBeforePrint,
  onAfterPrint,
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { print } = usePrint({ title, onBeforePrint, onAfterPrint });

  const handleClick = useCallback(() => {
    if (showPreview) {
      setIsPreviewOpen(true);
    } else {
      print(content);
    }
  }, [showPreview, print, content]);

  const handlePrint = useCallback(() => {
    print(content);
    setIsPreviewOpen(false);
  }, [print, content]);

  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false);
  }, []);

  // Size classes
  const sizeClasses = {
    sm: {
      button: "text-xs px-2.5 py-1.5",
      icon: "w-3.5 h-3.5",
      iconOnly: "p-1.5",
    },
    md: { button: "text-sm px-3 py-2", icon: "w-4 h-4", iconOnly: "p-2" },
    lg: { button: "text-base px-4 py-2.5", icon: "w-5 h-5", iconOnly: "p-2.5" },
  };

  // Variant classes
  const variantClasses = {
    primary: "bg-gray-900 text-white hover:bg-gray-800 border border-gray-900",
    secondary: "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300",
    icon: "bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-transparent",
    text: "bg-transparent text-blue-600 hover:text-blue-700 hover:underline border-none",
  };

  const currentSize = sizeClasses[size];
  const baseButtonClasses =
    "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2";

  // Render button based on variant
  const renderButton = () => {
    if (variant === "icon") {
      return (
        <button
          onClick={handleClick}
          className={`${baseButtonClasses} ${currentSize.iconOnly} ${variantClasses[variant]} ${className}`}
          aria-label={label}
          title={label}
        >
          <Printer className={currentSize.icon} />
        </button>
      );
    }

    if (variant === "text") {
      return (
        <button
          onClick={handleClick}
          className={`${currentSize.button} ${variantClasses[variant]} ${className}`}
        >
          {label}
        </button>
      );
    }

    return (
      <button
        onClick={handleClick}
        className={`${baseButtonClasses} ${currentSize.button} ${variantClasses[variant]} ${className}`}
      >
        <Printer className={currentSize.icon} />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <>
      {renderButton()}

      {showPreview && (
        <PrintPreviewModal
          isOpen={isPreviewOpen}
          onClose={handleClosePreview}
          onPrint={handlePrint}
          title={title}
        >
          {content}
        </PrintPreviewModal>
      )}
    </>
  );
};

export default PrintButton;
