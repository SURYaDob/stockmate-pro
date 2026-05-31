import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, ClipboardList, Building2, AlertTriangle, Loader2,
  Package, Wallet, RotateCcw, Printer, Mail, Send,
  Check, X, Clock, Plus, Minus, Download, Truck
} from 'lucide-react';
import api from '../../utils/api';

const formatPrice = (paise) => {
  if (paise == null) return '—';
  return `\u20B9${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const statusColors = {
  DRAFT: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-300', dot: 'bg-slate-400', icon: Clock },
  ORDERED: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500', icon: Truck },
  PARTIAL: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500', icon: Package },
  RECEIVED: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', icon: Check },
  CANCELLED: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-400 dark:text-slate-500', dot: 'bg-slate-300', icon: X },
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

const PurchaseDetail = () => {
  const { id } = useParams();

  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Stock Receive modal
  const [receiveModal, setReceiveModal] = useState(false);
  const [receiveItems, setReceiveItems] = useState([]);
  const [receiving, setReceiving] = useState(false);
  const [receiveError, setReceiveError] = useState(null);

  // Payment modal
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Return to Supplier modal
  const [returnModal, setReturnModal] = useState(false);
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState('');
  const [returning, setReturning] = useState(false);
  const [returnError, setReturnError] = useState(null);

  // Email PO modal
  const [emailModal, setEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailNote, setEmailNote] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailError, setEmailError] = useState(null);
  const [emailSent, setEmailSent] = useState(false);

  // Company profile for print/PDF layout
  const [companyProfile, setCompanyProfile] = useState(null);

  // Search params for action
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    // We'll set these after purchase is loaded
    if (action === 'receive') {
      // Flag to auto-open receive modal after data loads
      window.__openReceiveModal = true;
    }
    if (action === 'payment') {
      window.__openPaymentModal = true;
    }
  }, []);

  const fetchPurchase = async () => {
    setLoading(true);
    setError(null);
    try {
      const [purchaseRes, profileRes] = await Promise.all([
        api.get(`/purchases/${id}`),
        api.get('/settings/company'),
      ]);
      const data = purchaseRes.data.data;
      setPurchase(data);
      setCompanyProfile(profileRes.data.data);

      // Auto-open receive modal if flagged
      if (window.__openReceiveModal && data.status !== 'RECEIVED' && data.status !== 'CANCELLED') {
        openReceiveModal(data);
        window.__openReceiveModal = false;
      }
      if (window.__openPaymentModal && data.balanceAmount > 0) {
        setPaymentModal(true);
        window.__openPaymentModal = false;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load purchase order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchase();
  }, [id]);

  // Open receive modal
  const openReceiveModal = (data) => {
    setReceiveItems(
      (data.items || []).map((item) => ({
        purchaseItemId: item.id,
        itemId: item.itemId,
        name: item.item?.name || `Item`,
        sku: item.item?.sku || '',
        ordered: item.quantity,
        received: item.receivedQty || 0,
        receiveQty: (item.quantity - (item.receivedQty || 0)),
      }))
    );
    setReceiveModal(true);
    setReceiveError(null);
  };

  // Handle receive stock
  const handleReceiveStock = async (e) => {
    e.preventDefault();
    const itemsToReceive = receiveItems
      .filter((ri) => ri.receiveQty > 0 && ri.receiveQty <= (ri.ordered - ri.received))
      .map((ri) => ({ itemId: ri.itemId, quantity: ri.receiveQty }));

    if (itemsToReceive.length === 0) {
      setReceiveError('Enter quantity for at least one item');
      return;
    }

    setReceiving(true);
    setReceiveError(null);
    try {
      await api.post(`/purchases/${id}/receive`, { items: itemsToReceive });
      setReceiveModal(false);
      fetchPurchase();
    } catch (err) {
      setReceiveError(err.response?.data?.message || 'Failed to receive stock');
    } finally {
      setReceiving(false);
    }
  };

  // Open return modal
  const openReturnModal = (data) => {
    setReturnItems(
      (data.items || [])
        .filter((item) => (item.receivedQty || 0) > 0)
        .map((item) => ({
          purchaseItemId: item.id,
          itemId: item.itemId,
          name: item.item?.name || 'Item',
          sku: item.item?.sku || '',
          unitPrice: item.unitPrice,
          gstRate: item.gstRate,
          maxReturn: item.receivedQty || 0,
          returnQty: 0,
        }))
    );
    setReturnReason('');
    setReturnError(null);
    setReturnModal(true);
  };

  // Handle return to supplier
  const handleReturn = async (e) => {
    e.preventDefault();
    const itemsToReturn = returnItems
      .filter((ri) => ri.returnQty > 0 && ri.returnQty <= ri.maxReturn)
      .map((ri) => ({ itemId: ri.itemId, quantity: ri.returnQty }));

    if (itemsToReturn.length === 0) {
      setReturnError('Select at least one item to return');
      return;
    }

    setReturning(true);
    setReturnError(null);
    try {
      await api.post(`/purchases/${id}/return`, {
        items: itemsToReturn,
        reason: returnReason || undefined,
      });
      setReturnModal(false);
      fetchPurchase();
    } catch (err) {
      setReturnError(err.response?.data?.message || 'Failed to process return');
    } finally {
      setReturning(false);
    }
  };

  // Print PO
  const handlePrintPO = () => {
    if (!purchase) return;

    const p = purchase;
    const cp = companyProfile;
    const shopName = cp?.companyName || p.branch?.name || 'StockMate Pro';
    const shopAddr = cp?.address || p.branch?.address || '';
    const shopPhone = cp?.phone || p.branch?.phone || '';
    const shopGst = cp?.gstNumber || p.branch?.gstNumber || '';
    const shopLogo = cp?.logoUrl || '';
    const footerText = cp?.footerText || 'Generated by StockMate Pro';
    const itemsRows = (p.items || []).map((item, idx) => {
      const gstPercent = parseInt((item.gstRate || 'RATE_18').replace('RATE_', ''));
      const lineTotal = item.unitPrice * item.quantity;
      const gstAmount = Math.round(lineTotal * gstPercent / 100);
      const total = lineTotal + gstAmount;
      const received = item.receivedQty || 0;

      return `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>
            ${item.item?.name || 'Item'}
            <span class="sku">${item.item?.sku || ''}</span>
          </td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-center">${received > 0 ? received : '—'}</td>
          <td class="text-right">₹${(item.unitPrice / 100).toLocaleString('en-IN')}</td>
          <td class="text-center">${gstPercent}%</td>
          <td class="text-right">₹${(total / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>`;
    }).join('\n');

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Order - ${p.poNumber}</title>
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
            border-bottom: 2px solid #2563eb;
            margin-bottom: 24px;
          }
          .header-left h1 {
            font-size: 20px;
            color: #2563eb;
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
          .badge-draft { background: #e2e8f0; color: #64748b; }
          .badge-ordered { background: #dbeafe; color: #2563eb; }
          .badge-partial { background: #fef3c7; color: #d97706; }
          .badge-received { background: #d1fae5; color: #059669; }
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
            background: #f1f5f9;
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
            background: #2563eb;
            color: #fff;
            font-weight: 700;
            font-size: 14px;
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
          .payment-row td {
            padding: 4px 14px;
            font-size: 12px;
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
            <h2>${p.poNumber}</h2>
            <div class="status badge-${p.status.toLowerCase()}">${p.status}</div>
            <p style="margin-top: 6px; font-size: 12px; color: #64748b;">
              Order Date: ${new Date(p.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
            ${p.expectedDate ? `<p style="font-size: 12px; color: #64748b;">Expected: ${new Date(p.expectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>` : ''}
          </div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h3>Supplier</h3>
            ${p.supplier ? `
              <p style="font-weight: 600; margin-bottom: 4px;">${p.supplier.name}</p>
              ${p.supplier.address ? `<p>${p.supplier.address}</p>` : ''}
              ${p.supplier.phone ? `<p>Phone: ${p.supplier.phone}</p>` : ''}
              ${p.supplier.email ? `<p>Email: ${p.supplier.email}</p>` : ''}
              ${p.supplier.gstNumber ? `<p>GST: ${p.supplier.gstNumber}</p>` : ''}
            ` : '<p>—</p>'}
          </div>
          <div class="info-box">
            <h3>Payment</h3>
            <p><span class="label">Status:</span> ${p.paymentStatus}${p.paymentStatus === 'PAID' ? ' ✓' : ''}</p>
            <p><span class="label">Paid:</span> ₹${(p.paidAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            ${p.balanceAmount > 0 ? `<p><span class="label">Balance:</span> ₹${(p.balanceAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>` : ''}
            <p style="margin-top: 4px;"><span class="label">Items:</span> ${p.items?.length || 0}</p>
            <p><span class="label">Created by:</span> ${p.user ? p.user.firstName + ' ' + p.user.lastName : '—'}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 36px;">#</th>
              <th>Item</th>
              <th class="text-center" style="width: 48px;">Qty</th>
              <th class="text-center" style="width: 56px;">Recv'd</th>
              <th class="text-right" style="width: 88px;">Rate</th>
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
            <tr><td>Subtotal</td><td class="text-right">₹${(p.subtotal / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
            ${p.discountTotal > 0 ? `<tr><td>Discount</td><td class="text-right" style="color: #dc2626;">−₹${(p.discountTotal / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>` : ''}
            <tr><td>GST Total</td><td class="text-right">₹${(p.gstTotal / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
            <tr class="grand-total"><td><strong>Grand Total</strong></td><td class="text-right"><strong>₹${(p.grandTotal / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td></tr>
            ${p.balanceAmount <= 0 ? '' : `
            <tr class="payment-row"><td style="color: #d97706;">Balance Due</td><td class="text-right" style="color: #d97706;">₹${(p.balanceAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
            `}
          </table>
        </div>

        ${p.supplierInvoice ? `
        <div style="margin-top: 16px; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; display: inline-block;">
          <span style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Supplier Inv:</span>
          <span style="font-size: 13px; font-weight: 600; margin-left: 8px;">${p.supplierInvoice}</span>
          ${p.supplierInvDate ? `<span style="font-size: 12px; color: #64748b; margin-left: 12px;">(${new Date(p.supplierInvDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })})</span>` : ''}
        </div>
        ` : ''}

        ${p.notes ? `
        <div class="notes">
          <h3>Notes</h3>
          <p>${p.notes}</p>
        </div>
        ` : ''}

        <div class="footer">
          <p>${footerText} | ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          <p style="margin-top: 2px;">This is a computer-generated document.</p>
        </div>

        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="
            padding: 10px 28px;
            background: #2563eb;
            color: #fff;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            font-weight: 600;
          ">🖨️ Print / Save as PDF</button>
          <p style="margin-top: 6px; font-size: 11px; color: #94a3b8;">Press Ctrl+P or click the button above</p>
        </div>

        <script>
          // Auto-print after a short delay to ensure fonts/styles load
          setTimeout(() => { window.print(); }, 800);
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    try {
      const res = await api.get(`/purchases/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `purchase-order-${purchase?.poNumber || id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download failed:', err);
    }
  };

  // Handle email PO
  const handleEmailPO = async (e) => {
    e.preventDefault();
    if (!emailTo) return;
    setSendingEmail(true);
    setEmailError(null);
    try {
      await api.post(`/purchases/${id}/email`, {
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
    setEmailTo(purchase?.supplier?.email || '');
    setEmailNote('');
    setEmailError(null);
    setEmailSent(false);
    setEmailModal(true);
  };

  // Handle record payment
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const amount = paymentAmount ? Math.round(parseFloat(paymentAmount) * 100) : 0;
    if (amount <= 0) return;

    setRecordingPayment(true);
    try {
      await api.post(`/purchases/${id}/payment`, { amount, paymentMethod });
      setPaymentModal(false);
      setPaymentAmount('');
      setPaymentMethod('CASH');
      fetchPurchase();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="skeleton h-10 w-10 rounded-lg" />
          <div>
            <div className="skeleton h-8 w-56 mb-2" />
            <div className="skeleton h-4 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6 space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex justify-between">
                  <div className="skeleton h-4 w-24" />
                  <div className="skeleton h-4 w-32" />
                </div>
              ))}
            </div>
            <div className="card p-6">
              <div className="skeleton h-6 w-24 mb-4" />
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton h-12 w-full mb-2" />
              ))}
            </div>
          </div>
          <div className="card p-6 space-y-4">
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
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Link to="/purchases" className="btn-ghost p-2">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Purchase Not Found</h1>
        </div>
        <div className="card border-red-200 dark:border-red-800">
          <div className="p-12 text-center">
            <AlertTriangle size={48} className="mx-auto mb-4 text-red-400" />
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Failed to Load PO</h3>
            <p className="text-sm text-slate-500 mb-4">{error}</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={fetchPurchase} className="btn-primary btn-sm">Try Again</button>
              <Link to="/purchases" className="btn-secondary btn-sm">Back to Purchases</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!purchase) return null;

  const stColor = statusColors[purchase.status] || statusColors.DRAFT;
  const pmColor = paymentStatusColors[purchase.paymentStatus] || paymentStatusColors.PENDING;
  const StatusIcon = stColor.icon;
  const PmStatusIcon = pmColor.icon;
  const canReceive = purchase.status !== 'RECEIVED' && purchase.status !== 'CANCELLED';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/purchases" className="btn-ghost p-2">
            <ArrowLeft size={20} />
          </Link>
          <div className="w-12 h-12 rounded-xl bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
            <ClipboardList size={24} className="text-accent-600 dark:text-accent-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-mono">
                {purchase.poNumber}
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${stColor.bg} ${stColor.text}`}>
                <StatusIcon size={14} />
                {purchase.status}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              Ordered {formatDateTime(purchase.orderDate)}
              {purchase.expectedDate && (
                <span className="ml-2">· Expected {formatDateShort(purchase.expectedDate)}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canReceive && (
            <button onClick={() => openReceiveModal(purchase)} className="btn-primary btn-sm">
              <Package size={16} /> Receive Stock
            </button>
          )}
          {purchase.balanceAmount > 0 && (
            <button onClick={() => setPaymentModal(true)} className="btn-secondary btn-sm">
              <Wallet size={16} /> Record Payment
            </button>
          )}
          <button onClick={handleDownloadPdf} className="btn-secondary btn-sm">
            <Download size={16} /> PDF
          </button>
          <button onClick={handlePrintPO} className="btn-secondary btn-sm">
            <Printer size={16} /> Print PO
          </button>
          <button onClick={openEmailModal} className="btn-secondary btn-sm">
            <Mail size={16} /> Email PO
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Totals card */}
          <div className="card">
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Subtotal</p>
                  <p className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">
                    {formatPrice(purchase.subtotal)}
                  </p>
                </div>
                {purchase.discountTotal > 0 && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Discount</p>
                    <p className="text-lg font-bold font-mono text-red-700 dark:text-red-300">
                      -{formatPrice(purchase.discountTotal)}
                    </p>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">GST Total</p>
                  <p className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">
                    {formatPrice(purchase.gstTotal)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-accent-50 dark:bg-accent-900/20">
                  <p className="text-xs font-medium text-accent-600 dark:text-accent-400 uppercase tracking-wider mb-1">Grand Total</p>
                  <p className="text-lg font-bold font-mono text-accent-700 dark:text-accent-300">
                    {formatPrice(purchase.grandTotal)}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${purchase.balanceAmount <= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
                  <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${purchase.balanceAmount <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {purchase.balanceAmount <= 0 ? 'Paid' : 'Balance'}
                  </p>
                  <p className={`text-lg font-bold font-mono ${purchase.balanceAmount <= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                    {formatPrice(purchase.balanceAmount <= 0 ? purchase.paidAmount : purchase.balanceAmount)}
                  </p>
                </div>
              </div>

              {/* Payment breakdown */}
              {purchase.balanceAmount > 0 && (
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <span className="text-slate-400">Paid: <span className="font-mono text-slate-600 dark:text-slate-300">{formatPrice(purchase.paidAmount)}</span></span>
                </div>
              )}
            </div>
          </div>

          {/* Items table */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Package size={18} className="text-slate-400" />
                Items ({purchase.items?.length || 0})
              </h2>
            </div>
            <div className="card-body p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Item</th>
                      <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Qty</th>
                      <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Received</th>
                      <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Rate</th>
                      <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">GST</th>
                      <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchase.items?.map((item, idx) => {
                      const lineTotal = item.unitPrice * item.quantity;
                      const gstPercent = parseInt((item.gstRate || 'RATE_18').replace('RATE_', ''));
                      const gstAmount = Math.round(lineTotal * gstPercent / 100);
                      const total = lineTotal + gstAmount;
                      const received = item.receivedQty || 0;
                      const remaining = item.quantity - received;

                      return (
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
                                  {item.item?.name || `Item #${idx + 1}`}
                                </p>
                                <p className="text-xs text-slate-400 font-mono">{item.item?.sku}</p>
                              </div>
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm text-slate-700 dark:text-slate-300">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className={`font-mono text-sm font-medium ${
                                remaining > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                              }`}>
                                {received}
                              </span>
                              {remaining > 0 ? (
                                <span className="text-xs text-slate-400">({remaining} pending)</span>
                              ) : (
                                <Check size={14} className="text-emerald-500" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm text-slate-700 dark:text-slate-300">
                            {formatPrice(item.unitPrice)}
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Supplier Invoice info */}
          {(purchase.supplierInvoice || purchase.supplierInvDate) && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Supplier Invoice</h2>
              </div>
              <div className="card-body flex gap-6">
                {purchase.supplierInvoice && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Invoice No</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 font-mono">{purchase.supplierInvoice}</p>
                  </div>
                )}
                {purchase.supplierInvDate && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Invoice Date</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatDateShort(purchase.supplierInvDate)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {purchase.notes && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Notes</h2>
              </div>
              <div className="card-body">
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{purchase.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Supplier */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Building2 size={18} className="text-slate-400" />
                Supplier
              </h2>
            </div>
            <div className="card-body">
              {purchase.supplier ? (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                      <Building2 size={18} className="text-accent-600 dark:text-accent-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{purchase.supplier.name}</p>
                      <p className="text-xs text-slate-400">{purchase.supplier.phone}</p>
                    </div>
                  </div>
                  {purchase.supplier.email && (
                    <p className="text-sm text-slate-500 mb-1">{purchase.supplier.email}</p>
                  )}
                  {purchase.supplier.gstNumber && (
                    <p className="text-sm text-slate-500">GST: {purchase.supplier.gstNumber}</p>
                  )}
                  {purchase.supplier.address && (
                    <p className="text-sm text-slate-500 mt-1">{purchase.supplier.address}</p>
                  )}
                  <Link
                    to={`/suppliers/${purchase.supplier.id}`}
                    className="text-sm text-accent-500 hover:text-accent-600 font-medium mt-3 inline-block"
                  >
                    View Supplier Profile
                  </Link>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Building2 size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-slate-400">Supplier not found</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Info */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Wallet size={18} className="text-slate-400" />
                Payment Info
              </h2>
            </div>
            <div className="card-body space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Status</span>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${pmColor.bg} ${pmColor.text}`}>
                  <PmStatusIcon size={12} />
                  {purchase.paymentStatus}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Paid Amount</span>
                <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">{formatPrice(purchase.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Balance</span>
                <span className={`font-mono font-medium ${purchase.balanceAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                  {purchase.balanceAmount > 0 ? formatPrice(purchase.balanceAmount) : '—'}
                </span>
              </div>
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Items Count</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{purchase.items?.length || 0}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-slate-400">Created By</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {purchase.user ? `${purchase.user.firstName} ${purchase.user.lastName}` : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-slate-400">Branch</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{purchase.branch?.name || '—'}</span>
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
              {canReceive && (
                <button
                  onClick={() => openReceiveModal(purchase)}
                  className="flex items-center gap-3 w-full p-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="p-1.5 rounded-lg bg-accent-100 dark:bg-accent-900/30">
                    <Package size={16} className="text-accent-600 dark:text-accent-400" />
                  </div>
                  Receive Stock
                </button>
              )}
              {purchase.items?.some((i) => (i.receivedQty || 0) > 0) && (
                <button
                  onClick={() => openReturnModal(purchase)}
                  className="flex items-center gap-3 w-full p-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                    <RotateCcw size={16} className="text-orange-600 dark:text-orange-400" />
                  </div>
                  Return to Supplier
                </button>
              )}
              <Link
                to={`/suppliers/${purchase.supplierId}`}
                className="flex items-center gap-3 w-full p-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Building2 size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                View Supplier
              </Link>
              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-3 w-full p-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Download size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                Download PO PDF
              </button>
              <button
                onClick={openEmailModal}
                className="flex items-center gap-3 w-full p-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Mail size={16} className="text-purple-600 dark:text-purple-400" />
                </div>
                Email PO to Supplier
              </button>
              <button
                onClick={handlePrintPO}
                className="flex items-center gap-3 w-full p-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700">
                  <Printer size={16} className="text-slate-500" />
                </div>
                Print Purchase Order
              </button>
              {purchase.balanceAmount > 0 && (
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
            </div>
          </div>

          {/* Progress */}
          {purchase.items && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Receipt Progress</h2>
              </div>
              <div className="card-body">
                {(() => {
                  const totalQty = purchase.items.reduce((s, i) => s + i.quantity, 0);
                  const receivedQty = purchase.items.reduce((s, i) => s + (i.receivedQty || 0), 0);
                  const pct = totalQty > 0 ? Math.round((receivedQty / totalQty) * 100) : 0;
                  return (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400">{receivedQty} of {totalQty} units</span>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{pct}%</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            pct >= 100 ? 'bg-emerald-500' : 'bg-accent-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Receive Stock Modal */}
      {receiveModal && (
        <div className="modal-overlay" onClick={() => setReceiveModal(false)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold">Receive Stock</h2>
              <button onClick={() => setReceiveModal(false)} className="btn-ghost p-2">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleReceiveStock} className="p-6 space-y-4">
              {receiveError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                  <AlertTriangle size={16} />
                  {receiveError}
                </div>
              )}

              <p className="text-sm text-slate-500">
                Enter the quantity received for each item. This will update inventory stock levels.
              </p>

              <div className="max-h-64 overflow-y-auto space-y-3">
                {receiveItems.map((ri) => {
                  const maxReceive = ri.ordered - ri.received;
                  return (
                    <div key={ri.purchaseItemId} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{ri.name}</p>
                        <p className="text-xs text-slate-400">
                          Ordered: {ri.ordered} · Already received: {ri.received}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setReceiveItems(prev =>
                            prev.map(r => r.purchaseItemId === ri.purchaseItemId
                              ? { ...r, receiveQty: Math.max(0, r.receiveQty - 1) }
                              : r
                            )
                          )}
                          className="btn-ghost p-1"
                          disabled={ri.receiveQty <= 0}
                        >
                          <Minus size={14} />
                        </button>
                        <input
                          type="number"
                          min="0"
                          max={maxReceive}
                          value={ri.receiveQty}
                          onChange={(e) => setReceiveItems(prev =>
                            prev.map(r => r.purchaseItemId === ri.purchaseItemId
                              ? { ...r, receiveQty: Math.min(maxReceive, Math.max(0, parseInt(e.target.value) || 0)) }
                              : r
                            )
                          )}
                          className="w-16 text-center input-sm font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setReceiveItems(prev =>
                            prev.map(r => r.purchaseItemId === ri.purchaseItemId
                              ? { ...r, receiveQty: Math.min(maxReceive, r.receiveQty + 1) }
                              : r
                            )
                          )}
                          className="btn-ghost p-1"
                          disabled={ri.receiveQty >= maxReceive}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setReceiveModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={receiving}
                  className="btn-primary"
                >
                  {receiving ? (
                    <><Loader2 size={18} className="animate-spin" /> Receiving...</>
                  ) : (
                    <><Check size={18} /> Confirm Receipt</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return to Supplier Modal */}
      {returnModal && (
        <div className="modal-overlay" onClick={() => setReturnModal(false)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <RotateCcw size={20} className="text-orange-500" />
                Return to Supplier
              </h2>
              <button onClick={() => setReturnModal(false)} className="btn-ghost p-2">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleReturn} className="p-6 space-y-4">
              {returnError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                  <AlertTriangle size={16} />
                  {returnError}
                </div>
              )}

              <p className="text-sm text-slate-500">
                Select items and quantities to return to {purchase.supplier?.name || 'supplier'}.
                This will reduce inventory stock and create a debit note.
              </p>

              {/* Return items */}
              <div className="max-h-64 overflow-y-auto space-y-3">
                {returnItems.length === 0 ? (
                  <div className="text-center py-6">
                    <RotateCcw size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm text-slate-400">No items have been received yet</p>
                  </div>
                ) : (
                  returnItems.map((ri) => (
                    <div key={ri.purchaseItemId} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{ri.name}</p>
                        <p className="text-xs text-slate-400">
                          Received: {ri.maxReturn} · Rate: {formatPrice(ri.unitPrice)}
                          {ri.returnQty > 0 && (
                            <span className="ml-2 text-orange-500 font-medium">
                              Refund: {formatPrice(ri.unitPrice * ri.returnQty)}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setReturnItems(prev =>
                            prev.map(r => r.purchaseItemId === ri.purchaseItemId
                              ? { ...r, returnQty: Math.max(0, r.returnQty - 1) }
                              : r
                            )
                          )}
                          className="btn-ghost p-1"
                          disabled={ri.returnQty <= 0}
                        >
                          <Minus size={14} />
                        </button>
                        <input
                          type="number"
                          min="0"
                          max={ri.maxReturn}
                          value={ri.returnQty}
                          onChange={(e) => setReturnItems(prev =>
                            prev.map(r => r.purchaseItemId === ri.purchaseItemId
                              ? { ...r, returnQty: Math.min(ri.maxReturn, Math.max(0, parseInt(e.target.value) || 0)) }
                              : r
                            )
                          )}
                          className="w-16 text-center input-sm font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setReturnItems(prev =>
                            prev.map(r => r.purchaseItemId === ri.purchaseItemId
                              ? { ...r, returnQty: Math.min(ri.maxReturn, r.returnQty + 1) }
                              : r
                            )
                          )}
                          className="btn-ghost p-1"
                          disabled={ri.returnQty >= ri.maxReturn}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Refund summary */}
              {returnItems.some((ri) => ri.returnQty > 0) && (
                <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                  <div className="flex justify-between text-sm">
                    <span className="text-orange-700 dark:text-orange-300 font-medium">Estimated Refund</span>
                    <span className="font-bold font-mono text-orange-700 dark:text-orange-300 text-base">
                      {formatPrice(
                        returnItems.reduce((sum, ri) => sum + (ri.unitPrice * ri.returnQty), 0)
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-orange-500 mt-1">
                    A debit note will be created against the supplier's ledger
                  </p>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="label">Reason for Return</label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g. Defective items, wrong product, damage in transit..."
                  rows={2}
                  className="input resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setReturnModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={returning || returnItems.every((ri) => ri.returnQty === 0)}
                  className="btn-primary bg-orange-500 hover:bg-orange-600 focus:ring-orange-500"
                >
                  {returning ? (
                    <><Loader2 size={18} className="animate-spin" /> Processing...</>
                  ) : (
                    <><RotateCcw size={18} /> Process Return</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email PO Modal */}
      {emailModal && (
        <div className="modal-overlay" onClick={() => { if (!sendingEmail) setEmailModal(false); }}>
          <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Mail size={20} className="text-purple-500" />
                Email Purchase Order
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
                  PO <span className="font-mono font-medium">{purchase.poNumber}</span> has been emailed to <strong>{emailTo}</strong>
                </p>
              </div>
            ) : (
              <form onSubmit={handleEmailPO} className="p-6 space-y-5">
                {emailError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                    <AlertTriangle size={16} />
                    {emailError}
                  </div>
                )}

                {/* PO summary */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Purchase Order</span>
                    <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">{purchase.poNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Grand Total</span>
                    <span className="font-mono text-sm font-semibold text-accent-600 dark:text-accent-400">
                      {formatPrice(purchase.grandTotal)}
                    </span>
                  </div>
                </div>

                {/* Supplier email */}
                <div>
                  <label className="label">Send To</label>
                  <input
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder={purchase.supplier?.email || 'supplier@example.com'}
                    className="input"
                    required
                    autoFocus
                  />
                  {purchase.supplier?.email && (
                    <p className="text-xs text-slate-400 mt-1">
                      Supplier email: {purchase.supplier.email}
                    </p>
                  )}
                </div>

                {/* Optional note */}
                <div>
                  <label className="label">Note (optional)</label>
                  <textarea
                    value={emailNote}
                    onChange={(e) => setEmailNote(e.target.value)}
                    placeholder="e.g. Please review and confirm the PO..."
                    rows={3}
                    className="input resize-none"
                  />
                </div>

                {/* Attachment info */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                  <Printer size={16} className="text-purple-500 flex-shrink-0" />
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    A PDF copy of this PO will be attached to the email
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
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold">Record Payment</h2>
              <button onClick={() => setPaymentModal(false)} className="btn-ghost p-2">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-6 space-y-5">
              {/* Current balance info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">PO Total</p>
                  <p className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">
                    {formatPrice(purchase.grandTotal)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Balance Due</p>
                  <p className="text-lg font-bold font-mono text-amber-700 dark:text-amber-300">
                    {formatPrice(purchase.balanceAmount)}
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
                    max={purchase.balanceAmount / 100}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder={(purchase.balanceAmount / 100).toFixed(2)}
                    className="input pl-8 font-mono text-lg"
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentAmount((purchase.balanceAmount / 100).toFixed(2))}
                  className="text-xs text-accent-500 hover:text-accent-600 font-medium mt-1"
                >
                  Full amount: {formatPrice(purchase.balanceAmount)}
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

export default PurchaseDetail;
