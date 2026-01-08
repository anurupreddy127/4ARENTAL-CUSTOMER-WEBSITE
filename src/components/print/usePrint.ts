import { useCallback, useRef, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";

// ============================================
// TYPES
// ============================================
interface UsePrintOptions {
  title?: string;
  onBeforePrint?: () => void;
  onAfterPrint?: () => void;
}

interface UsePrintReturn {
  print: (content: ReactNode) => void;
  printRef: React.RefObject<HTMLDivElement>;
  printFromRef: () => void;
}

// ============================================
// PRINT HTML TEMPLATE
// ============================================
const getPrintHTML = (content: string, title: string): string => `
<!DOCTYPE html>
<html>
  <head>
    <title>${title} - 4A Rentals</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      html, body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: #fff;
        color: #1f2937;
      }
      
      body {
        padding: 20px;
      }
      
      img {
        max-width: 100%;
        height: auto;
      }
      
      @media print {
        body {
          padding: 0;
        }
        
        @page {
          size: letter;
          margin: 0.5in;
        }
      }
    </style>
  </head>
  <body>
    ${content}
  </body>
</html>
`;

// ============================================
// HOOK
// ============================================
export const usePrint = (options: UsePrintOptions = {}): UsePrintReturn => {
  const { title = "Print", onBeforePrint, onAfterPrint } = options;
  const printRef = useRef<HTMLDivElement>(null);

  const print = useCallback(
    (content: ReactNode) => {
      onBeforePrint?.();

      // Convert React component to HTML string
      const htmlContent = renderToStaticMarkup(content as React.ReactElement);

      // Open print window
      const printWindow = window.open("", "_blank", "width=850,height=1000");

      if (!printWindow) {
        alert("Please allow pop-ups to print.");
        return;
      }

      printWindow.document.write(getPrintHTML(htmlContent, title));
      printWindow.document.close();

      // Wait for images and content to load
      printWindow.onload = () => {
        // Give images a moment to render
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          onAfterPrint?.();
        }, 250);
      };
    },
    [title, onBeforePrint, onAfterPrint]
  );

  const printFromRef = useCallback(() => {
    if (!printRef.current) return;

    onBeforePrint?.();

    const htmlContent = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=850,height=1000");

    if (!printWindow) {
      alert("Please allow pop-ups to print.");
      return;
    }

    printWindow.document.write(getPrintHTML(htmlContent, title));
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        onAfterPrint?.();
      }, 250);
    };
  }, [title, onBeforePrint, onAfterPrint]);

  return { print, printRef, printFromRef };
};

export default usePrint;
