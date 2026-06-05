import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, FileText, User, Package, Download, Loader2,
  AlertTriangle, Wallet, X, Check, Clock,  Printer, Receipt, RotateCcw, CreditCard, Mail, Send

} from 'lucide-react';
import api from '../../utils/api';

const formatPrice = (paise) => {
  if (paise == null) return '\u2014';
  return `\u20B9${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const paymentStatusColors = {
  PAID: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', icon: Check },
  PARTIAL: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500', icon: Wallet },
  PENDING: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-300', dot: 'bg-slate-400', icon: Clock },
  OVERDUE: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500', icon: AlertTriangle },
  CANCELLED: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-400 dark:text-slate-500', dot: 'bg-slate-300', icon: X },
};

const paymentMethodLabels = {
  CASH: 'Cash', UPI: 'UPI', CARD: 'Card',
  BANK_TRANSFER: 'Bank Transfer', CREDIT: 'Credit',
};

const GstRateLabels = {
  RATE_0: '0%', RATE_5: '5%', RATE_12: '12%', RATE_18: '18%', RATE_28: '28%',
};

const SaleDetail = () => {
  const { id } = useParams();


  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Company profile for print layout
  const [companyProfile, setCompanyProfile] = useState(null);

  // Email Invoice modal
  const [emailModal, setEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailNote, setEmailNote] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailError, setEmailError] = useState(null);
  const [emailSent, setEmailSent] = useState(false);

  // Payment modal
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Search params for action=payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'payment') {
      setPaymentModal(true);
    }
  }, []);

  const fetchSale = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [saleRes, profileRes] = await Promise.all([
        api.get(`/sales/${id}`),
        api.get('/settings/company'),
      ]);
      setSale(saleRes.data.data);
      setCompanyProfile(profileRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSale();
  }, [fetchSale]);

  // POS-style Receipt print
  const handlePrintReceipt = () => {
    if (!sale) return;

    const s = sale;
    const cp = companyProfile;
    const shopName = cp?.companyName || s.branch?.name || 'StockMate Pro';
    const shopAddr = cp?.address || s.branch?.address || '';
    const shopPhone = cp?.phone || s.branch?.phone || '';
    const shopGst = cp?.gstNumber || s.branch?.gstNumber || '';

    const itemsRows = (s.items || []).map((item, idx) => {
      const gstPercent = parseInt((item.gstRate || 'RATE_18').replace('RATE_', ''));
      const lineTotal = item.unitPrice * item.quantity;
      const itemDisc = item.discount || 0;
      const gstAmount = item.gstAmount || Math.round((lineTotal - itemDisc) * gstPercent / 100);
      const total = item.totalPrice || (lineTotal - itemDisc + gstAmount);
      const rate = (item.unitPrice / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
      const totalStr = (total / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
      return `
          <tr>
            <td colspan="3" style="font-size: 11px; font-weight: 500;">${idx + 1}. ${(item.item?.name || 'Item')}</td>
          </tr>
          <tr>
            <td style="font-size: 10px; color: #64748b;">${item.item?.sku || ''}</td>
            <td style="font-size: 10px; text-align: right; color: #64748b;">${item.quantity} x \u20B9${rate}</td>
            <td style="font-size: 11px; text-align: right; font-weight: 600;">\u20B9${totalStr}</td>
          </tr>`;
    }).join('\n');

    const printWindow = window.open('', '_blank', 'width=400,height=700');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${s.invoiceNo}</title>
        <style>
          @page {
            margin: 0;
            size: 80mm auto;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', 'Consolas', monospace;
            font-size: 12px;
            color: #1e293b;
            line-height: 1.4;
            width: 80mm;
            margin: 0 auto;
            padding: 6mm 4mm;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .center { text-align: center; }
          .right { text-align: right; }
          .left { text-align: left; }
          .line { border-top: 1px dashed #94a3b8; margin: 4px 0; }
          .thk-line { border-top: 2px solid #1e293b; margin: 6px 0; }
          .shop-name {
            font-size: 18px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 2px;
          }
          .shop-info { font-size: 10px; color: #475569; }
          .receipt-title {
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin: 6px 0 2px;
          }
          .invoice-no {
            font-size: 16px;
            font-weight: 700;
            margin: 2px 0;
          }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 1px 0; }
          .items-table td { padding: 2px 0; }
          .total-row td:first-child { padding-right: 4px; }
          .total-row td:last-child { text-align: right; }
          .grand-total td {
            font-size: 14px;
            font-weight: 700;
            padding-top: 4px;
          }
          .balances {
            margin-top: 4px;
            font-size: 11px;
          }
          .pay-info {
            font-size: 11px;
            margin: 4px 0;
          }
          .footer {
            margin-top: 8px;
            padding-top: 6px;
            border-top: 1px dashed #94a3b8;
            text-align: center;
            font-size: 10px;
            color: #64748b;
          }
          .notes-box {
            margin-top: 6px;
            padding: 4px 0;
            font-size: 10px;
            color: #475569;
            border-top: 1px dashed #94a3b8;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="shop-name">${shopName}</div>
          ${shopAddr ? `<div class="shop-info">${shopAddr}</div>` : ''}
          ${shopPhone ? `<div class="shop-info">Tel: ${shopPhone}</div>` : ''}
          ${shopGst ? `<div class="shop-info">GST: ${shopGst}</div>` : ''}
        </div>
        <div class="thk-line"></div>
        <div class="center">
          <div class="receipt-title">${s.isReturn ? 'RETURN RECEIPT' : 'SALE RECEIPT'}</div>
          <div class="invoice-no">${s.invoiceNo}</div>
          <div style="font-size: 10px; color: #475569;">${new Date(s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <div class="line"></div>

        ${s.customer ? `
        <div style="font-size: 10px; margin-bottom: 4px;">
          <strong>CUSTOMER:</strong> ${s.customer.name}${s.customer.phone ? ' | ' + s.customer.phone : ''}
        </div>
        ` : ''}

        <table class="items-table">
          <thead>
            <tr style="border-bottom: 1px dashed #94a3b8;">
              <td style="font-size: 10px; font-weight: 700; padding-bottom: 2px;">ITEM</td>
              <td style="font-size: 10px; font-weight: 700; text-align: right; padding-bottom: 2px;">RATE</td>
              <td style="font-size: 10px; font-weight: 700; text-align: right; padding-bottom: 2px;">TOTAL</td>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="line"></div>

        <table style="margin-top: 2px;">
          <tr class="total-row"><td>Subtotal</td><td>\u20B9${(s.subtotal / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
          ${s.discountTotal > 0 ? `<tr class="total-row"><td>Discount</td><td style="color: #dc2626;">\u2212\u20B9${(s.discountTotal / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>` : ''}
          <tr class="total-row"><td>GST</td><td>\u20B9${(s.gstTotal / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
          <tr class="grand-total"><td>GRAND TOTAL</td><td>\u20B9${(s.grandTotal / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
        </table>

        <div class="pay-info">
          <strong>PAYMENT:</strong> ${(s.paymentMethod || 'CASH').replace(/_/g, ' ')} | <strong>${s.paymentStatus}</strong>
        </div>

        ${s.balanceAmount > 0 ? `
        <table class="balances">
          <tr><td>Paid</td><td class="right">\u20B9${(s.paidAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
          <tr><td>Balance Due</td><td class="right" style="color: #d97706;">\u20B9${(s.balanceAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
        </table>
        ` : `<div class="pay-info" style="color: #059669;">PAID \u2713</div>`}

        ${s.notes ? `
        <div class="notes-box">
          <strong>NOTES:</strong><br/>
          ${s.notes}
        </div>
        ` : ''}

        <div class="footer">
          <div style="font-weight: 600; font-size: 12px; color: #334155;">${cp?.footerText || 'Thank you for your visit!'}</div>
          <div style="margin-top: 2px;">${new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
          <div style="margin-top: 2px; font-size: 9px;">E&OE | Powered by StockMate Pro</div>
        </div>

        <div class="no-print" style="text-align: center; margin-top: 12px;">
          <button onclick="window.print()" style="
            padding: 8px 24px;
            background: #1e293b;
            color: #fff;
            border: none;
            border-radius: 4px;
            font-size: 13px;
            cursor: pointer;
            font-family: 'Segoe UI', sans-serif;
            font-weight: 600;
          ">\uD83D\uDD28 Print Receipt</button>
          <p style="margin-top: 4px; font-size: 10px; color: #94a3b8; font-family: 'Segoe UI', sans-serif;">Press Ctrl+P or click above</p>
        </div>

        <script>
          setTimeout(() => { window.print(); }, 800);
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Print Invoice
  const handlePrintInvoice = () => {
    if (!sale) return;

    const s = sale;
    const cp = companyProfile;
    const shopName = cp?.companyName || s.branch?.name || 'StockMate Pro';
    const shopAddr = cp?.address || s.branch?.address || '';
    const shopPhone = cp?.phone || s.branch?.phone || '';
    const shopGst = cp?.gstNumber || s.branch?.gstNumber || '';
    const shopLogo = cp?.logoUrl || '';
    const footerText = cp?.footerText || 'Thank you for your business!';

    const itemsRows = (s.items || []).map((item, idx) => {
      const gstPercent = parseInt((item.gstRate || 'RATE_18').replace('RATE_', ''));
      const lineTotal = item.unitPrice * item.quantity;
      const itemDisc = item.discount || 0;
      const gstAmount = item.gstAmount || Math.round((lineTotal - itemDisc) * gstPercent / 100);
      const total = item.totalPrice || (lineTotal - itemDisc + gstAmount);

      return `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>
            ${item.item?.name || 'Item'}
            <span class="sku">${item.item?.sku || ''}</span>
          </td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-right">\u20B9${(item.unitPrice / 100).toLocaleString('en-IN')}</td>
          ${itemDisc > 0 ? `<td class="text-right">\u20B9${(itemDisc / 100).toLocaleString('en-IN')}</td>` : '<td class="text-right text-muted">\u2014</td>'}
          <td class="text-center">${gstPercent}%</td>
          <td class="text-right">\u20B9${(total / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>`;
    }).join('\n');

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${s.invoiceNo}</title>
        <style>
          @page { margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            color: #1e293b;
            line-height: 1.5;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 20px;
            border-bottom: 2px solid #059669;
            margin-bottom: 24px;
          }
          .header-left h1 {
            font-size: 20px;
            color: #059669;
            margin-bottom: 4px;
          }
          .header-left p {
            color: #64748b;
            font-size: 12px;
          }
          .header-right {
            text-align: right;
          }
          .header-right h2 {
            font-size: 24px;
            font-family: 'Courier New', monospace;
            color: #1e293b;
            margin-bottom: 4px;
          }
          .header-right .status {
            display: inline-block;
            padding: 3px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .badge-paid { background: #d1fae5; color: #059669; }
          .badge-partial { background: #fef3c7; color: #d97706; }
          .badge-pending { background: #e2e8f0; color: #64748b; }
          .badge-overdue { background: #fee2e2; color: #dc2626; }
          .badge-cancelled { background: #e2e8f0; color: #94a3b8; }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-bottom: 24px;
          }
          .info-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 14px;
          }
          .info-box h3 {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            margin-bottom: 8px;
          }
          .info-box p { font-size: 13px; color: #334155; }
          .info-box .label { color: #94a3b8; font-size: 11px; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            background: #05966911;
            color: #475569;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 10px 8px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
          }
          td {
            padding: 8px;
            font-size: 13px;
            border-bottom: 1px solid #f1f5f9;
          }
          .sku { font-size: 11px; color: #94a3b8; display: block; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .text-muted { color: #94a3b8; }
          .totals {
            margin-left: auto;
            width: 320px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
          }
          .totals table { margin-bottom: 0; }
          .totals td { padding: 6px 14px; }
          .totals .grand-total td {
            background: #059669;
            color: #fff;
            font-weight: 700;
            font-size: 14px;
          }
          .payment-row td {
            padding: 4px 14px;
            font-size: 12px;
          }
          .notes {
            margin-top: 20px;
            padding: 14px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
          }
          .notes h3 {
            font-size: 11px;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 6px;
          }
          .notes p {
            font-size: 12px;
            color: #475569;
            white-space: pre-wrap;
          }
          .footer {
            margin-top: 30px;
            padding-top: 14px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            ${shopLogo ? `<img src="${shopLogo}" alt="Logo" style="height: 48px; margin-bottom: 8px;" />` : ''}
            <h1>${shopName}</h1>
            ${shopAddr ? `<p>${shopAddr}</p>` : ''}
            ${shopPhone ? `<p>Phone: ${shopPhone}</p>` : ''}
            ${shopGst ? `<p>GST: ${shopGst}</p>` : ''}
          </div>
          <div class="header-right">
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Tax Invoice</div>
            <h2>${s.invoiceNo}</h2>
            <div class="status badge-${s.paymentStatus.toLowerCase()}">${s.paymentStatus}</div>
            <p style="margin-top: 6px; font-size: 12px; color: #64748b;">
              Date: ${new Date(s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
            ${s.isReturn ? `<p style="font-size: 12px; color: #7c3aed;">Return Invoice</p>` : ''}
          </div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h3>Customer</h3>
            ${s.customer ? `
              <p style="font-weight: 600; margin-bottom: 4px;">${s.customer.name}</p>
              ${s.customer.phone ? `<p>Phone: ${s.customer.phone}</p>` : ''}
              ${s.customer.email ? `<p>Email: ${s.customer.email}</p>` : ''}
              ${s.customer.address ? `<p>${s.customer.address}</p>` : ''}
              ${s.customer.gstNumber ? `<p>GST: ${s.customer.gstNumber}</p>` : ''}
            ` : '<p style="font-weight: 600;">Walk-in Customer</p>'}
          </div>
          <div class="info-box">
            <h3>Payment</h3>
            <p><span class="label">Method:</span> ${s.paymentMethod?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'CASH'}</p>
            <p><span class="label">Status:</span> ${s.paymentStatus}${s.paymentStatus === 'PAID' ? ' \u2713' : ''}</p>
            <p><span class="label">Paid:</span> \u20B9${(s.paidAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            ${s.balanceAmount > 0 ? `<p><span class="label">Balance:</span> \u20B9${(s.balanceAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>` : ''}
            <p style="margin-top: 4px;"><span class="label">Items:</span> ${s.items?.length || 0}</p>
            <p><span class="label">Created by:</span> ${s.user ? s.user.firstName + ' ' + s.user.lastName : '\u2014'}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 36px;">#</th>
              <th>Item</th>
              <th class="text-center" style="width: 48px;">Qty</th>
              <th class="text-right" style="width: 88px;">Rate</th>
              <th class="text-right" style="width: 72px;">Disc</th>
              <th class="text-center" style="width: 52px;">GST</th>
              <th class="text-right" style="width: 96px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="totals">
          <table>
            <tr><td>Subtotal</td><td class="text-right">\u20B9${(s.subtotal / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
            ${s.discountTotal > 0 ? `<tr><td>Discount${s.discountType ? ' (' + s.discountType.charAt(0) + s.discountType.slice(1).toLowerCase() + ')' : ''}</td><td class="text-right" style="color: #dc2626;">\u2212\u20B9${(s.discountTotal / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>` : ''}
            <tr><td>GST Total</td><td class="text-right">\u20B9${(s.gstTotal / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
            <tr class="grand-total"><td><strong>Grand Total</strong></td><td class="text-right"><strong>\u20B9${(s.grandTotal / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td></tr>
            ${s.balanceAmount <= 0 ? '' : `
            <tr class="payment-row"><td style="color: #d97706;">Balance Due</td><td class="text-right" style="color: #d97706;">\u20B9${(s.balanceAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
            `}
          </table>
        </div>

        ${s.notes ? `
        <div class="notes">
          <h3>Notes</h3>
          <p>${s.notes}</p>
        </div>
        ` : ''}

        <div class="footer">
          <p>${footerText} | ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          <p style="margin-top: 2px;">This is a computer-generated invoice.</p>
        </div>

        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="
            padding: 10px 28px;
            background: #059669;
            color: #fff;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            font-weight: 600;
          ">\uD83D\uDD28 Print / Save as PDF</button>
          <p style="margin-top: 6px; font-size: 11px; color: #94a3b8;">Press Ctrl+P or click the button above</p>
        </div>

        <script>
          setTimeout(() => { window.print(); }, 800);
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Handle email invoice
  const handleEmailInvoice = async (e) => {
    e.preventDefault();
    if (!emailTo) return;
    setSendingEmail(true);
    setEmailError(null);
    try {
      await api.post(`/sales/${id}/email`, {
        to: emailTo,
        note: emailNote || undefined,
      });
      setEmailSent(true);
      setTimeout(() => {
        setEmailModal(false);
        setEmailSent(false);
        setEmailTo('');
        setEmailNote('');
      }, 2500);
    } catch (err) {
      setEmailError(err.response?.data?.message || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  // Open email modal
  const openEmailModal = () => {
    setEmailTo(sale?.customer?.email || '');
    setEmailNote('');
    setEmailError(null);
    setEmailSent(false);
    setEmailModal(true);
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    try {
      const res = await api.get(`/sales/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${sale?.invoiceNo || id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download failed:', err);
    }
  };

  // Record payment
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const amount = paymentAmount ? Math.round(parseFloat(paymentAmount) * 100) : 0;
    if (amount <= 0) return;

    setRecordingPayment(true);
    try {
      await api.post(`/sales/${id}/payment`, { amount, paymentMethod });
      setPaymentModal(false);
      setPaymentAmount('');
      setPaymentMethod('CASH');
      fetchSale();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="skeleton h-10 w-10 rounded-lg" />
          <div>
            <div className="skeleton h-8 w-56 mb-2" />
            <div className="skeleton h-4 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-4 space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex justify-between">
                  <div className="skeleton h-4 w-24" />
                  <div className="skeleton h-4 w-32" />
                </div>
              ))}
            </div>
            <div className="card p-4">
              <div className="skeleton h-6 w-24 mb-4" />
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton h-12 w-full mb-2" />
              ))}
            </div>
          </div>
          <div className="card p-4 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton h-16 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-4">
          <Link to="/sales" className="btn-ghost p-2">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Invoice Not Found</h1>
        </div>
        <div className="card border-red-200 dark:border-red-800">
          <div className="p-12 text-center">
            <AlertTriangle size={48} className="mx-auto mb-4 text-red-400" />
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Failed to Load Invoice</h3>
            <p className="text-sm text-slate-500 mb-4">{error}</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={fetchSale} className="btn-primary btn-sm">Try Again</button>
              <Link to="/sales" className="btn-secondary btn-sm">Back to Sales</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!sale) return null;

  const statusColor = paymentStatusColors[sale.paymentStatus] || paymentStatusColors.PENDING;
  const StatusIcon = statusColor.icon;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/sales" className="btn-ghost p-2">
            <ArrowLeft size={20} />
          </Link>
          <div className="w-12 h-12 rounded-xl bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
            <FileText size={24} className="text-accent-600 dark:text-accent-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-mono">
                {sale.invoiceNo}
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
                <StatusIcon size={14} />
                {sale.paymentStatus}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              {formatDateTime(sale.createdAt)}
              {sale.isReturn && (
                <span className="ml-2 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">
                  Return
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handlePrintReceipt} className="btn-secondary btn-sm">
            <Receipt size={16} /> Receipt
          </button>
          <button onClick={handlePrintInvoice} className="btn-secondary btn-sm">
            <Printer size={16} /> Invoice
          </button>
          <button onClick={handleDownloadPdf} className="btn-secondary btn-sm">
            <Download size={16} /> PDF
          </button>
          <button onClick={openEmailModal} className="btn-secondary btn-sm">
            <Mail size={16} /> Email
          </button>
          {sale.balanceAmount > 0 && (
            <button onClick={() => setPaymentModal(true)} className="btn-primary btn-sm">
              <Wallet size={16} /> Record Payment
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main - Items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Totals card */}
          <div className="card">
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Subtotal</p>
                  <p className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">
                    {formatPrice(sale.subtotal)}
                  </p>
                </div>
                {sale.discountTotal > 0 && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Discount</p>
                    <p className="text-lg font-bold font-mono text-red-700 dark:text-red-300">
                      -{formatPrice(sale.discountTotal)}
                    </p>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">GST Total</p>
                  <p className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">
                    {formatPrice(sale.gstTotal)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-accent-50 dark:bg-accent-900/20">
                  <p className="text-xs font-medium text-accent-600 dark:text-accent-400 uppercase tracking-wider mb-1">Grand Total</p>
                  <p className="text-lg font-bold font-mono text-accent-700 dark:text-accent-300">
                    {formatPrice(sale.grandTotal)}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${sale.balanceAmount <= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
                  <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${sale.balanceAmount <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {sale.balanceAmount <= 0 ? 'Paid' : 'Balance'}
                  </p>
                  <p className={`text-lg font-bold font-mono ${sale.balanceAmount <= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                    {formatPrice(sale.balanceAmount <= 0 ? sale.paidAmount : sale.balanceAmount)}
                  </p>
                </div>
              </div>

              {/* Payment breakdown */}
              {sale.balanceAmount > 0 && (
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <span className="text-slate-400">Paid: <span className="font-mono text-slate-600 dark:text-slate-300">{formatPrice(sale.paidAmount)}</span></span>
                  <span className="text-slate-400">via <span className="font-medium">{paymentMethodLabels[sale.paymentMethod] || sale.paymentMethod}</span></span>
                </div>
              )}
            </div>
          </div>

          {/* Items table */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Package size={18} className="text-slate-400" />
                Items ({sale.items?.length || 0})
              </h2>
            </div>
            <div className="card-body p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Item</th>
                      <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Qty</th>
                      <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Rate</th>
                      <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Disc</th>
                      <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">GST</th>
                      <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items?.map((item, idx) => (
                      <tr key={item.id} className="border-b border-slate-100 dark:border-slate-700">
                        <td className="px-4 py-3">
                          <Link
                            to={`/inventory/${item.itemId}`}
                            className="flex items-center gap-3 group/cell"
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                              <Package size={14} className="text-slate-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover/cell:text-accent-500 transition-colors">
                                {item.item?.name || item.item?.sku || `Item #${idx + 1}`}
                              </p>
                              <p className="text-xs text-slate-400 font-mono">{item.item?.sku}</p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-slate-700 dark:text-slate-300">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-slate-700 dark:text-slate-300">
                          {formatPrice(item.unitPrice)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-slate-700 dark:text-slate-300">
                          {item.discount > 0 ? formatPrice(item.discount) : '\u2014'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">
                            {GstRateLabels[item.gstRate] || '18%'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {formatPrice(item.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Notes */}
          {sale.notes && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Notes</h2>
              </div>
              <div className="card-body">
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{sale.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <User size={18} className="text-slate-400" />
                Customer
              </h2>
            </div>
            <div className="card-body">
              {sale.customer ? (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                      <User size={18} className="text-accent-600 dark:text-accent-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{sale.customer.name}</p>
                      <p className="text-xs text-slate-400">{sale.customer.phone}</p>
                    </div>
                  </div>
                  {sale.customer.email && (
                    <p className="text-sm text-slate-500 mb-1">{sale.customer.email}</p>
                  )}
                  {sale.customer.gstNumber && (
                    <p className="text-sm text-slate-500">GST: {sale.customer.gstNumber}</p>
                  )}
                  {sale.customer.address && (
                    <p className="text-sm text-slate-500 mt-1">{sale.customer.address}</p>
                  )}
                  <Link
                    to={`/customers/${sale.customer.id}`}
                    className="text-sm text-accent-500 hover:text-accent-600 font-medium mt-3 inline-block"
                  >
                    View Customer Profile
                  </Link>
                </div>
              ) : (
                <div className="text-center py-4">
                  <User size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-slate-400">Walk-in Customer</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Info */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <CreditCard size={18} className="text-slate-400" />
                Payment Info
              </h2>
            </div>
            <div className="card-body space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Method</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {paymentMethodLabels[sale.paymentMethod] || sale.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Status</span>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusColor.dot}`} />
                  {sale.paymentStatus}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Paid Amount</span>
                <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">{formatPrice(sale.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Balance</span>
                <span className={`font-mono font-medium ${sale.balanceAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                  {sale.balanceAmount > 0 ? formatPrice(sale.balanceAmount) : '\u2014'}
                </span>
              </div>
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Items Count</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{sale.items?.length || 0}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-slate-400">Created By</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {sale.user ? `${sale.user.firstName} ${sale.user.lastName}` : '\u2014'}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-slate-400">Branch</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{sale.branch?.name || '\u2014'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Actions</h2>
            </div>
            <div className="card-body space-y-2">
              <button
                onClick={handlePrintReceipt}
                className="flex items-center gap-3 w-full p-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Receipt size={16} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                Print Receipt (POS)
              </button>
              <button
                onClick={handlePrintInvoice}
                className="flex items-center gap-3 w-full p-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Printer size={16} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                Print Invoice
              </button>
              <button
                onClick={openEmailModal}
                className="flex items-center gap-3 w-full p-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Mail size={16} className="text-purple-600 dark:text-purple-400" />
                </div>
                Email Invoice to Customer
              </button>
              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-3 w-full p-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Download size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                Download Invoice PDF
              </button>
              {sale.balanceAmount > 0 && (
                <button
                  onClick={() => setPaymentModal(true)}
                  className="flex items-center gap-3 w-full p-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <Wallet size={16} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  Record Payment
                </button>
              )}
              {sale.returnOfId && (
                <Link
                  to={`/sales/${sale.returnOfId}`}
                  className="flex items-center gap-3 w-full p-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <RotateCcw size={16} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  View Original Invoice
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Email Invoice Modal */}
      {emailModal && (
        <div className="modal-overlay" onClick={() => { if (!sendingEmail) setEmailModal(false); }}>
          <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Mail size={20} className="text-purple-500" />
                Email Invoice
              </h2>
              <button onClick={() => setEmailModal(false)} className="btn-ghost p-2" disabled={sendingEmail}>
                <X size={20} />
              </button>
            </div>

            {emailSent ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">Email Sent!</h3>
                <p className="text-sm text-slate-500">
                  Invoice <span className="font-mono font-medium">{sale.invoiceNo}</span> has been emailed to <strong>{emailTo}</strong>
                </p>
              </div>
            ) : (
              <form onSubmit={handleEmailInvoice} className="p-5 space-y-5">
                {emailError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                    <AlertTriangle size={16} />
                    {emailError}
                  </div>
                )}

                {/* Invoice summary */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Invoice</span>
                    <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">{sale.invoiceNo}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Grand Total</span>
                    <span className="font-mono text-sm font-semibold text-accent-600 dark:text-accent-400">
                      {formatPrice(sale.grandTotal)}
                    </span>
                  </div>
                </div>

                {/* Customer email */}
                <div>
                  <label className="label">Send To</label>
                  <input
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder={sale.customer?.email || 'customer@example.com'}
                    className="input"
                    required
                    autoFocus
                  />
                  {sale.customer?.email && (
                    <p className="text-xs text-slate-400 mt-1">
                      Customer email: {sale.customer.email}
                    </p>
                  )}
                </div>

                {/* Optional note */}
                <div>
                  <label className="label">Note (optional)</label>
                  <textarea
                    value={emailNote}
                    onChange={(e) => setEmailNote(e.target.value)}
                    placeholder="e.g. Thank you for your purchase!..."
                    rows={3}
                    className="input resize-none"
                  />
                </div>

                {/* Attachment info */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                  <Printer size={16} className="text-purple-500 flex-shrink-0" />
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    A PDF copy of this invoice will be attached to the email
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEmailModal(false)}
                    className="btn-secondary"
                    disabled={sendingEmail}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingEmail || !emailTo}
                    className="btn-primary"
                  >
                    {sendingEmail ? (
                      <><Loader2 size={18} className="animate-spin" /> Sending...</>
                    ) : (
                      <><Send size={16} /> Send Email</>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {paymentModal && (
        <div className="modal-overlay" onClick={() => setPaymentModal(false)}>
          <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold">Record Payment</h2>
              <button onClick={() => setPaymentModal(false)} className="btn-ghost p-2">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-5 space-y-5">
              {/* Current balance info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Invoice Total</p>
                  <p className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">
                    {formatPrice(sale.grandTotal)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Balance Due</p>
                  <p className="text-lg font-bold font-mono text-amber-700 dark:text-amber-300">
                    {formatPrice(sale.balanceAmount)}
                  </p>
                </div>
              </div>

              {/* Payment method */}
              <div>
                <label className="label">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'CASH', label: 'Cash' },
                    { value: 'UPI', label: 'UPI' },
                    { value: 'CARD', label: 'Card' },
                    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPaymentMethod(opt.value)}
                      className={`text-xs px-3 py-2 rounded-lg border font-medium transition-colors min-h-[36px]
                        ${paymentMethod === opt.value
                          ? 'bg-accent-50 border-accent-400 text-accent-700 dark:bg-accent-900/20 dark:border-accent-600 dark:text-accent-300'
                          : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="label">Payment Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">\u20B9</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    max={sale.balanceAmount / 100}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder={(sale.balanceAmount / 100).toFixed(2)}
                    className="input pl-8 font-mono text-lg"
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentAmount((sale.balanceAmount / 100).toFixed(2))}
                  className="text-xs text-accent-500 hover:text-accent-600 font-medium mt-1"
                >
                  Full amount: {formatPrice(sale.balanceAmount)}
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setPaymentModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="btn-primary"
                >
                  {recordingPayment ? (
                    <><Loader2 size={18} className="animate-spin" /> Recording...</>
                  ) : (
                    <><Check size={18} /> Record Payment</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaleDetail;
