export const printElementById = (elementId, title = 'Print') => {
  const source = document.getElementById(elementId);
  if (!source) {
    window.print();
    return;
  }

  const printWindow = window.open('', '_blank', 'width=1024,height=768');
  if (!printWindow) return;

  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join('\n');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
        ${styles}
        <style>
          body { margin: 0; padding: 16px; background: #fff; }
        </style>
      </head>
      <body>
        ${source.outerHTML}
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
    setTimeout(executePrint, 80);
  } else {
    printWindow.onload = executePrint;
  }
};
