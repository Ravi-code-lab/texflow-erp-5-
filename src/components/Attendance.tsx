
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TeamMember, AttendanceRecord, AttendanceStatus, LoanRecord, LeaveRequest, ShiftType, CompanyInfo, PayrollAdjustment } from '../types';
import { 
  Calendar as CalendarIcon, Clock, Users, Save, ChevronLeft, ChevronRight, 
  IndianRupee, Download, Edit2, Check, X, UserCheck, MessageSquare, 
  AlertCircle, LogIn, LogOut, AlertTriangle, Wallet, 
  RefreshCcw, Sun, Moon, Sunrise, Coffee, Upload, FileText, 
  CheckCircle, Printer, SlidersHorizontal, Search, 
  Grid3X3, Fingerprint, Activity, Zap, ShieldCheck, Timer, 
  ArrowRight, DownloadCloud, Receipt, History, BadgePercent, Landmark, 
  FileSpreadsheet, ShieldAlert, BadgeCheck, FileDigit, BarChart3, Database,
  LayoutGrid, MousePointer2, Layers, ClipboardList, ShieldQuestion, ZapOff, Sparkles,
  ArrowUpRight, ArrowDownLeft, Filter, List, Eye, Banknote, RotateCcw,
  Gift, Star, Trash2, CheckCircle2
} from 'lucide-react';
import BaseModal from './BaseModal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast, useConfirm } from "../utils/toast";

interface AttendanceProps {
  team: TeamMember[];
  records: AttendanceRecord[];
  loans?: LoanRecord[];
  leaves?: LeaveRequest[];
  payrollAdjustments?: Record<string, PayrollAdjustment>;
  onUpdatePayrollAdjustment?: (key: string, adjustment: PayrollAdjustment) => void;
  onSaveRecord: (record: AttendanceRecord) => void;
  onSaveManyRecords?: (records: AttendanceRecord[]) => void;
  onUpdateTeamMember: (member: TeamMember) => void;
  onAddLoan?: (loan: LoanRecord) => void;
  onDeleteLoan?: (id: string) => void;
  onAddLeave?: (leave: LeaveRequest) => void;
  onUpdateLeave?: (leave: LeaveRequest) => void;
  currency?: string;
  companyInfo?: CompanyInfo;
  initialTab?: 'DAILY' | 'MONTHLY' | 'LEAVES' | 'PAYROLL' | 'LOANS';
}

const SHIFT_CONFIG = {
  GENERAL: { start: '09:00', end: '18:00', label: 'Gen', color: '#64748b' },
  MORNING: { start: '06:00', end: '14:00', label: 'Morn', color: '#f97316' },
  EVENING: { start: '14:00', end: '22:00', label: 'Eve', color: '#eab308' },
  NIGHT: { start: '22:00', end: '06:00', label: 'Night', color: '#6366f1' }
};

