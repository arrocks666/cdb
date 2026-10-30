// lib/sendEmail.ts
import { formatBDT } from "@/lib/data";
import { Order, STATUS_LABELS, OrderStatus } from "@/lib/OrderContext";

// ✅ Where customer replies will be sent
const REPLY_TO_EMAIL = "orderchinadailybazar@gmail.com"; // 👈 Change this to your client's real Gmail

// ✅ A beautiful branded email wrapper
function emailWrapper(title: string, content: string) {
  return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
      <div style="text-align: center; padding-bottom: 20px;">
        <h1 style="color: #D4AF37; margin: 0; font-size: 28px;">ChinaDailyBazar</h1>
        <p style="color: #666; font-size: 12px; margin-top: 4px;">Best Chinese Products in Bangladesh</p>
      </div>
      <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-top: 4px solid #D4AF37;">
        <h2 style="color: #333; margin-top: 0; font-size: 20px;">${title}</h2>
        ${content}
      </div>
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 11px;">
        <p>If you have any questions, reply to this email or contact us on WhatsApp.</p>
        <p>&copy; ${new Date().getFullYear()} ChinaDailyBazar. All rights reserved.</p>
      </div>
    </div>
  `;
}

// Helper to call the secure API
async function sendEmailViaAPI(to: string, subject: string, html: string) {
  try {
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html, replyTo: REPLY_TO_EMAIL }),
    });
    return await res.json();
  } catch (err) {
    console.error("❌ Failed to call email API:", err);
    return { success: false };
  }
}

// ✅ 1. Send Order Confirmation Email
export async function sendOrderEmail(order: Order) {
  if (!order.address?.email) return { success: false, error: "No email" };

  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
        <div style="display: flex; align-items: center; gap: 10px;">
          ${item.image ? `<img src="${item.image}" alt="img" style="width: 50px; height: 50px; object-fit: contain; border-radius: 4px; border: 1px solid #eee;" />` : ''}
          <div>
            <p style="margin: 0; font-weight: bold; color: #333; font-size: 14px;">${item.title || 'Product'}</p>
            <p style="margin: 2px 0 0 0; color: #666; font-size: 12px;">Qty: ${item.quantity} ${item.variant ? `| Variant: ${item.variant}` : ''}</p>
          </div>
        </div>
      </td>
      <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; color: #D32F2F; font-size: 14px;">${formatBDT(item.price * item.quantity)}</td>
    </tr>
  `).join('');

  const servicesHtml = order.selectedServices && order.selectedServices.length > 0 
    ? order.selectedServices.map(s => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><span style="color: #666; font-size: 14px;">${s.name}</span></td>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; color: #333; font-size: 14px;">${formatBDT(s.price)}</td>
      </tr>
    `).join('') : '';

  const content = `
    <p style="color: #666; font-size: 14px;">Hello <strong>${order.address.name || 'Customer'}</strong>,</p>
    <p style="color: #666; font-size: 14px;">Thank you for your order! We have received it successfully and will begin processing it shortly.</p>
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Order ID</p>
      <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #D4AF37;">#${order.id}</p>
    </div>
    <h3 style="color: #333; font-size: 16px; border-bottom: 2px solid #D4AF37; padding-bottom: 5px;">Order Summary</h3>
    <table style="width: 100%; border-collapse: collapse;">${itemsHtml}${servicesHtml}</table>
    <table style="width: 100%; margin-top: 20px; font-size: 14px;">
      <tr><td style="color: #666;">Subtotal</td><td style="text-align: right; color: #333;">${formatBDT(order.subtotal)}</td></tr>
      ${order.selectedServices && order.selectedServices.length > 0 ? `<tr><td style="color: #666;">Services</td><td style="text-align: right; color: #333;">${formatBDT(order.selectedServices.reduce((sum, s) => sum + s.price, 0))}</td></tr>` : ''}
      <tr><td style="color: #666;">Shipping</td><td style="text-align: right; color: #333;">${order.shipping > 0 ? formatBDT(order.shipping) : 'Free'}</td></tr>
      <tr><td style="font-weight: bold; color: #333; padding-top: 10px; border-top: 2px solid #eee;">Total</td><td style="text-align: right; font-weight: bold; color: #D32F2F; font-size: 18px; padding-top: 10px; border-top: 2px solid #eee;">${formatBDT(order.total)}</td></tr>
    </table>
    <div style="margin-top: 30px; padding: 15px; background-color: #e8f5e9; border-radius: 6px; border: 1px solid #c8e6c9;">
      <p style="margin: 0; color: #2e7d32; font-size: 14px;"><strong>Payment Method:</strong> ${order.paymentMethod}</p>
      <p style="margin: 5px 0 0 0; color: #2e7d32; font-size: 14px;"><strong>Delivery Address:</strong> ${order.address.address}, ${order.address.district}</p>
    </div>
  `;

  return sendEmailViaAPI(order.address.email, `Order Confirmed: #${order.id}`, emailWrapper("Order Confirmed!", content));
}

