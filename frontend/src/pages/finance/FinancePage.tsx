import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Receipt,
  Search,
  Plus,
  CreditCard,
  Printer,
  DollarSign,
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { billingApi, guestsApi } from '../../api/endpoints';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Invoice, GuestFolio, Guest } from '../../types';

export const FinancePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);

  // Record payment form state
  const [paymentForm, setPaymentForm] = useState({
    guestId: '',
    invoiceId: '',
    amount: 10000,
    paymentMethod: 'bkash',
    transactionRef: 'BKASH-TRX-',
    notes: 'Payment via bKash / Counter',
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => billingApi.getInvoices(),
  });

  const { data: guests = [] } = useQuery({
    queryKey: ['guests_for_billing'],
    queryFn: () => guestsApi.getGuests(),
  });

  const handleOpenInvoicePreview = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setIsInvoiceModalOpen(true);
  };

  const handleOpenRecordPayment = (inv?: Invoice) => {
    if (inv) {
      setPaymentForm({
        guestId: inv.guest_id,
        invoiceId: inv.id,
        amount: inv.grand_total - inv.paid_amount,
        paymentMethod: 'bkash',
        transactionRef: `TRX-${Date.now().toString().slice(-6)}`,
        notes: `Settlement for Invoice ${inv.invoice_number}`,
      });
    }
    setIsRecordPaymentOpen(true);
  };

  const handleExecutePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await billingApi.recordPayment({
        guest_id: paymentForm.guestId || guests[0]?.id,
        invoice_id: paymentForm.invoiceId || undefined,
        amount: Number(paymentForm.amount),
        payment_method: paymentForm.paymentMethod,
        transaction_ref: paymentForm.transactionRef,
        notes: paymentForm.notes,
      });
      setIsRecordPaymentOpen(false);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      alert('Payment recorded successfully.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record payment');
    }
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.guest?.first_name.toLowerCase().includes(search.toLowerCase()) ||
      inv.guest?.last_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Audit & Financial Settlement"
        title="Billing, Invoices & Folio Reconciliation"
        description="Consolidated accounts receivable, multi-method payment receipting (bKash, Nagad, Cards, Cash), and government tax compliance reporting."
        actions={
          <button
            onClick={() => handleOpenRecordPayment()}
            className="flex items-center gap-1.5 rounded-lg border border-hotel-accent bg-gradient-to-r from-hotel-accent to-hotel-gold px-4 py-2 text-xs font-bold text-[#14110f] shadow hover:opacity-95 transition-opacity"
          >
            <CreditCard className="h-4 w-4" />
            <span>Record Payment</span>
          </button>
        }
      />

      {/* Search & Actions */}
      <div className="flex items-center justify-between border-b border-hotel-line pb-4">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-hotel-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice # or guest name..."
            className="w-full rounded-lg border border-hotel-line bg-white/[0.03] py-1.5 pl-8 pr-3 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
          />
        </div>
      </div>

      {/* Invoices Master Table */}
      <div className="rounded-2xl border border-hotel-line bg-hotel-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-hotel-line bg-white/[0.02] text-[11px] text-hotel-muted uppercase tracking-wider">
                <th className="py-3.5 px-4 font-medium">Invoice #</th>
                <th className="py-3.5 px-4 font-medium">Billed To</th>
                <th className="py-3.5 px-4 font-medium">Subtotal</th>
                <th className="py-3.5 px-4 font-medium">Tax & Svc</th>
                <th className="py-3.5 px-4 font-medium">Grand Total</th>
                <th className="py-3.5 px-4 font-medium">Paid (BDT)</th>
                <th className="py-3.5 px-4 font-medium">Status</th>
                <th className="py-3.5 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hotel-line">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-[#f7f8f4] transition-colors">
                  <td className="py-3.5 px-4 font-mono font-medium text-hotel-accent">
                    {inv.invoice_number}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-hotel-text">
                      {inv.guest?.first_name} {inv.guest?.last_name}
                    </div>
                    <div className="text-[10px] text-hotel-muted">{inv.guest?.company_name || 'Individual'}</div>
                  </td>
                  <td className="py-3.5 px-4 text-hotel-muted font-serif">
                    {inv.subtotal.toLocaleString()} BDT
                  </td>
                  <td className="py-3.5 px-4 text-hotel-muted font-serif">
                    {(inv.tax_amount + inv.service_charge).toLocaleString()} BDT
                  </td>
                  <td className="py-3.5 px-4 font-serif font-bold text-hotel-gold text-sm">
                    {inv.grand_total.toLocaleString()} BDT
                  </td>
                  <td className="py-3.5 px-4 font-serif text-emerald-400">
                    {inv.paid_amount.toLocaleString()} BDT
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={inv.status} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenInvoicePreview(inv)}
                        title="Print Invoice"
                        className="rounded-lg border border-hotel-line bg-white/[0.04] p-1.5 text-hotel-gold hover:bg-white/[0.08] transition-colors"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                      {inv.status !== 'paid' && (
                        <button
                          onClick={() => handleOpenRecordPayment(inv)}
                          className="rounded-lg border border-emerald-500/40 bg-emerald-950/60 px-2 py-1 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-900/60 transition-colors"
                        >
                          Collect
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* OFFICIAL PRINTABLE TAX INVOICE MODAL */}
      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title="Official Guest Tax Invoice"
        subtitle={selectedInvoice?.invoice_number}
        maxWidth="lg"
      >
        {selectedInvoice && (
          <div className="space-y-6 text-xs text-hotel-text">
            {/* Invoice Header */}
            <div className="flex items-start justify-between border-b border-hotel-line pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-hotel-gold">
                  HotelOS Grand Residence
                </h2>
                <p className="text-[11px] text-hotel-muted mt-0.5">
                  Road 79, Gulshan-2, Dhaka 1212 • Tel: +880 2 988 5000
                </p>
                <p className="text-[10px] text-hotel-muted">
                  BIN: 00291048-0101 • Mushak-6.3 Tax Compliant
                </p>
              </div>
              <div className="text-right">
                <span className="kicker">Tax Invoice</span>
                <div className="font-mono text-base font-bold text-hotel-accent">
                  {selectedInvoice.invoice_number}
                </div>
                <div className="text-[10px] text-hotel-muted">
                  Date: {selectedInvoice.created_at.split('T')[0]}
                </div>
              </div>
            </div>

            {/* Client Particulars */}
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-hotel-line bg-white/[0.02] p-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-hotel-muted">Billed To</span>
                <div className="font-serif text-base font-bold text-hotel-text mt-1">
                  {selectedInvoice.guest?.first_name} {selectedInvoice.guest?.last_name}
                </div>
                {selectedInvoice.guest?.company_name && (
                  <div className="text-hotel-gold font-medium">{selectedInvoice.guest?.company_name}</div>
                )}
                <div className="text-[11px] text-hotel-muted mt-0.5">
                  {selectedInvoice.guest?.email} • {selectedInvoice.guest?.phone}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-hotel-muted">Stay Reference</span>
                <div className="mt-1 text-hotel-muted">
                  Reservation: <span className="font-mono text-hotel-text">{selectedInvoice.reservation_id.slice(0, 8)}</span>
                </div>
                <div className="text-hotel-muted">
                  Payment Status: <span className="font-semibold text-emerald-400 capitalize">{selectedInvoice.status}</span>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="rounded-xl border border-hotel-line bg-white/[0.02] p-4 space-y-2">
              <div className="flex justify-between border-b border-hotel-line pb-2 text-[10px] uppercase font-bold text-hotel-muted">
                <span>Description</span>
                <span>Amount</span>
              </div>
              <div className="flex justify-between py-1 text-hotel-text">
                <span>Accommodation & Master Folio Services</span>
                <span className="font-serif">{selectedInvoice.subtotal.toLocaleString()} BDT</span>
              </div>
              <div className="flex justify-between py-1 text-hotel-muted">
                <span>Government VAT (15.0%)</span>
                <span className="font-serif">{selectedInvoice.tax_amount.toLocaleString()} BDT</span>
              </div>
              <div className="flex justify-between py-1 text-hotel-muted">
                <span>Hospitality Service Charge (10.0%)</span>
                <span className="font-serif">{selectedInvoice.service_charge.toLocaleString()} BDT</span>
              </div>
              <div className="flex justify-between border-t border-hotel-line pt-2 font-serif text-base font-bold text-hotel-gold">
                <span>Grand Total (Net Payable)</span>
                <span>{selectedInvoice.grand_total.toLocaleString()} BDT</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-semibold pt-1">
                <span>Amount Paid</span>
                <span>{selectedInvoice.paid_amount.toLocaleString()} BDT</span>
              </div>
              <div className="flex justify-between text-hotel-accent font-semibold">
                <span>Balance Due</span>
                <span>{(selectedInvoice.grand_total - selectedInvoice.paid_amount).toLocaleString()} BDT</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-hotel-line">
              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(false)}
                className="rounded-lg border border-hotel-line px-4 py-2 font-medium text-hotel-muted hover:bg-white/5 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-lg border border-hotel-accent bg-gradient-to-r from-hotel-accent to-hotel-gold px-4 py-2 font-bold text-[#14110f] hover:opacity-95 transition-opacity"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Tax Invoice</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* RECORD PAYMENT MODAL */}
      <Modal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        title="Record Guest Payment"
        subtitle="Finance Desk"
        maxWidth="md"
      >
        <form onSubmit={handleExecutePayment} className="space-y-4 text-xs">
          <div>
            <label className="text-hotel-muted font-medium">Select Guest *</label>
            <select
              value={paymentForm.guestId}
              onChange={(e) => setPaymentForm({ ...paymentForm, guestId: e.target.value })}
              className="mt-1 w-full rounded-lg border border-hotel-line bg-hotel-panel p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
            >
              {guests.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.first_name} {g.last_name} ({g.company_name || g.email || 'Guest'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-hotel-muted font-medium">Amount (BDT) *</label>
              <input
                required
                type="number"
                min="100"
                step="500"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="text-hotel-muted font-medium">Payment Method *</label>
              <select
                value={paymentForm.paymentMethod}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-hotel-panel p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              >
                <option value="bkash">bKash Merchant Pay</option>
                <option value="nagad">Nagad Direct</option>
                <option value="credit_card">Credit Card (Visa/Mastercard)</option>
                <option value="debit_card">Debit Card</option>
                <option value="cash">Counter Cash</option>
                <option value="bank_transfer">Direct Bank Wire</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-hotel-muted font-medium">Transaction Reference / Voucher #</label>
            <input
              type="text"
              value={paymentForm.transactionRef}
              onChange={(e) => setPaymentForm({ ...paymentForm, transactionRef: e.target.value })}
              className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="text-hotel-muted font-medium">Audit Notes</label>
            <input
              type="text"
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-hotel-line">
            <button
              type="button"
              onClick={() => setIsRecordPaymentOpen(false)}
              className="rounded-lg border border-hotel-line px-4 py-2 font-medium text-hotel-muted hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg border border-hotel-accent bg-gradient-to-r from-hotel-accent to-hotel-gold px-5 py-2 font-bold text-[#14110f] hover:opacity-95 transition-opacity"
            >
              Record Payment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

