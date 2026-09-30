// lib/generateInvoice.ts
// Generate PDF invoice for an order. Client-side.

import jsPDF from "jspdf";
import type { Order } from "./OrderContext";
import { STATUS_LABELS } from "./OrderContext";

function formatTk(amount: number): string {
  return `Tk ${Math.round(amount).toLocaleString("en-IN")}`;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function loadImageData(
  url: string
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () =>
        resolve({ dataUrl, width: img.width, height: img.height });
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  } catch {
    return null;
  }
}

export async function generateInvoice(
  order: Order,
  storeName: string = "ChinaDailyBazar",
  storeUrl: string = "chinadailybazar.netlify.app",
  logoUrl?: string
): Promise<void> {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  // HEADER
  pdf.setFillColor(255, 102, 0);
  pdf.rect(0, 0, pageWidth, 30, "F");

  if (logoUrl) {
    const logo = await loadImageData(logoUrl);
    if (logo) {
      try {
        pdf.addImage(logo.dataUrl, "PNG", margin, 5, 20, 20);
      } catch (err) {
        console.error("Logo draw failed:", err);
      }
    }
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.text(storeName, margin + (logoUrl ? 24 : 0), 15);

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text("INVOICE", pageWidth - margin, 15, { align: "right" });

  pdf.setFontSize(10);
  pdf.text(storeUrl, pageWidth - margin, 22, { align: "right" });

  y = 40;

  // ORDER INFO
  pdf.setTextColor(34, 34, 34);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text(`Order #${order.id}`, margin, y);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(102, 102, 102);
  pdf.text(`Date: ${formatDate(order.createdAt)}`, pageWidth - margin, y, {
    align: "right",
  });

  y += 6;
  pdf.setTextColor(34, 34, 34);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(`Status: ${STATUS_LABELS[order.status]}`, margin, y);

  y += 10;

  // CUSTOMER
  pdf.setDrawColor(229, 229, 229);
  pdf.setFillColor(250, 250, 250);
  pdf.rect(margin, y, pageWidth - margin * 2, 30, "FD");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(34, 34, 34);
  pdf.text("BILL TO", margin + 3, y + 6);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(60, 60, 60);

  const custName = order.address?.name || "—";
  const custPhone = order.address?.phone || "—";
  const custAddr = order.address?.address || "—";
  const custDistrict = order.address?.district
    ? `, ${order.address.district}`
    : "";

  pdf.text(`Name: ${custName}`, margin + 3, y + 12);
  pdf.text(`Phone: ${custPhone}`, margin + 3, y + 18);
  pdf.text(`Address: ${custAddr}${custDistrict}`, margin + 3, y + 24);

  pdf.text(
    `Payment: ${order.paymentMethod}`,
    pageWidth - margin - 3,
    y + 12,
    { align: "right" }
  );

  y += 38;

  // ITEMS TABLE
  pdf.setFillColor(255, 102, 0);
  pdf.rect(margin, y, pageWidth - margin * 2, 8, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("ITEM", margin + 3, y + 5.5);
  pdf.text("QTY", pageWidth - margin - 50, y + 5.5, { align: "right" });
  pdf.text("PRICE", pageWidth - margin - 25, y + 5.5, { align: "right" });
  pdf.text("TOTAL", pageWidth - margin - 3, y + 5.5, { align: "right" });

  y += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(34, 34, 34);

  for (let i = 0; i < order.items.length; i++) {
    const item = order.items[i];
    const lineTotal = item.price * item.quantity;
    const title = item.title || "Product";
    const truncated = title.length > 55 ? title.slice(0, 52) + "…" : title;

    if (i % 2 === 0) {
      pdf.setFillColor(250, 250, 250);
      pdf.rect(margin, y, pageWidth - margin * 2, 8, "F");
    }

    pdf.setTextColor(34, 34, 34);
    pdf.text(truncated, margin + 3, y + 5.5);
    pdf.text(String(item.quantity), pageWidth - margin - 50, y + 5.5, {
      align: "right",
    });
    pdf.text(formatTk(item.price), pageWidth - margin - 25, y + 5.5, {
      align: "right",
    });
    pdf.setFont("helvetica", "bold");
    pdf.text(formatTk(lineTotal), pageWidth - margin - 3, y + 5.5, {
      align: "right",
    });
    pdf.setFont("helvetica", "normal");

    y += 8;

    if (y > pageHeight - 80) {
      pdf.addPage();
      y = margin;
    }
  }

  y += 4;
  pdf.setDrawColor(229, 229, 229);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;

  // TOTALS
  const totalsX = pageWidth - margin - 3;
  const labelsX = pageWidth - margin - 55;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(102, 102, 102);

  pdf.text("Subtotal", labelsX, y);
  pdf.setTextColor(34, 34, 34);
  pdf.text(formatTk(order.subtotal), totalsX, y, { align: "right" });
  y += 6;

  pdf.setTextColor(102, 102, 102);
  pdf.text("Shipping", labelsX, y);
  pdf.setTextColor(34, 34, 34);
  pdf.text(formatTk(order.shipping), totalsX, y, { align: "right" });
  y += 6;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(227, 27, 22);
  pdf.text("TOTAL", labelsX, y);
  pdf.text(formatTk(order.total), totalsX, y, { align: "right" });
  y += 10;

  // PAYMENT STATUS
  const paid = order.paidAmount ?? order.total;
  const due = Math.max(0, order.total - paid);
  const isPaid = due === 0;

  const boxColor: [number, number, number] = isPaid
    ? [76, 175, 114]
    : [227, 27, 22];
  const boxBg: [number, number, number] = isPaid
    ? [230, 248, 237]
    : [253, 232, 231];

  pdf.setFillColor(...boxBg);
  pdf.setDrawColor(...boxColor);
  pdf.rect(margin, y, pageWidth - margin * 2, 22, "FD");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(...boxColor);
  pdf.text(isPaid ? "PAID IN FULL" : "PARTIAL PAYMENT", margin + 3, y + 7);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(60, 60, 60);

  pdf.text(`Amount Paid: ${formatTk(paid)}`, margin + 3, y + 14);
  pdf.text(`Amount Due: ${formatTk(due)}`, margin + 3, y + 19.5);

  if (order.transactionId) {
    pdf.text(
      `TXN: ${order.transactionId}`,
      pageWidth - margin - 3,
      y + 14,
      { align: "right" }
    );
  }

  y += 30;

  // FOOTER
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text(
    "Thank you for shopping with us!",
    pageWidth / 2,
    pageHeight - 15,
    { align: "center" }
  );
  pdf.text(
    `Generated on ${new Date().toLocaleString("en-GB")}`,
    pageWidth / 2,
    pageHeight - 11,
    { align: "center" }
  );

  pdf.save(`Order-${order.id}.pdf`);
}