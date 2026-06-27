import type { Order } from './types'
import { formatPrice, formatDateTime } from './utils'

// Seller details shown on the invoice header. Edit these to match your
// registered business info (and add a GSTIN line if you have one).
const COMPANY = {
  name: 'NutriPanda',
  tagline: 'Daily wellness gummies',
  email: 'hello@nutripanda.in',
  // Add your registered GSTIN to print a compliant tax invoice (leave '' to hide).
  gstin: '',
}

// GST is 5%, split as CGST 2.5% + SGST 2.5%, shown inclusive in the price.
const GST_RATE = 5

// Prices are GST-inclusive, so the tax is extracted from the total — the amount
// the customer pays never changes.
function computeGst(order: Order) {
  const inclusiveGoods = Math.max(0, order.total_amount - order.shipping_cost)
  const taxableValue = Math.round(inclusiveGoods / (1 + GST_RATE / 100))
  const totalGst = inclusiveGoods - taxableValue
  const cgst = Math.floor(totalGst / 2)
  const sgst = totalGst - cgst
  return { taxableValue, cgst, sgst }
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildInvoiceHtml(order: Order, logoUrl: string): string {
  const address = [
    order.shipping_address.line1,
    order.shipping_address.line2,
    order.shipping_address.city,
    order.shipping_address.state,
    order.shipping_address.pincode,
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join(', ')

  const rows = order.items
    .map(
      (item) => `
        <tr>
          <td>
            <div class="item-name">${escapeHtml(item.name)}</div>
            <div class="item-sub">${escapeHtml(item.slug)}</div>
          </td>
          <td class="num">${item.quantity}</td>
          <td class="num">${formatPrice(item.price)}</td>
          <td class="num">${formatPrice(item.price * item.quantity)}</td>
        </tr>`
    )
    .join('')

  const discountRow =
    order.discount > 0
      ? `<tr><td class="label">Discount</td><td class="num discount">-${formatPrice(order.discount)}</td></tr>`
      : ''

  const gst = computeGst(order)
  const taxRows = `<tr><td class="label">CGST @${GST_RATE / 2}%</td><td class="num">${formatPrice(gst.cgst)}</td></tr>
       <tr><td class="label">SGST @${GST_RATE / 2}%</td><td class="num">${formatPrice(gst.sgst)}</td></tr>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Invoice ${escapeHtml(order.order_number)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1f2937;
    margin: 0;
    padding: 40px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet { max-width: 760px; margin: 0 auto; padding-top: 56px; }
  .head { text-align: center; margin-bottom: 36px; }
  .logo { width: 190px; max-width: 60%; height: auto; margin: 0 auto 10px; display: block; }
  .head .contact { font-size: 12px; color: #6b7280; margin-bottom: 18px; }
  .head .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; color: #9ca3af; }
  .head h2 { font-size: 22px; margin: 2px 0 6px; letter-spacing: -0.02em; }
  .head .meta { font-size: 12px; color: #6b7280; }
  .badges { margin-top: 10px; }
  .badge { display: inline-block; font-size: 11px; font-weight: 700; text-transform: capitalize; padding: 3px 10px; border-radius: 999px; }
  .paid { background: #dcfce7; color: #166534; }
  .unpaid { background: #fef9c3; color: #854d0e; }
  .parties { display: flex; gap: 40px; margin-bottom: 28px; }
  .parties section { flex: 1; }
  .parties h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; margin: 0 0 8px; }
  .parties p { margin: 2px 0; font-size: 13px; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; }
  thead th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; border-bottom: 1px solid #e5e7eb; padding: 0 0 10px; }
  thead th.num { text-align: right; }
  tbody td { padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; vertical-align: top; }
  td.num { text-align: right; white-space: nowrap; }
  .item-name { font-weight: 600; }
  .item-sub { font-size: 11px; color: #9ca3af; margin-top: 2px; }
  .totals { width: 280px; margin-left: auto; margin-top: 18px; }
  .totals tr td { border: none; padding: 6px 0; font-size: 13px; color: #4b5563; }
  .totals td.label { text-align: left; }
  .totals td.num { text-align: right; }
  .totals .discount { color: #16a34a; }
  .totals .grand td { border-top: 2px solid #1f2937; padding-top: 10px; font-size: 16px; font-weight: 800; color: #111827; }
  .taxcap { width: 280px; margin-left: auto; margin-top: 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; text-align: right; }
  .taxbreak { margin-top: 4px; }
  .taxbreak tr td { padding: 4px 0; font-size: 12px; color: #6b7280; }
  .pay { margin-top: 30px; font-size: 11px; color: #9ca3af; line-height: 1.7; }
  .pay span { color: #6b7280; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .foot { margin-top: 36px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; }
  @page { size: A4 portrait; margin: 12mm; }
  @media print {
    /* Bake the breathing room into the sheet itself so it survives even when
       the browser print dialog is set to "Margins: None". */
    body { padding: 0; }
    .sheet { max-width: 100%; padding: 32px 36px 28px; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <img class="logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(COMPANY.name)}" />
      <div class="contact">${escapeHtml(COMPANY.tagline)} · ${escapeHtml(COMPANY.email)}${COMPANY.gstin ? ` · GSTIN: ${escapeHtml(COMPANY.gstin)}` : ''}</div>
      <div class="label">Invoice</div>
      <h2>${escapeHtml(order.order_number)}</h2>
      <div class="meta">Date: ${escapeHtml(formatDateTime(order.created_at))}</div>
      <div class="badges">
        <span class="badge ${order.payment_status === 'paid' ? 'paid' : 'unpaid'}">${escapeHtml(order.payment_status)}</span>
      </div>
    </div>

    <div class="parties">
      <section>
        <h3>Billed To</h3>
        <p><strong>${escapeHtml(order.customer_name)}</strong></p>
        <p>${escapeHtml(order.customer_email)}</p>
        <p>${escapeHtml(order.customer_phone)}</p>
      </section>
      <section>
        <h3>Ship To</h3>
        <p>${address || '—'}</p>
      </section>
    </div>

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th class="num">Qty</th>
          <th class="num">Price</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <table class="totals">
      <tr><td class="label">Subtotal</td><td class="num">${formatPrice(order.subtotal)}</td></tr>
      <tr><td class="label">Shipping</td><td class="num">${order.shipping_cost === 0 ? 'Free' : formatPrice(order.shipping_cost)}</td></tr>
      ${discountRow}
      <tr class="grand"><td class="label">Total</td><td class="num">${formatPrice(order.total_amount)}</td></tr>
    </table>

    <div class="taxcap">Total is inclusive of GST · ${GST_RATE}% (CGST ${GST_RATE / 2}% + SGST ${GST_RATE / 2}%)</div>
    <table class="totals taxbreak">
      <tr><td class="label">Taxable Value</td><td class="num">${formatPrice(gst.taxableValue)}</td></tr>
      ${taxRows}
    </table>

    ${
      order.razorpay_order_id
        ? `<div class="pay">
            Razorpay Order ID: <span>${escapeHtml(order.razorpay_order_id)}</span><br/>
            ${order.razorpay_payment_id ? `Payment ID: <span>${escapeHtml(order.razorpay_payment_id)}</span>` : ''}
          </div>`
        : ''
    }

    <div class="foot">Thank you for shopping with ${escapeHtml(COMPANY.name)}.</div>
  </div>
  <script>
    window.onload = function () {
      window.focus();
      window.print();
    };
    window.onafterprint = function () { window.close(); };
  </script>
</body>
</html>`
}

// Opens a print-ready invoice in a new window. The browser's print dialog
// lets the user "Save as PDF" — no extra dependency needed.
export function downloadInvoice(order: Order): boolean {
  const win = window.open('', '_blank', 'width=860,height=1000')
  if (!win) return false
  // Absolute URL so the logo loads inside the blank print window (relative
  // paths have no base URL in an about:blank document).
  const logoUrl = `${window.location.origin}/logo.png`
  win.document.write(buildInvoiceHtml(order, logoUrl))
  win.document.close()
  return true
}
