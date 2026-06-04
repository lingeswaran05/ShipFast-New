import React, { useMemo, useRef, useState } from 'react';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';

export function SectionDownloader({ children, title = 'Print', className = '' }) {
  const sectionRef = useRef(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const actionLabel = useMemo(() => {
    const cleaned = String(title || 'Print');
    if (/download/i.test(cleaned)) {
      return cleaned.replace(/download/gi, 'Print');
    }
    return cleaned;
  }, [title]);

  const handlePrint = async () => {
    if (!sectionRef.current) return;

    const printWindow = window.open('', '_blank', 'width=1024,height=768');
    if (!printWindow) {
      toast.error('Popup blocked. Please allow popups to print this section.');
      return;
    }

    try {
      setIsPrinting(true);
      const styleNodes = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map((node) => node.outerHTML)
        .join('\n');

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>${actionLabel}</title>
            ${styleNodes}
            <style>
              body { background: #fff; margin: 0; padding: 16px; }
              .print-area { box-shadow: none !important; border: none !important; border-radius: 0 !important; }
            </style>
          </head>
          <body>
            <div class="print-area">${sectionRef.current.innerHTML}</div>
          </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();

      const executePrint = () => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      };

      if (printWindow.document.readyState === 'complete') {
        executePrint();
      } else {
        printWindow.onload = executePrint;
      }

      toast.success('Print dialog opened. Choose "Save as PDF" to download.');
    } catch (error) {
      console.error('Section print error:', error);
      toast.error('Unable to print this section');
      printWindow.close();
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className={`relative group ${className}`}>
      <div className="flex justify-end mb-4 print:hidden">
        <button
          onClick={handlePrint}
          disabled={isPrinting}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all shadow-lg shadow-slate-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Printer className="w-4 h-4" />
          {isPrinting ? 'Opening Print...' : actionLabel}
        </button>
      </div>
      <div ref={sectionRef} className="print-area bg-white p-4 sm:p-6 md:p-8 rounded-xl border border-slate-100 print:border-none">
        {children}
      </div>
    </div>
  );
}