const Attendance: React.FC<AttendanceProps> = ({ 
  team, records, loans = [], leaves = [], payrollAdjustments = {},
  onSaveRecord, onSaveManyRecords, onUpdateTeamMember, onAddLoan, onDeleteLoan, onAddLeave, onUpdateLeave, onUpdatePayrollAdjustment,
  currency = '₹', companyInfo = { name: 'RAVI-TEXTILE', address: 'Surat, GJ', gstin: '', email: '', website: '', logoUrl: '' },
  initialTab = 'DAILY'
}) => {
  const { confirm, ConfirmModal } = useConfirm();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'DAILY' | 'MONTHLY' | 'LEAVES' | 'PAYROLL' | 'LOANS'>(initialTab);
  const [activeMonth, setActiveMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  
  const [localMarkings, setLocalMarkings] = useState<Record<string, Partial<AttendanceRecord>>>({});
  const [markingHistory, setMarkingHistory] = useState<Record<string, Partial<AttendanceRecord>>[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);

  // Unified, month-aware balance calculation
  const getAdvanceBalanceAsOf = (empId: string, dateLimit: string, excludeMonth?: string) => {
    return (loans || [])
      .filter(l => l.employeeId === empId && !l.deleted && l.date <= dateLimit)
      .filter(l => !excludeMonth || !l.id.toString().startsWith(`PAYROLL-${excludeMonth}_`))
      .reduce((acc, l) => l.type === 'GIVEN' ? acc + l.amount : acc - l.amount, 0);
  };

  const currentMonthEndDate = useMemo(() => {
    if (!activeMonth) return new Date().toISOString().split('T')[0];
    const [y, m] = activeMonth.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return `${activeMonth}-${String(lastDay).padStart(2, '0')}`;
  }, [activeMonth]);

  const getGlobalAdvanceBalance = (empId: string) => {
    return (loans || [])
      .filter(l => l.employeeId === empId && !l.deleted)
      .reduce((acc, l) => l.type === 'GIVEN' ? acc + l.amount : acc - l.amount, 0);
  };

  const getAdvanceBalance = (empId: string) => {
    // Show net balance including everything up to the selected month's end
    return getAdvanceBalanceAsOf(empId, currentMonthEndDate);
  };

  const getOpeningAdvanceBalance = (empId: string, month: string) => {
    const startOfMonth = `${month}-01`;
    const previousDay = new Date(new Date(startOfMonth).getTime() - 86400000).toISOString().split('T')[0];
    return getAdvanceBalanceAsOf(empId, previousDay);
  };

  const getBalanceBeforeSettlement = (empId: string, month: string) => {
    // Current state as of selected month's end, excluding that month's payroll results
    return getAdvanceBalanceAsOf(empId, currentMonthEndDate, month);
  };

  const [pendingUpdate, setPendingUpdate] = useState<{
    empId: string;
    empName: string;
    date: string;
    status: AttendanceStatus;
    recordId?: string;
    shift?: string;
    payMultiplier?: number;
  } | null>(null);

  const focusedFieldRef = useRef<string | null>(null);

  const recordsMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    const sortedRecords = [...records].sort((a,b) => 
        new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime()
    );
    sortedRecords.forEach(r => {
      if (!r.deleted) map.set(`${r.employeeId}_${r.date}`, r);
    });
    return map;
  }, [records]);

  const departments = useMemo(() => {
    const depts = new Set(team.map(t => t.department || 'GENERAL'));
    return ['ALL', ...Array.from(depts)];
  }, [team]);

  const daysArray = useMemo(() => {
    if (!activeMonth) return [];
    const [year, month] = activeMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({length: daysInMonth}, (_, i) => i + 1);
  }, [activeMonth]);

  useEffect(() => {
    setLocalMarkings(prev => {
      const next = { ...prev };
      team.forEach(member => {
        const key = `${member.id}_${selectedDate}`;
        const remoteRec = recordsMap.get(key);
        if (focusedFieldRef.current?.startsWith(member.id)) return;
        if (remoteRec) {
          next[member.id] = { ...remoteRec };
        } else {
          next[member.id] = { 
            id: `ATT-${selectedDate}-${member.id}`,
            employeeId: member.id, 
            date: selectedDate, 
            status: undefined, 
            shift: member.defaultShift || 'GENERAL' 
          };
        }
      });
      return next;
    });
  }, [selectedDate, team, recordsMap]);

  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isLoanHistoryModalOpen, setIsLoanHistoryModalOpen] = useState(false);
  const [viewingLoanEmpId, setViewingLoanEmpId] = useState<string | null>(null);
  const [loanFormAmount, setLoanFormAmount] = useState<string>('0');
  const [loanFormData, setLoanFormData] = useState<Partial<LoanRecord>>({ 
    type: 'GIVEN', notes: '', amount: 0, date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (isLoanModalOpen) {
      setLoanFormAmount(loanFormData.amount?.toString() || '0');
    }
  }, [isLoanModalOpen, loanFormData.id, loanFormData.amount]);

  const [adjustmentMember, setAdjustmentMember] = useState<TeamMember | null>(null);
  const [adjRepaymentStr, setAdjRepaymentStr] = useState('0');
  const [adjBonusStr, setAdjBonusStr] = useState('0');
  const [adjDeductionStr, setAdjDeductionStr] = useState('0');
  const [adjustmentForm, setAdjustmentForm] = useState<PayrollAdjustment>({ bonus: 0, deduction: 0, loanRepayment: 0 });

  useEffect(() => {
    if (isAdjustmentModalOpen) {
      setAdjRepaymentStr(adjustmentForm.loanRepayment?.toString() || '0');
      setAdjBonusStr(adjustmentForm.bonus?.toString() || '0');
      setAdjDeductionStr(adjustmentForm.deduction?.toString() || '0');
    }
  }, [isAdjustmentModalOpen]);
  const [noteModalData, setNoteModalData] = useState<{ empId: string, date: string, note: string } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const mergedLoanLedger = useMemo(() => {
    if (!viewingLoanEmpId) return [];
    const loanEntries = (loans || []).filter(l => l.employeeId === viewingLoanEmpId && !l.deleted).map(l => ({
        id: l.id,
        date: l.date,
        type: l.type,
        amount: l.amount,
        notes: l.notes,
        isSystem: l.id.toString().startsWith('PAYROLL-')
    }));
    
    const adjustmentEntries = Object.entries(payrollAdjustments || {})
        .filter(([key, adj]: [string, any]) => key.endsWith(`_${viewingLoanEmpId}`) && ((adj as any).loanRepayment || 0) > 0 && (adj as any).status !== 'DISBURSED')
        .map(([key, adj]: [string, any]) => ({
            id: `ADJ-${key}`,
            date: `${key.split('_')[0]}-28`, // Assume end of month
            type: 'REPAID' as const,
            amount: adj.loanRepayment || 0,
            notes: `Draft Payroll Deduction (${key.split('_')[0]})`,
            isSystem: true
        }));
    
    return [...loanEntries, ...adjustmentEntries].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [loans, payrollAdjustments, viewingLoanEmpId]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredTeam = useMemo(() => {
    return team.filter(member => {
      const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = selectedDept === 'ALL' || (member.department || 'GENERAL') === selectedDept;
      return matchesSearch && matchesDept;
    });
  }, [team, searchQuery, selectedDept]);

  const updateLocalMarking = (empId: string, updates: Partial<AttendanceRecord>) => {
    setMarkingHistory(prev => [...prev, { ...localMarkings }]);
    setLocalMarkings(prev => ({ ...prev, [empId]: { ...prev[empId], ...updates } }));
  };

  const handleUndoLastAction = () => {
    if (markingHistory.length === 0) return;
    const historyStack = [...markingHistory];
    const previousState = historyStack.pop();
    if (previousState) {
        setLocalMarkings(previousState);
        setMarkingHistory(historyStack);
    }
  };

  const handleImmediateStatusUpdate = (empId: string, status: AttendanceStatus) => {
    const member = team.find(t => t.id === empId);
    const key = `${empId}_${selectedDate}`;
    const remoteRec = recordsMap.get(key);
    const currentLocal = localMarkings[empId] || {};
    
    const updatedRecord: AttendanceRecord = {
      id: currentLocal.id || remoteRec?.id || `ATT-${selectedDate}-${empId}`,
      date: selectedDate,
      employeeId: empId,
      status: status,
      shift: currentLocal.shift || member?.defaultShift || 'GENERAL',
      checkIn: currentLocal.checkIn,
      checkOut: currentLocal.checkOut,
      overtimeHours: currentLocal.overtimeHours || 0,
      note: currentLocal.note,
      payMultiplier: 1,
      updatedAt: new Date().toISOString()
    } as AttendanceRecord;
    
    setLocalMarkings(prev => ({ ...prev, [empId]: updatedRecord }));
    onSaveRecord(updatedRecord);
  };

  const confirmUpdate = () => {
    if (!pendingUpdate) return;
    const key = `${pendingUpdate.empId}_${pendingUpdate.date}`;
    const remoteRec = recordsMap.get(key);
    
    // Determine which checkIn/Out to use. 
    // If it's the current selectedDate in DAILY view, we might have localMarkings.
    // If it's a click in MONTHLY view, we should definitely use remoteRec.
    const isTodayDaily = pendingUpdate.date === selectedDate;
    
    const updatedRecord: AttendanceRecord = {
      id: pendingUpdate.recordId || remoteRec?.id || `ATT-${pendingUpdate.date}-${pendingUpdate.empId}`,
      date: pendingUpdate.date,
      employeeId: pendingUpdate.empId,
      status: pendingUpdate.status,
      shift: pendingUpdate.shift || remoteRec?.shift || 'GENERAL',
      checkIn: isTodayDaily && localMarkings[pendingUpdate.empId] ? localMarkings[pendingUpdate.empId].checkIn : remoteRec?.checkIn,
      checkOut: isTodayDaily && localMarkings[pendingUpdate.empId] ? localMarkings[pendingUpdate.empId].checkOut : remoteRec?.checkOut,
      overtimeHours: isTodayDaily && localMarkings[pendingUpdate.empId] ? localMarkings[pendingUpdate.empId].overtimeHours : (remoteRec?.overtimeHours || 0),
      note: isTodayDaily && localMarkings[pendingUpdate.empId] ? localMarkings[pendingUpdate.empId].note : remoteRec?.note,
      payMultiplier: pendingUpdate.payMultiplier || remoteRec?.payMultiplier || 1,
      updatedAt: new Date().toISOString()
    } as AttendanceRecord;

    if (isTodayDaily) {
      setLocalMarkings(prev => ({ ...prev, [pendingUpdate.empId]: updatedRecord }));
    }
    
    onSaveRecord(updatedRecord);
    setPendingUpdate(null);
  };

  const handleSaveLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(loanFormAmount);
    if (!loanFormData.employeeId || isNaN(numericAmount) || numericAmount <= 0) return;
    onAddLoan?.({
        id: loanFormData.id || `LOAN-${Date.now()}`,
        date: loanFormData.date || new Date().toISOString().split('T')[0],
        employeeId: loanFormData.employeeId,
        type: loanFormData.type || 'GIVEN',
        amount: numericAmount,
        notes: loanFormData.notes || '',
        updatedAt: new Date().toISOString()
    } as LoanRecord);
    setIsLoanModalOpen(false);
    setLoanFormData({ type: 'GIVEN', notes: '', amount: 0, date: new Date().toISOString().split('T')[0] });
    setLoanFormAmount('0');
  };

  const handleBulkHoliday = async () => {
    const ok = await confirm({ title: `Mark ${filteredTeam.length} staff as PAID HOLIDAY?`, message: `Date: ${selectedDate}`, confirmLabel: 'Mark Holiday', confirmClass: 'px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors' });
    if (ok) {
        setIsCommitting(true);
        const bulkRecords: AttendanceRecord[] = filteredTeam.map(member => {
            const key = `${member.id}_${selectedDate}`;
            const remoteRec = recordsMap.get(key);
            return {
                id: remoteRec?.id || `ATT-${Date.now()}-${member.id}`,
                date: selectedDate,
                employeeId: member.id,
                status: AttendanceStatus.HOLIDAY,
                shift: member.defaultShift || 'GENERAL',
                overtimeHours: 0,
                payMultiplier: 1,
                updatedAt: new Date().toISOString()
            } as AttendanceRecord;
        });
        if (onSaveManyRecords) {
            onSaveManyRecords(bulkRecords);
        } else {
            bulkRecords.forEach(r => onSaveRecord(r));
        }
        setLocalMarkings({});
        setTimeout(() => setIsCommitting(false), 500);
    }
  };

  const handleCommitDaily = async () => {
    setIsCommitting(true);
    const activeMarkings = (Object.values(localMarkings) as any[]).filter(m => m.status);
    const bulkRecords: AttendanceRecord[] = activeMarkings.map(marking => ({
        id: marking.id || `ATT-${Date.now()}-${marking.employeeId}`,
        date: marking.date!,
        employeeId: marking.employeeId!,
        status: marking.status!,
        shift: marking.shift || 'GENERAL',
        overtimeHours: marking.overtimeHours || 0,
        checkIn: marking.checkIn,
        checkOut: marking.checkOut,
        note: marking.note,
        payMultiplier: 1,
        updatedAt: new Date().toISOString()
    } as AttendanceRecord));

    if (onSaveManyRecords) {
        onSaveManyRecords(bulkRecords);
    } else {
        bulkRecords.forEach(r => onSaveRecord(r));
    }
    setLocalMarkings({});
    setMarkingHistory([]);
    setTimeout(() => setIsCommitting(false), 500);
  };

  const calculatePayroll = (emp: TeamMember, overrideAdjustment?: PayrollAdjustment) => {
    const [year, month] = activeMonth.split('-');
    const monthlyRecords = records.filter(r => r.employeeId === emp.id && r.date.startsWith(`${year}-${month}`));
    const presentDays = monthlyRecords.filter(r => r.status === AttendanceStatus.PRESENT).length;
    const halfDays = monthlyRecords.filter(r => r.status === AttendanceStatus.HALF_DAY).length;
    const holidayDays = monthlyRecords.filter(r => r.status === AttendanceStatus.HOLIDAY).length;
    const totalOT = monthlyRecords.reduce((acc, r) => acc + (r.overtimeHours || 0), 0);
    let bonusDays = 0;
    const effectivePresence = presentDays + (halfDays * 0.5) + holidayDays;
    if (effectivePresence >= 22) bonusDays = 2; else if (effectivePresence >= 15) bonusDays = 1;
    const totalWage = monthlyRecords.reduce((acc, r) => {
        if (r.status === AttendanceStatus.ABSENT || r.status === AttendanceStatus.LEAVE) return acc;
        const dayFactor = r.status === AttendanceStatus.HALF_DAY ? 0.5 : 1;
        const baseDayPay = (emp.dailyWage || 0) * dayFactor;
        const otPay = (r.overtimeHours || 0) * ((emp.dailyWage || 0) / 8) * 1.5;
        return acc + baseDayPay + otPay;
    }, 0) + (bonusDays * (emp.dailyWage || 0));
    
    const adjustment = overrideAdjustment || payrollAdjustments[`${activeMonth}_${emp.id}`] || { bonus: 0, deduction: 0, loanRepayment: 0 };
    const grossEarnings = Math.round(totalWage) + adjustment.bonus;
    
    // CRITICAL FIX: Total explicit deductions cannot exceed gross earnings.
    // Fixed penalty/deduction is capped by gross earnings first.
    const actualExplicitDeduction = Math.min(adjustment.deduction || 0, grossEarnings);
    
    // 1. Balance before this month's payroll = (Everything until month end) - (This month's payroll entries)
    // This perfectly matches the "Advances" tab view before disbursement
    const balanceBeforeSettlement = getAdvanceBalanceAsOf(emp.id, currentMonthEndDate, activeMonth);
    
    const requestedRepayment = adjustment.loanRepayment || 0;
    
    // Remaining gross earnings available for advance repayment (loan recovery)
    const availableForRepayment = Math.max(0, grossEarnings - actualExplicitDeduction);
    const repayment = Math.min(requestedRepayment, availableForRepayment);
    
    let closingBalance = balanceBeforeSettlement;
    let actualSalaryImpact = 0;
    
    if (balanceBeforeSettlement > 0) {
        // Staff owes company
        closingBalance = balanceBeforeSettlement - repayment;
        actualSalaryImpact = repayment;
    } else if (balanceBeforeSettlement < 0) {
        // Company owes staff
        closingBalance = balanceBeforeSettlement + repayment;
        actualSalaryImpact = -repayment; 
    } else if (repayment > 0) {
        closingBalance = -repayment;
        actualSalaryImpact = repayment;
    }

    const totalDeductions = actualExplicitDeduction + actualSalaryImpact;
    
    return { 
      presentDays, halfDays, holidayDays, bonusDays, payableDays: effectivePresence + bonusDays, totalOT, 
      baseSalary: Math.round(totalWage), bonus: adjustment.bonus, deduction: actualExplicitDeduction,
      loanRepayment: repayment, grossEarnings, totalDeductions, totalSalary: Math.max(0, grossEarnings - totalDeductions),
      advanceBalance: closingBalance,
      openingBalance: getOpeningAdvanceBalance(emp.id, activeMonth),
      balanceBeforeSettlement
    };
  };

  const handleDisburseIndividual = async (empId: string) => {
    const adjKey = `${activeMonth}_${empId}`;
    const adj = payrollAdjustments[adjKey] || { bonus: 0, deduction: 0, loanRepayment: 0 };
    
    if (adj.status === 'DISBURSED') return;
    
    const emp = team.find(t => t.id === empId);
    if (!emp) return;
    
    const s = calculatePayroll(emp);
    
    const ok = await confirm({ title: `Commit disbursement for ${emp.name}?`, message: `This will record ₹${s.loanRepayment} as a repayment in the ledger.`, confirmLabel: 'Commit', confirmClass: 'px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors' });
    if (!ok) return;

    if (s.loanRepayment > 0) {
        const balBefore = s.openingBalance;
        const type = balBefore < 0 ? 'GIVEN' : 'REPAID';

        // Find end of the active month to ensure the transaction belongs to the correct reporting period
        const [y, m] = activeMonth.split('-').map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        const effectiveDate = `${activeMonth}-${String(lastDay).padStart(2, '0')}`;

        onAddLoan?.({
            id: `PAYROLL-${adjKey}-${Date.now()}`,
            employeeId: emp.id,
            type: type,
            amount: s.loanRepayment,
            date: effectiveDate,
            notes: `Payroll Settlement (${activeMonth}) - ${type === 'GIVEN' ? 'Credit Payout' : 'Debt Recovery'}`
        });
    }
    
    onUpdatePayrollAdjustment?.(adjKey, { 
        ...adj, 
        status: 'DISBURSED', 
        disbursedAt: new Date().toISOString() 
    });
  };

  const handleAutoFillDeductions = async () => {
    const ok = await confirm({ title: 'Auto-fill all pending deductions?', message: 'Based on outstanding balances. This will not commit them yet.', confirmLabel: 'Auto-fill', confirmClass: 'px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors' });
    if (!ok) return;
    
    team.forEach(emp => {
        const adjKey = `${activeMonth}_${emp.id}`;
        const adj = payrollAdjustments[adjKey] || { bonus: 0, deduction: 0, loanRepayment: 0 };
        
        if (adj.status === 'DISBURSED') return;
        
        const balBefore = getBalanceBeforeSettlement(emp.id, activeMonth);
        if (balBefore > 0) {
            // Calculate max possible deduction (don't exceed balance or total salary)
            const s = calculatePayroll(emp);
            const currentSalaryBeforeLoan = s.grossEarnings - adj.deduction;
            const suggestedDeduction = Math.min(balBefore, currentSalaryBeforeLoan);
            
            if (suggestedDeduction > 0) {
                onUpdatePayrollAdjustment?.(adjKey, { ...adj, loanRepayment: suggestedDeduction });
            }
        }
    });
  };

  const handleDisburseBatch = async () => {
    const pendingTeam = team.filter(emp => {
        const adj = payrollAdjustments[`${activeMonth}_${emp.id}`];
        return !adj || adj.status !== 'DISBURSED';
    });

    if (pendingTeam.length === 0) {
        toast.info("All personnel in this cycle are already disbursed.");
        return;
    }

    const ok = await confirm({ title: `Authorize disbursement for ${pendingTeam.length} personnel?`, message: 'This will commit all deductions to the ledger.', confirmLabel: 'Authorize', confirmClass: 'px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors' });
    if (!ok) return;
    
    let processedCount = 0;
    pendingTeam.forEach(emp => {
        const adjKey = `${activeMonth}_${emp.id}`;
        const adj = payrollAdjustments[adjKey] || { bonus: 0, deduction: 0, loanRepayment: 0 };
        
        if (adj.loanRepayment && adj.loanRepayment > 0) {
            const s = calculatePayroll(emp);
            const balBefore = s.openingBalance; // Correctly use the before-payroll balance
            const type = balBefore < 0 ? 'GIVEN' : 'REPAID';

            // Use end of month for effective ledger date
            const [y, m] = activeMonth.split('-').map(Number);
            const lastDay = new Date(y, m, 0).getDate();
            const effectiveDate = `${activeMonth}-${String(lastDay).padStart(2, '0')}`;

            onAddLoan?.({
                id: `PAYROLL-${adjKey}-${Date.now()}`,
                employeeId: emp.id,
                type: type,
                amount: adj.loanRepayment,
                date: effectiveDate,
                notes: `Payroll Settlement (${activeMonth}) - ${type === 'GIVEN' ? 'Credit Payout' : 'Debt Recovery'}`
            });
        }
        
        onUpdatePayrollAdjustment?.(adjKey, { 
            ...adj, 
            status: 'DISBURSED', 
            disbursedAt: new Date().toISOString() 
        });
        processedCount++;
    });
    
    toast.success(`Successfully processed ${processedCount} disbursements.`);
  };

  const generatePaySlipPDF = (emp: TeamMember) => {
    const s = calculatePayroll(emp);
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const sym = "Rs. ";
    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, pageWidth, 45, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(companyInfo.name.toUpperCase(), 15, 22);
    doc.setFontSize(8);
    doc.text("NEXUS CORE ERP V8.2 | INDUSTRIAL PAY ADVICE", 15, 29);
    doc.text(companyInfo.address || "Surat, GJ", 15, 34);
    doc.setFontSize(14);
    doc.text("SALARY SLIP", pageWidth - 15, 22, { align: 'right' });
    doc.setFontSize(9);
    const monthLabel = new Date(activeMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();
    doc.text(`CYCLE: ${monthLabel}`, pageWidth - 15, 29, { align: 'right' });
    doc.text(`ISSUED: ${new Date().toLocaleDateString()}`, pageWidth - 15, 34, { align: 'right' });
    let currentY = 58;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("PERSONNEL IDENTITY", 15, currentY);
    doc.line(15, currentY + 2, pageWidth - 15, currentY + 2);
    currentY += 10;
    doc.setFontSize(9);
    doc.text("Worker Name:", 15, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(emp.name, 45, currentY);
    doc.setFont("helvetica", "bold");
    doc.text("MAG-ID:", 120, currentY);
    doc.text(emp.id, 160, currentY);
    currentY += 6;
    doc.text("Role/Dept:", 15, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(`${emp.role || 'Operator'} | ${emp.department || 'General'}`, 45, currentY);
    doc.setFont("helvetica", "bold");
    doc.text("Base Pay:", 120, currentY);
    doc.text(`${sym}${emp.dailyWage}`, 160, currentY);
    currentY += 12;
    autoTable(doc, {
        startY: currentY + 4,
        margin: { left: 15, right: 15 },
        head: [['Physical Presence', 'Half-Shifts', 'Paid Holiday', 'Overtime (H)', 'Bonus Days', 'Pay Units']],
        body: [[`${s.presentDays} D`, `${s.halfDays} S`, `${s.holidayDays} D`, `${s.totalOT} H`, `+${s.bonusDays} D`, `${s.payableDays} U`]],
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 8 },
        styles: { halign: 'center', fontSize: 9 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 12;
    const mid = pageWidth / 2;
    const tablePadding = 5;
    autoTable(doc, {
        startY: currentY,
        margin: { left: 15, right: mid + tablePadding },
        head: [['Earnings Segment', 'Value']],
        body: [['Presence Base', `${sym}${Math.round(s.presentDays * (emp.dailyWage || 0)).toLocaleString()}`], ['Half-Shifts', `${sym}${Math.round(s.halfDays * 0.5 * (emp.dailyWage || 0)).toLocaleString()}`], ['Paid Holiday', `${sym}${Math.round(s.holidayDays * (emp.dailyWage || 0)).toLocaleString()}`], ['Overtime Pay', `${sym}${Math.round(s.totalOT * ((emp.dailyWage || 0) / 8) * 1.5).toLocaleString()}`], ['Bonus / Inc.', `${sym}${Math.round(s.bonusDays * (emp.dailyWage || 0) + s.bonus).toLocaleString()}`], ['', ''], ['GROSS PAY', `${sym}${s.grossEarnings.toLocaleString()}`]],
        theme: 'plain',
        headStyles: { fillColor: [79, 70, 229], textColor: 255 },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
    });
    const leftFinalY = (doc as any).lastAutoTable.finalY;
    autoTable(doc, {
        startY: currentY,
        margin: { left: mid + tablePadding, right: 15 },
        head: [['Deduction Class', 'Value']],
        body: [['Adv. Repay', `${sym}${s.loanRepayment.toLocaleString()}`], ['Absence Penalties', `${sym}${s.deduction.toLocaleString()}`], ['PF / ESI / Taxes', `${sym}0.00`], ['', ''], ['', ''], ['', ''], ['TOTAL DEDUCT', `${sym}${s.totalDeductions.toLocaleString()}`]],
        theme: 'plain',
        headStyles: { fillColor: [225, 29, 72], textColor: 255 },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
    });
    const rightFinalY = (doc as any).lastAutoTable.finalY;
    currentY = Math.max(leftFinalY, rightFinalY) + 12;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, currentY, pageWidth - 30, 25, 2, 2, 'FD');
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("ADVANCE PROTOCOL STATE", 20, currentY + 8);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text("Liability Before Payroll:", 20, currentY + 15);
    doc.text(`${sym}${s.balanceBeforeSettlement.toLocaleString()}`, 60, currentY + 15);
    doc.text("Current Repayment:", 20, currentY + 20);
    doc.text(`- ${sym}${s.loanRepayment.toLocaleString()}`, 60, currentY + 20);
    doc.setFont("helvetica", "bold");
    doc.text("REMAINING BALANCE:", pageWidth - 90, currentY + 12);
    doc.setFontSize(14);
    doc.text(`${sym}${s.advanceBalance.toLocaleString()}`, pageWidth - 90, currentY + 19);
    currentY += 35;
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(15, currentY, pageWidth - 30, 30, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.text("NET DISBURSEMENT:", 25, currentY + 14);
    doc.setTextColor(16, 185, 129); 
    doc.setFontSize(26);
    doc.text(`${sym}${s.totalSalary.toLocaleString()}`, pageWidth - 25, currentY + 17, { align: 'right' });
    doc.save(`PaySlip_${emp.name.replace(/\s+/g, '_')}_${activeMonth}.pdf`);
  };

  const generateMonthlyLedgerPDF = () => {
    const doc = new jsPDF({ orientation: 'l' });
    const pageWidth = doc.internal.pageSize.width;
    const [year, month] = activeMonth.split('-').map(Number);
    const monthLabel = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();
    doc.setFillColor(2, 6, 23); // Slate 950
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(`ATTENDANCE LEDGER: ${monthLabel}`, 15, 22);
    doc.setFontSize(10);
    doc.setTextColor(99, 102, 241); // Indigo 500
    doc.text(companyInfo.name.toUpperCase(), 15, 30);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.setFontSize(8);
    doc.text(`ISSUED: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 15, 35);
    const tableHead = [['RESOURCE ENTITY', 'DEPT', 'P', 'PH', 'A', ...daysArray.map(String)]];
    const tableBody = filteredTeam.map(emp => {
        let pCount = 0; let aCount = 0; let hCount = 0;
        const days = daysArray.map(d => {
            const dateStr = `${activeMonth}-${String(d).padStart(2,'0')}`;
            const s = recordsMap.get(`${emp.id}_${dateStr}`)?.status;
            if(s === AttendanceStatus.PRESENT) { pCount++; return 'P'; }
            else if(s === AttendanceStatus.HALF_DAY) { pCount += 0.5; return 'HD'; }
            else if(s === AttendanceStatus.ABSENT) { aCount++; return 'A'; }
            else if(s === AttendanceStatus.LEAVE) return 'L';
            else if(s === AttendanceStatus.HOLIDAY) { hCount++; return 'PH'; }
            return '.';
        });
        return [`${emp.name.toUpperCase()}`, (emp.department || 'GEN').substring(0, 3).toUpperCase(), pCount, hCount, aCount, ...days];
    });
    autoTable(doc, {
        startY: 50,
        head: tableHead,
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], fontSize: 7, halign: 'center', fontStyle: 'bold' },
        styles: { fontSize: 6.5, cellPadding: 1.5, halign: 'center', textColor: [30, 41, 59] },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold', minCellWidth: 40 } },
        didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index > 4) {
                const val = data.cell.text[0];
                if (val === 'P') data.cell.styles.textColor = [16, 185, 129];
                else if (val === 'A') data.cell.styles.textColor = [225, 29, 72];
                else if (val === 'HD') data.cell.styles.textColor = [99, 102, 241];
                else if (val === 'PH') data.cell.styles.textColor = [139, 92, 246];
                else if (val === 'L') data.cell.styles.textColor = [59, 130, 246];
            }
        }
    });
    doc.save(`Attendance_Ledger_${activeMonth}.pdf`);
  };

  const renderStats = () => {
    const present = team.filter(t => recordsMap.get(`${t.id}_${selectedDate}`)?.status === AttendanceStatus.PRESENT).length;
    const absent = team.filter(t => recordsMap.get(`${t.id}_${selectedDate}`)?.status === AttendanceStatus.ABSENT).length;
    const holiday = team.filter(t => recordsMap.get(`${t.id}_${selectedDate}`)?.status === AttendanceStatus.HOLIDAY).length;
    return (
        <div className="grid grid-cols-5 gap-3 mb-3">
            {[
              { label: 'Present', val: present, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
              { label: 'Paid Holiday', val: holiday, icon: Star, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20' },
              { label: 'Absent', val: absent, icon: Clock, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' },
              { label: 'Fiscal Load', val: `${currency}${team.reduce((acc, t) => {
                  const s = recordsMap.get(`${t.id}_${selectedDate}`)?.status;
                  return (s === AttendanceStatus.PRESENT || s === AttendanceStatus.HOLIDAY) ? acc + (t.dailyWage || 0) : acc;
              }, 0).toLocaleString()}`, icon: Landmark, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' }
            ].map((stat, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm">
                <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}><stat.icon className="w-4 h-4"/></div>
                <div><p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{stat.label}</p><h3 className="text-[11px] font-black text-slate-800 dark:text-white tabular-nums">{stat.val}</h3></div>
              </div>
            ))}
        </div>
    );
  };

  return (
    <div className="space-y-3 h-full flex flex-col relative">
      <ConfirmModal />
      {activeTab === 'DAILY' && renderStats()}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 bg-white dark:bg-slate-900 p-1.5 rounded-[1.5rem] shadow-sm border border-slate-200 dark:border-slate-800 shrink-0 z-10 no-print">
         <div className="flex items-center gap-3 w-full xl:w-auto">
            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl overflow-x-auto no-scrollbar">
               {[{ id: 'DAILY', label: 'Matrix', icon: Fingerprint }, { id: 'MONTHLY', label: 'Ledger', icon: Grid3X3 }, { id: 'LOANS', label: 'Advances', icon: Wallet }, { id: 'PAYROLL', label: 'Disbursement', icon: IndianRupee }].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white dark:text-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>
                    <tab.icon className="w-3.5 h-3.5"/> {tab.label}
                  </button>
               ))}
            </div>
            
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
               <CalendarIcon className="w-3.5 h-3.5 text-slate-400 ml-2" />
               <input 
                  type="month" 
                  className="bg-transparent border-none outline-none text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 cursor-pointer pr-2" 
                  value={activeMonth} 
                  onChange={(e) => {
                    const newMonth = e.target.value;
                    setActiveMonth(newMonth);
                    // Update selectedDate to first day of new month if current selectedDate is not in that month
                    if (!selectedDate.startsWith(newMonth)) {
                      setSelectedDate(`${newMonth}-01`);
                    }
                  }} 
               />
            </div>
         </div>
         <div className="flex items-center gap-2 px-2">
             <button onClick={handleBulkHoliday} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                <Star className="w-3 h-3 fill-current"/> Mark Bulk Paid Holiday
             </button>
             <button onClick={() => window.print()} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-indigo-600 hover:text-white transition-all border border-slate-100 dark:border-slate-700 shadow-sm active:scale-90"><Printer className="w-4 h-4"/></button>
         </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
         {activeTab === 'DAILY' && (
             <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-full animate-fade-in">
                 <div className="px-4 py-2 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row justify-between items-center gap-3 shrink-0">
                     <div className="flex items-center gap-2">
                         <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-lg border dark:border-slate-700 shadow-inner">
                             <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()-1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-1 hover:bg-slate-100 rounded text-slate-500"><ChevronLeft className="w-3.5 h-3.5"/></button>
                             <input type="date" className="bg-transparent outline-none cursor-pointer text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 w-24" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                             <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()+1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-1 hover:bg-slate-100 rounded text-slate-500"><ChevronRight className="w-3.5 h-3.5"/></button>
                         </div>
                         <select className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-lg px-2 py-1.5 text-[9px] font-black uppercase outline-none" value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
                             {departments.map(d => <option key={d} value={d}>{d}</option>)}
                         </select>
                     </div>
                     <div className="flex items-center gap-2">
                         {markingHistory.length > 0 && <button onClick={handleUndoLastAction} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 border dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all"><RotateCcw className="w-3 h-3" /> Undo</button>}
                         <div className="relative group"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" /><input className="w-48 pl-8 pr-3 py-1.5 bg-white dark:bg-slate-950 border dark:border-slate-800 rounded-lg text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all dark:text-white" placeholder="Filter Matrix..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
                         <button onClick={handleCommitDaily} disabled={isCommitting} className="bg-slate-900 dark:bg-indigo-600 hover:bg-black text-white px-4 py-1.5 rounded-lg font-black uppercase text-[9px] tracking-widest shadow-lg transition-all disabled:opacity-50">{isCommitting ? <RefreshCcw className="w-3.5 h-3.5 animate-spin"/> : <Save className="w-3.5 h-3.5 mr-1 inline-block"/>} COMMIT MATRIX</button>
                     </div>
                 </div>
                 <div className="flex-1 overflow-y-auto custom-scrollbar">
                     <table className="w-full text-left text-[11px] border-collapse">
                         <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-black uppercase tracking-widest sticky top-0 z-20 border-b dark:border-slate-800">
                             <tr><th className="px-6 py-3">Workforce Node</th><th className="px-2 py-3 text-center">Status Protocol</th><th className="px-2 py-3 text-center">Interval (In/Out)</th><th className="px-2 py-3 text-center">Shift</th><th className="px-6 py-3 text-right">#</th></tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                             {filteredTeam.map(member => {
                                 const key = `${member.id}_${selectedDate}`;
                                 const marking = localMarkings[member.id] || recordsMap.get(key) || {};
                                 const status = marking.status;
                                 return (
                                     <tr key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors h-11">
                                         <td className="px-6 py-1">
                                             <div className="flex items-center gap-3">
                                                 <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center font-black text-[10px] text-indigo-600 border dark:border-slate-800 uppercase overflow-hidden shadow-inner">{member.profileImageUrl ? <img src={member.profileImageUrl} className="w-full h-full object-cover" /> : member.name.charAt(0)}</div>
                                                 <div className="min-w-0"><p className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-[11px] truncate leading-none mb-1">{member.name}</p><p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest truncate">{member.role} • {member.department || 'GENERAL'}</p></div>
                                             </div>
                                         </td>
                                         <td className="px-2 py-1"><div className="flex justify-center gap-1">{[{ id: AttendanceStatus.PRESENT, label: 'P', color: 'bg-emerald-500' }, { id: AttendanceStatus.ABSENT, label: 'A', color: 'bg-rose-500' }, { id: AttendanceStatus.HALF_DAY, label: 'HD', color: 'bg-indigo-400' }, { id: AttendanceStatus.LEAVE, label: 'L', color: 'bg-blue-500' }, { id: AttendanceStatus.HOLIDAY, label: 'PH', color: 'bg-violet-500' }].map(s => (<button key={s.id} onClick={() => handleImmediateStatusUpdate(member.id, s.id)} title={s.label} className={`w-8 h-7 rounded flex items-center justify-center text-[9px] font-black transition-all border ${status === s.id ? `${s.color} text-white border-transparent scale-105 shadow-sm` : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-300 hover:border-indigo-300'}`}>{s.label}</button>))}</div></td>
                                         <td className="px-2 py-1 text-center"><div className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-lg border dark:border-slate-800 font-mono text-[9px] font-black shadow-inner"><input type="time" className="bg-transparent outline-none w-[110px] text-center cursor-pointer" value={marking.checkIn || ''} onChange={e => updateLocalMarking(member.id, { checkIn: e.target.value })} /><span className="opacity-20 text-[14px]">|</span><input type="time" className="bg-transparent outline-none w-[110px] text-center cursor-pointer" value={marking.checkOut || ''} onChange={e => updateLocalMarking(member.id, { checkOut: e.target.value })} /></div></td>
                                         <td className="px-2 py-1 text-center"><select className="bg-transparent border-none p-0 text-[9px] font-black uppercase tracking-widest text-slate-500 outline-none cursor-pointer" value={marking.shift || member.defaultShift || 'GENERAL'} onChange={e => updateLocalMarking(member.id, { shift: e.target.value as any })}>{Object.keys(SHIFT_CONFIG).map(s => <option key={s} value={s}>{SHIFT_CONFIG[s as keyof typeof SHIFT_CONFIG].label}</option>)}</select></td>
                                         <td className="px-6 py-1 text-right"><button onClick={() => setNoteModalData({ empId: member.id, date: selectedDate, note: marking.note || '' })} className={`p-1.5 rounded-lg transition-all ${marking.note ? 'text-amber-500' : 'text-slate-300 hover:text-indigo-600'}`}><MessageSquare className="w-3.5 h-3.5"/></button></td>
                                     </tr>
                                 );
                             })}
                         </tbody>
                     </table>
                 </div>
             </div>
          )}
          {activeTab === 'MONTHLY' && (
             <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm border dark:border-slate-800 overflow-hidden h-full">
                <div className="px-4 py-2 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950"><h3 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2"><Grid3X3 className="w-3.5 h-3.5 text-indigo-500"/> Master Personnel Ledger</h3><div className="flex items-center gap-2"><button onClick={generateMonthlyLedgerPDF} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm" title="Extract Ledger PDF"><Download className="w-3.5 h-3.5" /></button></div></div>
                <div className="flex-1 overflow-auto custom-scrollbar">
                  <table className="w-full text-center border-collapse text-[9px]">
                    <thead className="bg-slate-50 dark:bg-slate-950 sticky top-0 z-30 font-black border-b dark:border-slate-800 uppercase tracking-widest">
                      <tr>
                        <th className="sticky left-0 bg-white dark:bg-slate-900 z-40 border-r dark:border-slate-800 px-4 py-3 min-w-[140px] text-left text-slate-500">Resource Unit</th>
                        <th className="border-r dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-900/10 p-1 min-w-[28px] text-emerald-600">P</th>
                        <th className="border-r dark:border-slate-800 bg-violet-50/50 dark:bg-violet-900/10 p-1 min-w-[28px] text-violet-600">PH</th>
                        <th className="border-r dark:border-slate-800 bg-rose-50/50 dark:bg-rose-900/10 p-1 min-w-[28px] text-rose-600">A</th>
                        {daysArray.map(d => (<th key={d} className="border-r dark:border-slate-800 p-1 min-w-[24px] text-slate-400 font-bold">{d}</th>))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredTeam.map(emp => { 
                        let pCount = 0; let aCount = 0; let hCount = 0; 
                        daysArray.forEach(d => { 
                          const dateStr = `${activeMonth}-${String(d).padStart(2,'0')}`; 
                          const s = recordsMap.get(`${emp.id}_${dateStr}`)?.status; 
                          if(s === AttendanceStatus.PRESENT) pCount++; 
                          else if(s === AttendanceStatus.HALF_DAY) pCount += 0.5; 
                          else if(s === AttendanceStatus.ABSENT) aCount++; 
                          else if(s === AttendanceStatus.HOLIDAY) hCount++; 
                        }); 
                        return (
                          <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors h-8">
                            <td className="sticky left-0 bg-white dark:bg-slate-900 z-20 border-r dark:border-slate-800 px-4 text-left font-black text-slate-700 dark:text-slate-300 uppercase truncate">{emp.name}</td>
                            <td className="border-r dark:border-slate-800 font-black text-emerald-600 tabular-nums">{pCount}</td>
                            <td className="border-r dark:border-slate-800 font-black text-violet-600 tabular-nums">{hCount}</td>
                            <td className="border-r dark:border-slate-800 font-black text-rose-600 tabular-nums">{aCount}</td>
                            {daysArray.map(d => { 
                              const dateStr = `${activeMonth}-${String(d).padStart(2,'0')}`; 
                              const current = recordsMap.get(`${emp.id}_${dateStr}`); 
                              const status = current?.status; 
                              let colorClass = "text-slate-200 dark:text-slate-800"; 
                              let char = "·"; 
                              if (status === AttendanceStatus.PRESENT) { colorClass = "text-emerald-500"; char = "P"; } 
                              else if (status === AttendanceStatus.ABSENT) { colorClass = "text-rose-500"; char = "A"; } 
                              else if (status === AttendanceStatus.HALF_DAY) { colorClass = "text-indigo-400"; char = "HD"; } 
                              else if (status === AttendanceStatus.LEAVE) { colorClass = "text-blue-500"; char = "L"; } 
                              else if (status === AttendanceStatus.HOLIDAY) { colorClass = "text-violet-500"; char = "PH"; } 
                              return (
                                <td key={d} onClick={() => { 
                                  setPendingUpdate({
                                    empId: emp.id,
                                    empName: emp.name,
                                    date: dateStr,
                                    status: status || AttendanceStatus.ABSENT,
                                    recordId: current?.id,
                                    shift: current?.shift || emp.defaultShift
                                  });
                                }} className={`border-r dark:border-slate-800 p-1 font-black cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all select-none ${colorClass} relative`}>{char}</td>
                              ); 
                            })}
                          </tr>
                        ); 
                      })}
                    </tbody>
                  </table>
                </div>
             </div>
          )}
          {activeTab === 'PAYROLL' && (
            <div className="flex flex-col h-full space-y-3 animate-fade-in">
                <div className="bg-slate-950 rounded-[1.5rem] p-6 text-white flex flex-col md:flex-row justify-between items-center shadow-xl relative overflow-hidden group border border-white/5">
                    <div className="absolute right-0 top-0 opacity-5 p-2 rotate-6"><Receipt className="w-48 h-48"/></div>
                    <div className="flex items-center gap-8 relative z-10">
                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                            <CalendarIcon className="w-4 h-4 text-indigo-400" />
                            <span className="font-black text-xs uppercase">{new Date(activeMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                        </div>
                        <div><p className="text-indigo-400 text-[8px] font-black uppercase tracking-widest mb-1 opacity-60">Cycle Aggregate Magnitude</p><h3 className="text-2xl font-black tabular-nums">{currency}{team.reduce((acc, m) => acc + calculatePayroll(m).totalSalary, 0).toLocaleString()}</h3></div>
                    </div>
                    <div className="flex gap-3 mt-4 md:mt-0">
                        <button onClick={handleAutoFillDeductions} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest border border-white/10 transition-all">Smart Auto-Fill</button>
                        <button onClick={handleDisburseBatch} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Authorize Batch</button>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden flex-1 flex flex-col shadow-sm">
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                        <table className="w-full text-left text-[10px] border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 sticky top-0 z-10 uppercase font-black tracking-widest">
                                <tr>
                                    <th className="px-6 py-3">Workforce Entity</th>
                                    <th className="px-3 py-3 text-right">Physical (P)</th>
                                    <th className="px-3 py-3 text-right">Holiday (PH)</th>
                                    <th className="px-3 py-3 text-right">Pay Units</th>
                                    <th className="px-3 py-3 text-right text-indigo-500">M. Opening (Adv)</th>
                                    <th className="px-3 py-3 text-right text-rose-500">Repay / Penalty</th>
                                    <th className="px-3 py-3 text-right text-emerald-500">M. Closing (Adv)</th>
                                    <th className="px-3 py-3 text-right">Net Payload</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                    <th className="px-6 py-3 text-right">Operations</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredTeam.map(emp => {
                                    const s = calculatePayroll(emp);
                                    const adj = payrollAdjustments[`${activeMonth}_${emp.id}`] || { status: 'PENDING' };
                                    const isDisbursed = adj.status === 'DISBURSED';
                                    
                                    return (
                                        <tr key={emp.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group h-11 ${isDisbursed ? 'opacity-75' : ''}`}>
                                            <td className="px-6 py-1"><div className="flex items-center gap-3"><div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-400 group-hover:text-indigo-600 border dark:border-slate-700 overflow-hidden">{emp.profileImageUrl ? <img src={emp.profileImageUrl} className="w-full h-full object-cover" /> : emp.name.charAt(0)}</div><p className="font-black text-slate-800 dark:text-white uppercase truncate max-w-[120px]">{emp.name}</p></div></td>
                                            <td className="px-3 py-1 text-right font-bold text-slate-500 tabular-nums">{s.presentDays + (s.halfDays * 0.5)}D</td>
                                            <td className="px-3 py-1 text-right font-bold text-violet-600 tabular-nums">{s.holidayDays}D</td>
                                            <td className="px-3 py-1 text-right font-bold text-slate-700 dark:text-slate-300 tabular-nums">{s.payableDays}D</td>
                                            <td className={`px-3 py-1 text-right font-black tabular-nums transition-all ${s.balanceBeforeSettlement > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{currency}{Math.abs(s.balanceBeforeSettlement).toLocaleString()}</td>
                                            <td className="px-3 py-1 text-right font-black text-indigo-500 tabular-nums">{currency}{s.loanRepayment.toLocaleString()}</td>
                                            <td className={`px-3 py-1 text-right font-black tabular-nums transition-all ${s.advanceBalance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{currency}{Math.abs(s.advanceBalance).toLocaleString()}</td>
                                            <td className="px-6 py-1 text-right"><span className="font-black text-[11px] text-emerald-600 tabular-nums">{currency}{s.totalSalary.toLocaleString()}</span></td>
                                            <td className="px-4 py-1 text-center">
                                                {isDisbursed ? (
                                                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase border border-emerald-200">Disbursed</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[8px] font-black uppercase border border-amber-200">Pending</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-1 text-right">
                                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                {!isDisbursed && (
                                                    <button onClick={() => handleDisburseIndividual(emp.id)} className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md" title="Commit Disbursement"><CheckCircle2 className="w-3.5 h-3.5"/></button>
                                                )}
                                                <button onClick={() => generatePaySlipPDF(emp)} className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg text-slate-400 hover:text-indigo-600" title="Extract Pay Slip PDF"><Printer className="w-3.5 h-3.5"/></button>
                                                <button onClick={() => { setAdjustmentMember(emp); const currentAdj = payrollAdjustments[`${activeMonth}_${emp.id}`] || { bonus: 0, deduction: 0, loanRepayment: 0 }; setAdjustmentForm({ ...currentAdj }); setIsAdjustmentModalOpen(true); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-300 hover:text-indigo-600" title="Manual Mutation"><SlidersHorizontal className="w-3.5 h-3.5"/></button>
                                              </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
          )}
          {activeTab === 'LOANS' && (
             <div className="flex-1 flex flex-col space-y-4 h-full">
                <div className="bg-slate-950 rounded-[2.5rem] p-6 text-white shadow-xl relative overflow-hidden flex justify-between items-center border border-white/5 shrink-0"><div className="absolute right-0 top-0 opacity-5 p-2 rotate-6"><Landmark className="w-48 h-48"/></div><div><p className="text-indigo-400 text-[9px] font-black uppercase tracking-[0.5em] mb-2 opacity-60">Global Portfolio Magnitude</p><h3 className="text-3xl font-black tabular-nums tracking-tighter">{currency} {team.reduce((sum, t) => sum + Math.max(0, getGlobalAdvanceBalance(t.id)), 0).toLocaleString()}</h3></div><button onClick={() => { setLoanFormData({ type: 'GIVEN', notes: '', amount: 0, date: new Date().toISOString().split('T')[0] }); setIsLoanModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl relative z-10 active:scale-95 transition-all">Authorize Ingress</button></div>
                <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center"><h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><IndianRupee className="w-3.5 h-3.5"/> Personnel Advance Summary</h3><div className="flex items-center gap-2 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-lg px-3 py-1 shadow-inner"><Search className="w-3 h-3 text-slate-400" /><input className="bg-transparent border-none outline-none text-[10px] font-bold w-32 uppercase" placeholder="Filter List..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div></div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar"><table className="w-full text-left text-[10px] border-collapse"><thead className="bg-slate-50 dark:bg-slate-950 border-b dark:border-slate-800 text-slate-500 font-black uppercase tracking-widest sticky top-0 z-10"><tr><th className="px-8 py-4">Workforce Identity</th><th className="px-4 py-4 text-center">Protocol State</th><th className="px-4 py-4 text-right">Net Balance (Global)</th><th className="px-8 py-4 text-right">Action Interface</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{team.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).map(emp => { const balance = getGlobalAdvanceBalance(emp.id); if (balance === 0 && (loans || []).filter(l => l.employeeId === emp.id).length === 0) return null; return (<tr key={emp.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group h-14"><td className="px-8 py-1"><div className="flex items-center gap-3 cursor-pointer" onClick={() => { setViewingLoanEmpId(emp.id); setIsLoanHistoryModalOpen(true); }}><div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black border dark:border-slate-700 overflow-hidden group-hover:border-indigo-400 transition-colors shadow-inner">{emp.profileImageUrl ? <img src={emp.profileImageUrl} className="w-full h-full object-cover" /> : emp.name.charAt(0)}</div><div><p className="font-black text-slate-800 dark:text-white uppercase truncate group-hover:text-indigo-600 transition-colors">{emp.name}</p><p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Shard {emp.id}</p></div></div></td><td className="px-4 py-1 text-center"><span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border tracking-tighter ${balance > 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>{balance > 0 ? 'Active Debt' : 'Settled'}</span></td><td className="px-4 py-1 text-right font-black tabular-nums"><span className={balance > 0 ? 'text-rose-500' : 'text-emerald-500'}>{currency}{Math.abs(balance).toLocaleString()}</span></td><td className="px-8 py-1 text-right"><div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => { setViewingLoanEmpId(emp.id); setIsLoanHistoryModalOpen(true); }} className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all border dark:border-slate-700" title="Inspect Ledger"><Eye className="w-3.5 h-3.5"/></button><button onClick={() => { setLoanFormData({ employeeId: emp.id, type: 'REPAID', notes: 'Advance Settlement', amount: balance, date: new Date().toISOString().split('T')[0] }); setIsLoanModalOpen(true); }} className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md" title="Protocol Repay"><ArrowUpRight className="w-3.5 h-3.5"/></button></div></td></tr>); })}</tbody></table></div>
                </div>
             </div>
          )}
      </div>

      <BaseModal isOpen={isLoanModalOpen} onClose={() => setIsLoanModalOpen(false)} title={loanFormData.id ? "Update Advance Protocol" : "Advance Registry Initialization"} size="sm">
         <form onSubmit={handleSaveLoan} className="space-y-4">
            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1 px-1">Resource Shard</label><select required className="w-full border-2 dark:border-slate-700 rounded-xl p-3 text-sm font-black bg-white dark:bg-slate-900 dark:text-white" value={loanFormData.employeeId} onChange={e => setLoanFormData({...loanFormData, employeeId: e.target.value})} disabled={!!loanFormData.id}><option value="">Select Workforce Entity...</option>{team.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1 px-1">Protocol Type</label><select className="w-full border-2 dark:border-slate-700 rounded-xl p-3 text-sm font-black bg-white dark:bg-slate-900" value={loanFormData.type} onChange={e => setLoanFormData({...loanFormData, type: e.target.value as any})}><option value="GIVEN">PAYOUT (DR)</option><option value="REPAID">REPAYMENT (CR)</option></select></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1 px-1">Magnitude</label><input type="text" inputMode="decimal" required className="w-full border-2 dark:border-slate-700 rounded-xl p-3 text-sm font-black tabular-nums bg-white dark:bg-slate-900 dark:text-white" value={loanFormAmount} onChange={e => { const val = e.target.value; if (val === '' || /^\d*\.?\d*$/.test(val)) setLoanFormAmount(val); }} /></div>
            </div>
            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1 px-1">Protocol Date</label><input type="date" required className="w-full border-2 dark:border-slate-700 rounded-xl p-3 text-sm font-black bg-white dark:bg-slate-900 dark:text-white" value={loanFormData.date} onChange={e => setLoanFormData({...loanFormData, date: e.target.value})} /></div>
            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1 px-1">Mutation Context</label><textarea className="w-full border-2 dark:border-slate-700 rounded-xl p-3 text-sm font-medium bg-slate-50 dark:bg-slate-950 h-24" value={loanFormData.notes} onChange={e => setLoanFormData({...loanFormData, notes: e.target.value})} placeholder="Reference details..." /></div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl">{loanFormData.id ? "Commit Update" : "Commit Advance Shard"}</button>
         </form>
      </BaseModal>

      <BaseModal isOpen={isLoanHistoryModalOpen} onClose={() => setIsLoanHistoryModalOpen(false)} title={`Advance Ledger: ${team.find(t => t.id === viewingLoanEmpId)?.name}`} size="lg">
         <div className="space-y-4">
            <div className="bg-slate-950 p-6 rounded-[2rem] text-white flex justify-between items-center">
               <div>
                  <p className="text-indigo-400 text-[9px] font-black uppercase tracking-widest mb-1">Net Portfolio Balance</p>
                  <h3 className="text-2xl font-black tabular-nums">{currency} {viewingLoanEmpId ? getGlobalAdvanceBalance(viewingLoanEmpId).toLocaleString() : 0}</h3>
               </div>
               <button onClick={() => { setLoanFormData({ employeeId: viewingLoanEmpId!, type: 'GIVEN', notes: '', amount: 0, date: new Date().toISOString().split('T')[0] }); setIsLoanModalOpen(true); }} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">New Entry</button>
            </div>
            <div className="overflow-hidden rounded-2xl border dark:border-slate-800">
               <table className="w-full text-left text-[10px]">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-black uppercase tracking-widest">
                     <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3">Notes</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                     {mergedLoanLedger.map(entry => (
                        <tr key={entry.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${entry.isSystem ? 'bg-indigo-50/10' : ''}`}>
                           <td className="px-4 py-3 font-bold">{entry.date}</td>
                           <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${entry.type === 'GIVEN' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                 {entry.type === 'GIVEN' ? 'DR' : 'CR'}
                              </span>
                           </td>
                           <td className={`px-4 py-3 text-right font-black tabular-nums ${entry.type === 'GIVEN' ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {currency}{entry.amount.toLocaleString()}
                           </td>
                           <td className="px-4 py-3 text-slate-500 italic max-w-[200px] truncate flex items-center gap-2">
                             {entry.isSystem && <Activity className="w-3 h-3 text-indigo-400" />}
                             {entry.notes}
                           </td>
                           <td className="px-4 py-3 text-right">
                              {!entry.isSystem ? (
                                <div className="flex justify-end gap-2">
                                   <button onClick={() => { setLoanFormData({
                                     id: entry.id,
                                     date: entry.date,
                                     employeeId: viewingLoanEmpId!,
                                     type: entry.type as any,
                                     amount: entry.amount,
                                     notes: entry.notes
                                   }); setIsLoanModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"><SlidersHorizontal className="w-3.5 h-3.5"/></button>
                                   <button onClick={async () => { const ok = await confirm({ title: 'Revoke this ledger entry?', message: 'The entry will be permanently removed from the ledger.', confirmLabel: 'Revoke' }); if (ok) onDeleteLoan?.(entry.id); }} className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                                </div>
                              ) : (
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">Auto-Mutation</span>
                              )}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      </BaseModal>

      <BaseModal isOpen={isAdjustmentModalOpen} onClose={() => setIsAdjustmentModalOpen(false)} title={`Mutation: ${adjustmentMember?.name}`} size="sm">
         <form onSubmit={async (e) => { 
            e.preventDefault(); 
            if (adjustmentMember) { 
              const bonus = parseFloat(adjBonusStr) || 0;
              const deduction = parseFloat(adjDeductionStr) || 0;
              const repayment = parseFloat(adjRepaymentStr) || 0;

              const stats = calculatePayroll(adjustmentMember, { ...adjustmentForm, bonus, deduction, loanRepayment: repayment });
              
              if (deduction > stats.grossEarnings) {
                const ok = await confirm({ title: 'Penalties exceed gross earnings', message: `Penalties (₹${deduction}) exceed gross earnings (₹${stats.grossEarnings}). Only the earned amount will be deducted. Continue?`, confirmLabel: 'Continue', confirmClass: 'px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold transition-colors' });
                if (!ok) return;
              }

              const finalized: PayrollAdjustment = {
                ...adjustmentForm,
                loanRepayment: repayment,
                bonus: bonus,
                deduction: deduction
              };
              onUpdatePayrollAdjustment?.(`${activeMonth}_${adjustmentMember.id}`, finalized); 
              setIsAdjustmentModalOpen(false); 
            } 
         }} className="space-y-5">
            <div className="bg-slate-950 text-white p-6 rounded-[1.5rem] text-center relative overflow-hidden shadow-xl">
               <p className="text-indigo-400 font-black uppercase text-[9px] tracking-[0.4em] mb-2">Advance Portfolio Balance</p>
               <h3 className={`text-2xl font-black tabular-nums ${getAdvanceBalance(adjustmentMember?.id || '') > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                 {currency}{Math.abs(getAdvanceBalance(adjustmentMember?.id || '')).toLocaleString()}
               </h3>
               <p className="text-[8px] font-bold text-slate-500 uppercase mt-2">{getAdvanceBalance(adjustmentMember?.id || '') > 0 ? 'Staff Owe to Company' : 'Company Owe to Staff'}</p>
            </div>
            <div className="space-y-4">
                <div>
                   <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Advance Repayment (Deduct)</label>
                   <input type="text" inputMode="decimal" className="w-full border-2 border-indigo-100 dark:border-slate-700 rounded-xl p-3 text-sm font-black tabular-nums bg-white dark:bg-slate-900 dark:text-white shadow-inner" value={adjRepaymentStr} onChange={e => { const val = e.target.value; if (val === '' || /^\d*\.?\d*$/.test(val)) setAdjRepaymentStr(val); }} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Incentive Node</label><input type="text" inputMode="decimal" className="w-full border-2 dark:border-slate-700 rounded-xl p-3 text-sm font-black tabular-nums bg-white dark:bg-slate-900 dark:text-white shadow-inner" value={adjBonusStr} onChange={e => { const val = e.target.value; if (val === '' || /^\d*\.?\d*$/.test(val)) setAdjBonusStr(val); }} /></div>
                    <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Other Penalties</label><input type="text" inputMode="decimal" className="w-full border-2 dark:border-slate-700 rounded-xl p-3 text-sm font-black tabular-nums bg-white dark:bg-slate-900 dark:text-white shadow-inner" value={adjDeductionStr} onChange={e => { const val = e.target.value; if (val === '' || /^\d*\.?\d*$/.test(val)) setAdjDeductionStr(val); }} /></div>
                </div>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-black uppercase tracking-[0.3em] text-[9px] shadow-xl active:scale-95 transition-all">Commit Mutations</button>
         </form>
      </BaseModal>

      <BaseModal isOpen={!!pendingUpdate} onClose={() => setPendingUpdate(null)} title="Verify Attendance Protocol" size="sm">
         <div className="space-y-6 text-center">
            <div className="mx-auto w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center text-indigo-600"><ShieldQuestion className="w-8 h-8"/></div>
            <div><h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Authorize Status Change?</h4><p className="text base font-bold text-slate-800 dark:text-white uppercase leading-tight">Update <span className="text-indigo-600">{pendingUpdate?.empName}</span> for <span className="text-indigo-600">{pendingUpdate?.date}</span> to:</p>
               <div className="mt-6 flex flex-wrap justify-center gap-2">{[{ id: AttendanceStatus.PRESENT, label: 'P', color: 'emerald' }, { id: AttendanceStatus.ABSENT, label: 'A', color: 'rose' }, { id: AttendanceStatus.HALF_DAY, label: 'HD', color: 'indigo' }, { id: AttendanceStatus.LEAVE, label: 'L', color: 'blue' }, { id: AttendanceStatus.HOLIDAY, label: 'PH', color: 'violet' }].map(opt => (<button key={opt.id} onClick={() => setPendingUpdate(prev => prev ? {...prev, status: opt.id} : null)} className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-black transition-all border-2 ${pendingUpdate?.status === opt.id ? `bg-${opt.color}-500 border-${opt.color}-700 text-white shadow-lg scale-110` : `bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-300 hover:border-${opt.color}-400 hover:text-${opt.color}-600`}`}>{opt.label}</button>))}</div>
               <div className="mt-6 flex flex-col items-center gap-3"><span className={`px-10 py-3 rounded-2xl text-xl font-black uppercase shadow-2xl border-b-4 transition-all ${pendingUpdate?.status === AttendanceStatus.PRESENT ? 'bg-emerald-500 border-emerald-700 text-white shadow-emerald-500/20' : pendingUpdate?.status === AttendanceStatus.ABSENT ? 'bg-rose-500 border-rose-700 text-white shadow-rose-500/20' : pendingUpdate?.status === AttendanceStatus.HALF_DAY ? 'bg-indigo-500 border-indigo-700 text-white shadow-indigo-500/20' : pendingUpdate?.status === AttendanceStatus.HOLIDAY ? 'bg-violet-500 border-violet-700 text-white shadow-violet-500/20' : 'bg-blue-500 border-blue-700 text-white shadow-blue-500/20'}`}>{pendingUpdate?.status?.replace('_', ' ')}</span></div>
            </div>
            <div className="pt-4 flex gap-3"><button onClick={() => setPendingUpdate(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all border dark:border-slate-700">Abort</button><button onClick={confirmUpdate} className={`flex-1 py-4 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95 ${pendingUpdate?.status === AttendanceStatus.PRESENT ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30' : pendingUpdate?.status === AttendanceStatus.ABSENT ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/30' : pendingUpdate?.status === AttendanceStatus.HALF_DAY ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30' : 'bg-slate-900 hover:bg-black'}`}>Confirm Update</button></div>
         </div>
      </BaseModal>
    </div>
  );
};

export default Attendance;
