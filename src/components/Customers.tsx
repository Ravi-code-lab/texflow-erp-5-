import React, { useState, useMemo } from 'react';
import { uuidShort } from "../utils/uuid";
import { Customer, TeamMember } from '../types';
import { 
  Search, Plus, Filter, ChevronLeft, ChevronRight,
  MoreHorizontal, ArrowLeft, Save, Trash2, List,
  Building2, Phone, Mail, MapPin, CreditCard, Landmark,
  FileText, ChevronDown, User, Globe, Copy, CheckCircle2
} from 'lucide-react';

interface CustomersProps {
  customers: Customer[];
  team?: TeamMember[];
  onAdd: (c: Customer) => void;
  onUpdate?: (c: Customer) => void;
  onDelete?: (id: string) => void;
  currency?: string;
}

const INPUT = "w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] text-[13px]";
const SELECT = "w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium appearance-none text-[13px]";
const LABEL = "text-xs text-[#525c66] font-medium";
const FIELD = "space-y-1.5 flex flex-col";

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir',
  'Ladakh','Lakshadweep','Puducherry'
];

const PAYMENT_TERMS = ['Immediate','7 Days','15 Days','30 Days','45 Days','60 Days','90 Days','Cash on Delivery'];

type FormTab = 'details' | 'tax' | 'credit' | 'address' | 'bank' | 'notes';

