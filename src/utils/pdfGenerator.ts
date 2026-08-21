import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Rental } from '../types';
import { getRentalComputedStatus } from './storage';

// Helper to format currency cleanly using standard ASCII (Rs.) so jsPDF standard fonts render without broken Unicode symbols
const formatCurrency = (amountInPaise: number) => `Rs. ${(amountInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

/**
 * Generate a clean, professional PDF Invoice / Receipt for an individual rental ticket.
 */
export function generateRentalInvoicePDF(rental: Rental) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const computedStatus = getRentalComputedStatus(rental);
  const statusLabel = computedStatus === 'returned' 
    ? 'COMPLETED / RETURNED' 
    : computedStatus === 'overdue' 
    ? 'OVERDUE' 
    : computedStatus === 'pre-booked' 
    ? 'PRE-BOOKED (ADVANCE)' 
    : 'ACTIVE RENTAL';

  // --- Header Styling (Dark Navy Theme) ---
  doc.setDrawColor(0, 0, 0);
  doc.rect(0, 0, 210, 38, 'S');

  // Title
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('ARIYA THANGAM FANCY DRESS FOR RENT', 14, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0); // slate-300
  doc.text('Cloakroom Costume Rental & Counter System', 14, 23);
  doc.text('Official Rental Invoice / Handover Ticket', 14, 29);

  // Invoice Number & Booking Number
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0); // yellow accent for Booking #
  doc.text(`BOOKING #: ${rental.bookingNumber || 'BK-1001'}`, 196, 16, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`Ticket ID: #${rental.id.slice(-6).toUpperCase()}`, 196, 22, { align: 'right' });
  doc.text(`Date: ${rental.dateGiven}`, 196, 27, { align: 'right' });
  doc.text(`Status: ${statusLabel}`, 196, 32, { align: 'right' });

  // --- Customer & Rental Info Box ---
  doc.setFillColor(255, 255, 255); // slate-50
  doc.setDrawColor(0, 0, 0); // slate-200
  doc.roundedRect(14, 43, 182, 38, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0); // slate-800
  doc.text('CUSTOMER DETAILS', 20, 50);
  doc.text('RENTAL PERIOD & TERMS', 110, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0); // slate-600

  // Left col: Customer Information (including Address)
  doc.text(`Name: ${rental.customerName}`, 20, 57);
  doc.text(`Phone: ${rental.customerPhone}`, 20, 63);
  doc.text(`Address: ${rental.customerAddress || 'N/A'}`, 20, 69);
  if (rental.notes) {
    doc.text(`Notes: ${rental.notes.substring(0, 42)}`, 20, 75);
  }

  // Right col: Dates & Deposit info
  const dateLabelName = rental.status === 'pre-booked' ? 'Scheduled Pickup:' : 'Handover Date:';
  doc.text(`${dateLabelName} ${rental.dateGiven}`, 110, 57);
  doc.text(`Expected Return: ${rental.expectedReturnDate}`, 110, 63);
  if (rental.actualReturnDate) {
    doc.text(`Actual Return: ${rental.actualReturnDate}`, 110, 69);
  } else {
    doc.text(`Security Deposit: ${formatCurrency(rental.advanceAmount)} (Refundable)`, 110, 69);
  }

  // --- Items Table ---
  const tableData: (string | number)[][] = [];

  rental.items.forEach((item, idx) => {
    tableData.push([
      idx + 1,
      item.name,
      item.categoryName,
      item.size,
      item.quantity,
      formatCurrency(item.rentalPrice),
      formatCurrency(item.rentalPrice * item.quantity),
    ]);
  });

  if (rental.additionalItems && rental.additionalItems.length > 0) {
    rental.additionalItems.forEach((add, idx) => {
      tableData.push([
        rental.items.length + idx + 1,
        `[Add-on] ${add.name}`,
        'Accessories',
        'Standard',
        add.quantity,
        'INCLUDED',
        'INCLUDED',
      ]);
    });
  }

  autoTable(doc, {
    startY: 86,
    head: [['#', 'Item / Outfit Name', 'Category', 'Size', 'Qty', 'Unit Rate', 'Total']],
    body: tableData,
    theme: 'grid',
    styles: { lineColor: [0, 0, 0], lineWidth: 0.1 },
    headStyles: {
      fillColor: [255, 255, 255], // Dark Blue / Navy (#1e3a8a)
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      textColor: [0, 0, 0],
      fontSize: 8.5,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 58 },
      2: { cellWidth: 32 },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 14, halign: 'center' },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 27, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  // --- Summary Box ---
  const finalY = (doc as any).lastAutoTable.finalY + 6;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(0, 0, 0); // slate-100
  doc.roundedRect(106, finalY, 90, 42, 2, 2, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);

  doc.text('Net Rental Charge (Revenue):', 112, finalY + 8);
  doc.text('Refundable Security Deposit:', 112, finalY + 16);
  doc.text('Deposit Refund Status:', 112, finalY + 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);

  doc.text(formatCurrency(rental.rentalCharge), 190, finalY + 8, { align: 'right' });
  doc.text(formatCurrency(rental.advanceAmount), 190, finalY + 16, { align: 'right' });

  const depositText = rental.advanceReturned ? 'REFUNDED' : 'HELD IN SAFE';
  doc.text(depositText, 190, finalY + 24, { align: 'right' });

  // Divider
  doc.setDrawColor(0, 0, 0);
  doc.line(112, finalY + 27, 190, finalY + 27);

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0); // Navy Blue
  doc.text('Net Rental Fee Paid:', 112, finalY + 33);
  doc.text(formatCurrency(rental.rentalCharge), 190, finalY + 33, { align: 'right' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(0, 0, 0);
  doc.text('* Advance deposit is fully refunded on return & excluded from revenue', 112, finalY + 38);

  // --- Terms & Signatures ---
  const termsY = Math.max(finalY + 48, 188);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text('TERMS & CONDITIONS:', 14, termsY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('1. Outfits must be returned in original condition on or before the expected return date.', 14, termsY + 5);
  doc.text('2. Security deposit is fully refundable upon safe and undamaged return of all items.', 14, termsY + 9);
  doc.text('3. Security advance deposit is treated purely as a refundable security hold and not shop revenue.', 14, termsY + 13);

  // Signature Lines
  doc.setDrawColor(0, 0, 0);
  doc.line(14, termsY + 32, 70, termsY + 32);
  doc.line(130, termsY + 32, 186, termsY + 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text('Customer Signature', 14, termsY + 37);
  doc.text('Shop Counter Staff', 130, termsY + 37);

  // Footer
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Thank you for choosing Ariya Thangam Fancy Dress For Rent! Safe & Stylish.', 105, 285, { align: 'center' });

  // Save/Download PDF
  doc.save(`AriyaThangam_Invoice_${rental.customerName.replace(/\s+/g, '_')}_${rental.id.slice(-6)}.pdf`);
}

/**
 * Generate a Financial & Sales Statement PDF for any specified custom date range.
 */
export function generateFinancialReportPDF(
  rentals: Rental[],
  startDateLabel: string,
  endDateLabel: string,
  filteredRentals: Rental[]
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // --- Dark Blue Header ---
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(0, 0, 0);
  doc.rect(0, 0, 210, 40, 'S');

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('ARIYA THANGAM FANCY DRESS FOR RENT', 14, 16);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('Cloakroom — Financial Statement & Revenue Summary', 14, 23);
  doc.text(`Period Covered: ${startDateLabel} to ${endDateLabel}`, 14, 29);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 196, 18, { align: 'right' });
  doc.text(`Total Bookings: ${filteredRentals.length}`, 196, 26, { align: 'right' });

  // --- Financial Summary Cards inside PDF ---
  const totalRevenue = filteredRentals.reduce((sum, r) => sum + r.rentalCharge, 0);
  const realizedRev = filteredRentals
    .filter(r => getRentalComputedStatus(r) === 'returned')
    .reduce((sum, r) => sum + r.rentalCharge, 0);
  const totalDeposits = filteredRentals.reduce((sum, r) => sum + r.advanceAmount, 0);
  const avgOrderVal = filteredRentals.length > 0 ? Math.round(totalRevenue / filteredRentals.length) : 0;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(0, 0, 0);
  doc.roundedRect(14, 46, 182, 28, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);

  doc.text('NET REVENUE BOOKED', 20, 53);
  doc.text('REALIZED (RETURNED)', 65, 53);
  doc.text('REFUNDABLE DEPOSITS HELD', 112, 53);
  doc.text('AVERAGE ORDER VALUE', 160, 53);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  doc.text(formatCurrency(totalRevenue), 20, 62);
  doc.text(formatCurrency(realizedRev), 65, 62);
  doc.text(formatCurrency(totalDeposits), 112, 62);
  doc.text(formatCurrency(avgOrderVal), 160, 62);

  // --- Detailed Transaction Table ---
  const tableRows: (string | number)[][] = [];

  filteredRentals.forEach((r, idx) => {
    const status = getRentalComputedStatus(r).toUpperCase();
    const itemsCount = r.items.reduce((s, i) => s + i.quantity, 0);
    tableRows.push([
      idx + 1,
      r.bookingNumber || `BK-${1000 + idx}`,
      r.dateGiven,
      r.customerName,
      r.customerPhone,
      `${itemsCount} item(s)`,
      formatCurrency(r.rentalCharge),
      formatCurrency(r.advanceAmount),
      status,
    ]);
  });

  autoTable(doc, {
    startY: 80,
    head: [['#', 'Booking #', 'Date', 'Customer', 'Phone', 'Items', 'Rental Fee', 'Deposit', 'Status']],
    body: tableRows,
    theme: 'grid',
    styles: { lineColor: [0, 0, 0], lineWidth: 0.1 },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      textColor: [0, 0, 0],
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 20 },
      3: { cellWidth: 32 },
      4: { cellWidth: 24 },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 21, halign: 'right' },
      7: { cellWidth: 21, halign: 'right' },
      8: { cellWidth: 21, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(`Ariya Thangam Fancy Dress For Rent — Financial Report — Page ${i} of ${pageCount}`, 105, 287, { align: 'center' });
  }

  doc.save(`AriyaThangam_Financial_Report_${startDateLabel}_to_${endDateLabel}.pdf`);
}