// ✅ 2. Send Status Update Email
export async function sendStatusUpdateEmail(order: Order, newStatus: OrderStatus) {
  if (!order.address?.email) return { success: false, error: "No email" };
  const content = `
    <p style="color: #666; font-size: 14px;">Hello <strong>${order.address.name || 'Customer'}</strong>,</p>
    <p style="color: #666; font-size: 14px;">Your order status has been updated.</p>
    <div style="text-align: center; margin: 30px 0;">
      <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Order #${order.id}</p>
      <div style="display: inline-block; background-color: #D4AF37; color: white; padding: 10px 20px; border-radius: 30px; font-weight: bold; font-size: 16px; margin-top: 10px;">${STATUS_LABELS[newStatus]}</div>
    </div>
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 6px; margin-top: 20px;">
      <p style="margin: 0; color: #333; font-size: 14px;"><strong>Current Status:</strong> ${STATUS_LABELS[newStatus]}</p>
      ${order.statusNotes?.[newStatus] ? `<p style="margin: 8px 0 0 0; color: #666; font-size: 13px; font-style: italic;">Note: "${order.statusNotes[newStatus]}"</p>` : ''}
    </div>
  `;
  return sendEmailViaAPI(order.address.email, `Order Update: #${order.id} is ${STATUS_LABELS[newStatus]}`, emailWrapper("Order Status Updated", content));
}

// ✅ 3. Send Payment Received Email
export async function sendPaymentEmail(order: Order, amountAdded: number) {
  if (!order.address?.email) return { success: false, error: "No email" };
  const content = `
    <p style="color: #666; font-size: 14px;">Hello <strong>${order.address.name || 'Customer'}</strong>,</p>
    <p style="color: #666; font-size: 14px;">We have successfully received your payment. Thank you!</p>
    <div style="background-color: #e8f5e9; border: 1px solid #c8e6c9; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0;">
      <p style="margin: 0; color: #2e7d32; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Amount Received</p>
      <p style="margin: 10px 0 0 0; font-size: 32px; font-weight: bold; color: #2e7d32;">${formatBDT(amountAdded)}</p>
    </div>
    <table style="width: 100%; font-size: 14px; margin-top: 20px;">
      <tr><td style="color: #666; padding-bottom: 10px;">Order ID</td><td style="text-align: right; font-weight: bold; color: #333; padding-bottom: 10px;">#${order.id}</td></tr>
      <tr><td style="color: #666; padding-bottom: 10px;">Total Amount Paid</td><td style="text-align: right; font-weight: bold; color: #2e7d32; padding-bottom: 10px;">${formatBDT(order.paidAmount || 0)}</td></tr>
      <tr><td style="color: #666; padding-bottom: 10px;">Remaining Due</td><td style="text-align: right; font-weight: bold; color: #D32F2F; padding-bottom: 10px;">${formatBDT(order.dueAmount || 0)}</td></tr>
    </table>
  `;
  return sendEmailViaAPI(order.address.email, `Payment Received for Order #${order.id}`, emailWrapper("Payment Received", content));
}