const Customers: React.FC<CustomersProps> = ({ 
  customers = [], team = [], onAdd, onUpdate, onDelete, currency = '₹' 
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState<FormTab>('details');
  const [copiedGstin, setCopiedGstin] = useState(false);
  const [formData, setFormData] = useState<Partial<Customer>>({ 
    type: 'RETAILER', name: '', contactPerson: '', phone: '', email: '', 
    address: '', gstin: '', status: 'ACTIVE', gstCategory: 'Registered Regular',
    territory: 'India', customerGroup: 'Commercial', currency: 'INR',
    paymentTerms: '30 Days', billingCountry: 'India', shippingCountry: 'India'
  });
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const set = (patch: Partial<Customer>) => setFormData(f => ({ ...f, ...patch }));

  const filteredCustomers = useMemo(() => {
    const q = filter.toLowerCase();
    return customers.filter(c =>
      c.name?.toLowerCase()?.includes(q) ||
      c.contactPerson?.toLowerCase()?.includes(q) ||
      c.gstin?.toLowerCase()?.includes(q) ||
      c.phone?.includes(q) ||
      c.billingCity?.toLowerCase()?.includes(q)
    );
  }, [customers, filter]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;
    const customer = {
      ...formData,
      id: formData.id || `CUST-${uuidShort(12)}`,
      updatedAt: new Date().toISOString(),
    } as Customer;
    if (formData.id && onUpdate) onUpdate(customer);
    else onAdd(customer);
    setViewMode('LIST');
  };

  const openForm = (c?: Customer) => {
    setFormData(c ? { ...c } : {
      type: 'RETAILER', name: '', contactPerson: '', phone: '', email: '',
      address: '', gstin: '', status: 'ACTIVE', gstCategory: 'Registered Regular',
      territory: 'India', customerGroup: 'Commercial', currency: 'INR',
      paymentTerms: '30 Days', billingCountry: 'India', shippingCountry: 'India'
    });
    setActiveTab('details');
    setViewMode('FORM');
  };

  const copyGstin = () => {
    if (formData.gstin) { navigator.clipboard.writeText(formData.gstin); setCopiedGstin(true); setTimeout(() => setCopiedGstin(false), 1500); }
  };

  const tabs: { id: FormTab; label: string; icon: React.ReactNode }[] = [
    { id: 'details',  label: 'Details',         icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: 'tax',      label: 'GST & Tax',        icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'credit',   label: 'Credit & Payment', icon: <CreditCard className="w-3.5 h-3.5" /> },
    { id: 'address',  label: 'Address',          icon: <MapPin className="w-3.5 h-3.5" /> },
    { id: 'bank',     label: 'Bank Details',     icon: <Landmark className="w-3.5 h-3.5" /> },
    { id: 'notes',    label: 'Notes',            icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] -mx-4 -my-5 lg:-m-6 overflow-hidden">

      {/* ══════════════════════════ LIST VIEW ══════════════════════════ */}
      {viewMode === 'LIST' ? (
        <div className="flex flex-col h-full animate-fade-in">
          {/* Header */}
          <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
            <div className="flex justify-between items-center h-8">
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold tracking-tight">Customer</span>
                <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filteredCustomers.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="h-7 px-2.5 flex items-center gap-1.5 bg-[#f4f5f6] hover:bg-[#e2e6e9] border border-transparent rounded text-xs font-semibold text-[#1c2126] transition-colors">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] text-white rounded text-[13px] font-medium shadow-sm transition-all">
                  <Plus className="w-4 h-4" /> Add Customer
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center mt-3 h-8">
              <div className="flex items-center gap-2">
                <button className="h-7 px-2.5 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f6] rounded text-[13px] font-medium shadow-sm">
                  <Filter className="w-3.5 h-3.5" /> Filter
                </button>
                <div className="relative">
                  <input type="text" placeholder="Name, GSTIN, Phone, City…" value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="h-7 w-[280px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] placeholder-[#8d99a6]" />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-[#525c66]">{filteredCustomers.length} records</span>
                <div className="flex border border-[#d1d8dd] rounded overflow-hidden">
                  <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6] border-r border-[#d1d8dd]"><ChevronLeft className="w-4 h-4"/></button>
                  <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6]"><ChevronRight className="w-4 h-4"/></button>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto p-5 pb-10">
            <div className="bg-white border border-[#d1d8dd] rounded shadow-sm flex flex-col min-w-[900px]">
              <div className="flex items-center border-b border-[#d1d8dd] bg-[#f4f5f6] px-4 py-2.5 text-xs text-[#525c66] select-none rounded-t">
                <div className="w-10"><input type="checkbox" className="rounded-sm border-[#d1d8dd] text-[#2490ef] w-3.5 h-3.5"/></div>
                <div className="w-24">Status</div>
                <div className="w-64">Customer Name</div>
                <div className="w-32">Type</div>
                <div className="w-36">GSTIN</div>
                <div className="w-36">Phone</div>
                <div className="w-36">City</div>
                <div className="w-36">Assigned To</div>
                <div className="flex-1">Payment Terms</div>
              </div>
              <div className="divide-y divide-[#d1d8dd]/60">
                {filteredCustomers.length === 0 && (
                  <div className="px-4 py-12 flex flex-col items-center text-[#525c66]">
                    <List className="w-8 h-8 text-[#d1d8dd] mb-3" />
                    <p className="text-[13px]">No customers found. Click <strong>Add Customer</strong> to start.</p>
                  </div>
                )}
                {filteredCustomers.map(c => (
                  <div key={c.id} className="group flex items-center px-4 py-[9px] hover:bg-[#f4f5f6] cursor-pointer text-[13px]" onClick={() => openForm(c)}>
                    <div className="w-10" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={checkedIds.has(c.id)}
                        onChange={e => { const s = new Set(checkedIds); e.target.checked ? s.add(c.id) : s.delete(c.id); setCheckedIds(s); }}
                        className="rounded-sm border-[#d1d8dd] text-[#2490ef] w-3.5 h-3.5"/>
                    </div>
                    <div className="w-24">
                      <span className={`inline-flex items-center px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide ${c.status === 'INACTIVE' ? 'bg-[#fef2f2] text-[#ef4444]' : 'bg-[#ecfdf5] text-[#10b981]'}`}>
                        {c.status === 'INACTIVE' ? 'Inactive' : 'Active'}
                      </span>
                    </div>
                    <div className="w-64 pr-3 truncate font-semibold text-[#1c2126] group-hover:underline">{c.name}</div>
                    <div className="w-32 truncate text-[#525c66]">{c.type || '—'}</div>
                    <div className="w-36 truncate font-mono text-[#525c66] text-xs">{c.gstin || '—'}</div>
                    <div className="w-36 truncate text-[#525c66]">{c.phone || '—'}</div>
                    <div className="w-36 truncate text-[#525c66]">{c.billingCity || '—'}</div>
                    <div className="w-36 truncate text-[#2490ef]">{c.assignedToName ? `👤 ${c.assignedToName}` : <span className="text-[#b8c0c8]">—</span>}</div>
                    <div className="flex-1 truncate text-[#525c66]">{c.paymentTerms || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      ) : (
      /* ══════════════════════════ FORM VIEW ══════════════════════════ */
        <div className="flex flex-col h-full animate-fade-in">
          {/* Form Header */}
          <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-3 sticky top-0 z-20">
            <div className="flex justify-between items-center h-8">
              <div className="flex items-center gap-3">
                <button onClick={() => setViewMode('LIST')} className="h-7 w-7 flex items-center justify-center rounded hover:bg-[#f4f5f6] text-[#525c66]">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-lg font-bold tracking-tight truncate max-w-lg">
                  {formData.id ? formData.name : 'New Customer'}
                </span>
                {formData.id && (
                  <span className={`px-2 py-[2px] rounded-md text-[11px] font-semibold ${formData.status === 'INACTIVE' ? 'bg-[#fef2f2] text-[#ef4444]' : 'bg-[#ecfdf5] text-[#10b981]'}`}>
                    {formData.status === 'INACTIVE' ? 'Inactive' : 'Active'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {formData.id && onDelete && (
                  <button type="button" onClick={() => { onDelete(formData.id!); setViewMode('LIST'); }}
                    className="h-7 px-3 flex items-center gap-1.5 bg-white hover:bg-[#fef2f2] hover:text-[#ef4444] border border-[#d1d8dd] hover:border-[#ef4444] rounded text-[13px] font-medium transition-colors shadow-sm">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                )}
                <button type="button" onClick={() => setViewMode('LIST')} className="h-7 px-3 bg-white hover:bg-[#f4f5f6] border border-[#d1d8dd] rounded text-[13px] font-medium shadow-sm">Cancel</button>
                <button onClick={handleSave} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] text-white rounded text-[13px] font-medium shadow-sm">
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
              </div>
            </div>

            {/* Tab Bar */}
            <div className="flex items-center gap-1 mt-3 -mb-3">
              {tabs.map(t => (
                <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 transition-colors ${activeTab === t.id ? 'border-[#2490ef] text-[#2490ef]' : 'border-transparent text-[#525c66] hover:text-[#1c2126]'}`}>
                  {t.icon}{t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form Body */}
          <div className="flex-1 overflow-auto p-5 pb-16 flex justify-center">
            <form onSubmit={handleSave} className="w-full max-w-[900px] space-y-4">

              {/* ── TAB: DETAILS ── */}
              {activeTab === 'details' && (
                <>
                  {/* Basic Info */}
                  <Card title="Basic Information" icon={<Building2 className="w-4 h-4 text-[#2490ef]"/>}>
                    <Grid>
                      <Col>
                        <Field label="Customer Name *">
                          <input value={formData.name || ''} onChange={e => set({ name: e.target.value.toUpperCase() })} className={INPUT} required />
                        </Field>
                        <Field label="Customer Type">
                          <Sel value={formData.type || 'RETAILER'} onChange={v => set({ type: v as any })}>
                            <option value="RETAILER">Company</option>
                            <option value="WHOLESALER">Individual</option>
                            <option value="BRAND">Brand</option>
                          </Sel>
                        </Field>
                        <Field label="Customer Group">
                          <Sel value={formData.customerGroup || 'Commercial'} onChange={v => set({ customerGroup: v })}>
                            <option>Commercial</option>
                            <option>Government</option>
                            <option>Non Profit</option>
                            <option>Distributor</option>
                            <option>Retailer</option>
                            <option>Wholesaler</option>
                          </Sel>
                        </Field>
                      </Col>
                      <Col>
                        <Field label="Territory">
                          <Sel value={formData.territory || 'India'} onChange={v => set({ territory: v })}>
                            <option>India</option>
                            <option>Rest of the World</option>
                            <option>North India</option>
                            <option>South India</option>
                            <option>East India</option>
                            <option>West India</option>
                          </Sel>
                        </Field>
                        <Field label="Assigned Employee">
                          <Sel value={formData.assignedTo || ''} onChange={v => {
                            const emp = team.find(t => t.id === v);
                            set({ assignedTo: v || undefined, assignedToName: emp?.name });
                          }}>
                            <option value="">— None —</option>
                            {team.filter(t => t.status === 'ACTIVE').map(t => (
                              <option key={t.id} value={t.id}>{t.name}{t.role ? ` (${t.role})` : ''}</option>
                            ))}
                          </Sel>
                          {formData.assignedToName && <p className="text-xs text-[#2490ef] mt-0.5">✓ {formData.assignedToName}</p>}
                        </Field>
                        <Field label="Status">
                          <div className="flex items-center gap-6 pt-1">
                            {['ACTIVE','INACTIVE'].map(s => (
                              <label key={s} className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="status" value={s} checked={formData.status === s} onChange={() => set({ status: s as any })}
                                  className="text-[#2490ef] border-[#d1d8dd] focus:ring-[#2490ef]"/>
                                <span className="text-[13px] text-[#1c2126]">{s}</span>
                              </label>
                            ))}
                          </div>
                        </Field>
                      </Col>
                    </Grid>
                  </Card>

                  {/* Contact Details */}
                  <Card title="Contact Details" icon={<Phone className="w-4 h-4 text-[#2490ef]"/>}>
                    <Grid>
                      <Col>
                        <Field label="Contact Person">
                          <input value={formData.contactPerson || ''} onChange={e => set({ contactPerson: e.target.value })} className={INPUT} />
                        </Field>
                        <Field label="Mobile No">
                          <input value={formData.phone || ''} onChange={e => set({ phone: e.target.value })} className={INPUT} />
                        </Field>
                        <Field label="Alternate Phone">
                          <input value={formData.altPhone || ''} onChange={e => set({ altPhone: e.target.value })} className={INPUT} />
                        </Field>
                      </Col>
                      <Col>
                        <Field label="Email ID">
                          <input type="email" value={formData.email || ''} onChange={e => set({ email: e.target.value })} className={INPUT} />
                        </Field>
                        <Field label="Website">
                          <div className="relative">
                            <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]"/>
                            <input value={formData.website || ''} onChange={e => set({ website: e.target.value })}
                              placeholder="https://" className={INPUT + " pl-8"} />
                          </div>
                        </Field>
                      </Col>
                    </Grid>
                  </Card>
                </>
              )}

              {/* ── TAB: GST & TAX ── */}
              {activeTab === 'tax' && (
                <Card title="GST & Tax Information" icon={<FileText className="w-4 h-4 text-[#2490ef]"/>}>
                  <Grid>
                    <Col>
                      <Field label="GSTIN / Tax ID">
                        <div className="relative">
                          <input value={formData.gstin || ''} onChange={e => set({ gstin: e.target.value.toUpperCase() })}
                            maxLength={15} placeholder="22AAAAA0000A1Z5"
                            className={INPUT + " font-mono uppercase pr-8"} />
                          <button type="button" onClick={copyGstin} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8d99a6] hover:text-[#2490ef]">
                            {copiedGstin ? <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]"/> : <Copy className="w-3.5 h-3.5"/>}
                          </button>
                        </div>
                        {formData.gstin && formData.gstin.length === 15 && (
                          <p className="text-xs text-[#10b981] mt-0.5">✓ Valid GSTIN length</p>
                        )}
                      </Field>
                      <Field label="GST Category">
                        <Sel value={formData.gstCategory || 'Registered Regular'} onChange={v => set({ gstCategory: v as any })}>
                          <option>Registered Regular</option>
                          <option>Registered Composition</option>
                          <option>Unregistered</option>
                          <option>SEZ</option>
                          <option>Overseas</option>
                          <option>Consumer</option>
                        </Sel>
                      </Field>
                      <Field label="PAN Number">
                        <input value={formData.pan || ''} onChange={e => set({ pan: e.target.value.toUpperCase() })}
                          maxLength={10} placeholder="AAAAA0000A" className={INPUT + " font-mono uppercase"} />
                      </Field>
                    </Col>
                    <Col>
                      <div className="bg-[#f8faff] border border-[#dbeafe] rounded p-4 space-y-3">
                        <p className="text-xs font-semibold text-[#2490ef] uppercase tracking-wide">GST Details Auto-Parsed</p>
                        {formData.gstin && formData.gstin.length >= 2 ? (
                          <>
                            <InfoRow label="State Code" value={formData.gstin.substring(0,2)} />
                            <InfoRow label="PAN in GSTIN" value={formData.gstin.substring(2,12)} />
                            <InfoRow label="Entity No." value={formData.gstin.substring(12,13)} />
                            <InfoRow label="Check Digit" value={formData.gstin.substring(14,15) || '—'} />
                          </>
                        ) : (
                          <p className="text-xs text-[#8d99a6]">Enter GSTIN above to parse details</p>
                        )}
                      </div>
                      <Field label="TDS Applicable">
                        <div className="flex items-center gap-3 pt-1">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={formData.tdsApplicable || false} onChange={e => set({ tdsApplicable: e.target.checked })}
                              className="rounded-sm text-[#2490ef] border-[#d1d8dd] focus:ring-[#2490ef] w-3.5 h-3.5"/>
                            <span className="text-[13px]">Apply TDS on this customer</span>
                          </label>
                        </div>
                      </Field>
                      {formData.tdsApplicable && (
                        <Field label="TDS Rate (%)">
                          <input type="number" min="0" max="30" step="0.1" value={formData.tdsRate || ''} onChange={e => set({ tdsRate: parseFloat(e.target.value) })} className={INPUT} />
                        </Field>
                      )}
                    </Col>
                  </Grid>
                </Card>
              )}

              {/* ── TAB: CREDIT & PAYMENT ── */}
              {activeTab === 'credit' && (
                <Card title="Credit & Payment Settings" icon={<CreditCard className="w-4 h-4 text-[#2490ef]"/>}>
                  <Grid>
                    <Col>
                      <Field label={`Credit Limit (${currency})`}>
                        <input type="number" min="0" value={formData.creditLimit || ''} onChange={e => set({ creditLimit: parseFloat(e.target.value) })}
                          placeholder="0 = No limit" className={INPUT} />
                        <p className="text-xs text-[#8d99a6] mt-0.5">Set 0 for unlimited credit</p>
                      </Field>
                      <Field label="Payment Terms">
                        <Sel value={formData.paymentTerms || '30 Days'} onChange={v => set({ paymentTerms: v })}>
                          {PAYMENT_TERMS.map(p => <option key={p}>{p}</option>)}
                        </Sel>
                      </Field>
                      <Field label="Currency">
                        <Sel value={formData.currency || 'INR'} onChange={v => set({ currency: v })}>
                          <option value="INR">INR — Indian Rupee</option>
                          <option value="USD">USD — US Dollar</option>
                          <option value="EUR">EUR — Euro</option>
                          <option value="GBP">GBP — British Pound</option>
                          <option value="AED">AED — UAE Dirham</option>
                        </Sel>
                      </Field>
                    </Col>
                    <Col>
                      <Field label="Price List">
                        <Sel value={formData.priceList || 'Standard'} onChange={v => set({ priceList: v })}>
                          <option>Standard</option>
                          <option>Wholesale</option>
                          <option>Retail</option>
                          <option>Export</option>
                          <option>VIP</option>
                        </Sel>
                      </Field>
                      <div className="bg-[#f8faff] border border-[#dbeafe] rounded p-4 mt-2 space-y-2">
                        <p className="text-xs font-semibold text-[#2490ef] uppercase tracking-wide">Outstanding Balance</p>
                        <p className="text-2xl font-bold text-[#1c2126]">{currency}{(formData.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs text-[#525c66]">Credit Used: {formData.creditLimit ? `${currency}${(formData.balance || 0).toLocaleString('en-IN')} of ${currency}${formData.creditLimit.toLocaleString('en-IN')}` : 'Unlimited'}</p>
                        {formData.creditLimit && formData.balance && formData.balance > formData.creditLimit && (
                          <p className="text-xs text-[#ef4444] font-semibold">⚠ Credit limit exceeded!</p>
                        )}
                      </div>
                    </Col>
                  </Grid>
                </Card>
              )}

              {/* ── TAB: ADDRESS ── */}
              {activeTab === 'address' && (
                <>
                  <Card title="Billing Address" icon={<MapPin className="w-4 h-4 text-[#ef4444]"/>}>
                    <Grid>
                      <Col>
                        <Field label="Address Line">
                          <textarea rows={2} value={formData.billingAddress || ''} onChange={e => set({ billingAddress: e.target.value })}
                            className={INPUT + " resize-none"} />
                        </Field>
                        <Field label="City">
                          <input value={formData.billingCity || ''} onChange={e => set({ billingCity: e.target.value })} className={INPUT} />
                        </Field>
                        <Field label="PIN Code">
                          <input value={formData.billingPincode || ''} onChange={e => set({ billingPincode: e.target.value })} maxLength={6} className={INPUT} />
                        </Field>
                      </Col>
                      <Col>
                        <Field label="State">
                          <Sel value={formData.billingState || ''} onChange={v => set({ billingState: v })}>
                            <option value="">— Select State —</option>
                            {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
                          </Sel>
                        </Field>
                        <Field label="Country">
                          <Sel value={formData.billingCountry || 'India'} onChange={v => set({ billingCountry: v })}>
                            <option>India</option>
                            <option>United States</option>
                            <option>United Arab Emirates</option>
                            <option>United Kingdom</option>
                            <option>Other</option>
                          </Sel>
                        </Field>
                      </Col>
                    </Grid>
                  </Card>

                  <Card title="Shipping Address" icon={<MapPin className="w-4 h-4 text-[#2490ef]"/>}>
                    <div className="mb-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.sameAsBilling || false}
                          onChange={e => {
                            if (e.target.checked) {
                              set({
                                sameAsBilling: true,
                                shippingAddress: formData.billingAddress,
                                shippingCity: formData.billingCity,
                                shippingState: formData.billingState,
                                shippingPincode: formData.billingPincode,
                                shippingCountry: formData.billingCountry,
                              });
                            } else {
                              set({ sameAsBilling: false });
                            }
                          }}
                          className="rounded-sm text-[#2490ef] border-[#d1d8dd] focus:ring-[#2490ef] w-3.5 h-3.5"/>
                        <span className="text-[13px] text-[#1c2126] font-medium">Same as Billing Address</span>
                      </label>
                    </div>
                    {!formData.sameAsBilling && (
                      <Grid>
                        <Col>
                          <Field label="Address Line">
                            <textarea rows={2} value={formData.shippingAddress || ''} onChange={e => set({ shippingAddress: e.target.value })}
                              className={INPUT + " resize-none"} />
                          </Field>
                          <Field label="City">
                            <input value={formData.shippingCity || ''} onChange={e => set({ shippingCity: e.target.value })} className={INPUT} />
                          </Field>
                          <Field label="PIN Code">
                            <input value={formData.shippingPincode || ''} onChange={e => set({ shippingPincode: e.target.value })} maxLength={6} className={INPUT} />
                          </Field>
                        </Col>
                        <Col>
                          <Field label="State">
                            <Sel value={formData.shippingState || ''} onChange={v => set({ shippingState: v })}>
                              <option value="">— Select State —</option>
                              {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
                            </Sel>
                          </Field>
                          <Field label="Country">
                            <Sel value={formData.shippingCountry || 'India'} onChange={v => set({ shippingCountry: v })}>
                              <option>India</option>
                              <option>United States</option>
                              <option>United Arab Emirates</option>
                              <option>United Kingdom</option>
                              <option>Other</option>
                            </Sel>
                          </Field>
                        </Col>
                      </Grid>
                    )}
                  </Card>
                </>
              )}

              {/* ── TAB: BANK DETAILS ── */}
              {activeTab === 'bank' && (
                <Card title="Bank Details" icon={<Landmark className="w-4 h-4 text-[#2490ef]"/>}>
                  <Grid>
                    <Col>
                      <Field label="Bank Name">
                        <input value={formData.bankName || ''} onChange={e => set({ bankName: e.target.value })} className={INPUT} placeholder="e.g. State Bank of India" />
                      </Field>
                      <Field label="Account Number">
                        <input value={formData.bankAccount || ''} onChange={e => set({ bankAccount: e.target.value })} className={INPUT + " font-mono"} />
                      </Field>
                    </Col>
                    <Col>
                      <Field label="IFSC Code">
                        <input value={formData.bankIfsc || ''} onChange={e => set({ bankIfsc: e.target.value.toUpperCase() })} maxLength={11}
                          className={INPUT + " font-mono uppercase"} placeholder="SBIN0000123" />
                      </Field>
                      <Field label="Branch">
                        <input value={formData.bankBranch || ''} onChange={e => set({ bankBranch: e.target.value })} className={INPUT} />
                      </Field>
                    </Col>
                  </Grid>
                </Card>
              )}

              {/* ── TAB: NOTES ── */}
              {activeTab === 'notes' && (
                <Card title="Internal Notes" icon={<FileText className="w-4 h-4 text-[#2490ef]"/>}>
                  <Field label="Notes / Remarks">
                    <textarea rows={8} value={formData.notes || ''} onChange={e => set({ notes: e.target.value })}
                      placeholder="Add any internal notes about this customer…"
                      className={INPUT + " resize-none leading-relaxed"} />
                  </Field>
                  {formData.id && (
                    <div className="mt-4 pt-4 border-t border-[#d1d8dd] grid grid-cols-2 gap-4 text-[13px] text-[#525c66]">
                      <InfoRow label="Customer ID" value={formData.id} />
                      <InfoRow label="Created" value={formData.id ? formData.id.split('-').length > 1 ? new Date(parseInt(formData.id.split('-')[1] || '0') + 1700000000000).toLocaleDateString('en-IN') : '—' : '—'} />
                    </div>
                  )}
                </Card>
              )}

              <button type="submit" className="hidden">Submit</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Small reusable sub-components ── */
const Card = ({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) => (
  <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
    <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2 flex items-center gap-2">
      {icon}{title}
    </h4>
    {children}
  </div>
);
const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-2 gap-x-16 gap-y-1">{children}</div>
);
const Col = ({ children }: { children: React.ReactNode }) => (
  <div className="space-y-5">{children}</div>
);
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5 flex flex-col">
    <label className="text-xs text-[#525c66] font-medium">{label}</label>
    {children}
  </div>
);
const Sel = ({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) => (
  <div className="relative">
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium appearance-none text-[13px]">
      {children}
    </select>
    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none"/>
  </div>
);
const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-center">
    <span className="text-[#8d99a6] text-xs">{label}</span>
    <span className="font-mono text-[#1c2126] font-medium text-xs">{value}</span>
  </div>
);

export default Customers;
