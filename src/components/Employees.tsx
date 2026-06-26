import React, { useState, useMemo, useEffect } from "react";
import { uuidShort } from "../utils/uuid";
import {
  TeamMember,
  UserRole,
  ShiftType,
  AttendanceRecord,
  LoanRecord,
  LeaveRequest,
  PayrollAdjustment,
  CompanyInfo,
} from "../types";
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Trash2,
  UserCircle,
  LayoutGrid,
  List,
  Download,
  Camera,
  Briefcase,
  Calendar,
  Check,
  X,
  Clock,
  IndianRupee,
  Filter,
  Loader2,
  MoreHorizontal,
  ArrowLeft,
  Save,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { commitImage } from "../utils/imageUtils";
import ListPage, {
  ColumnDef,
  TagFilter,
  BulkAction,
  StatusBadge,
} from "./ListPage";
import Attendance from "./Attendance";
import { hashPassword } from "../utils/crypto";

interface EmployeesProps {
  team: TeamMember[];
  onAdd: (m: TeamMember) => void;
  onUpdate: (m: TeamMember) => void;
  onDelete: (id: string) => void;
  currentUserId?: string; // BUG 8 FIX: prevent self-delete and last-admin delete
  currency?: string;
  // newly added for tabs inside employee form
  records?: AttendanceRecord[];
  loans?: LoanRecord[];
  leaves?: LeaveRequest[];
  payrollAdjustments?: Record<string, PayrollAdjustment>;
  onSaveRecord?: (record: AttendanceRecord) => void;
  onSaveManyRecords?: (records: AttendanceRecord[]) => void;
  onUpdateTeamMember?: (member: TeamMember) => void;
  onAddLoan?: (loan: LoanRecord) => void;
  onDeleteLoan?: (id: string) => void;
  onAddLeave?: (leave: LeaveRequest) => void;
  onUpdateLeave?: (leave: LeaveRequest) => void;
  onUpdatePayrollAdjustment?: (
    key: string,
    adjustment: PayrollAdjustment,
  ) => void;
  companyInfo?: CompanyInfo;
}

const Employees: React.FC<EmployeesProps> = (props) => {
  const { team = [], onAdd, onUpdate, onDelete, currency = "₹", currentUserId } = props;
  const [viewMode, setViewMode] = useState<"LIST" | "FORM">("LIST");
  const [activeTab, setActiveTab] = useState<
    "DETAILS" | "ATTENDANCE" | "PAYROLL"
  >("DETAILS");
  const [filter, setFilter] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState<Partial<TeamMember>>({
    name: "",
    status: "ACTIVE",
    role: "WORKER",
    department: "GENERAL",
    dailyWage: 0,
    defaultShift: "GENERAL",
  });

  const filteredTeam = useMemo(() => {
    return (team || []).filter((m) => {
      const search = filter.toLowerCase();
      const name = (m.name || "").toLowerCase();
      const dept = (m.department || "").toLowerCase();
      const id = (m.id || "").toLowerCase();
      return (
        name.includes(search) || dept.includes(search) || id.includes(search)
      );
    });
  }, [team, filter]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    // FIX: new employees must have a password so they can actually log in.
    // Without a password, passwordHash stays undefined and login always fails.
    const isNewMember = !formData.id;
    if (isNewMember && !formData.password) {
      alert("Please set a login password for the new employee.");
      return;
    }

    let passHash = (formData as any).passwordHash;
    if (formData.password) {
      passHash = await hashPassword(formData.password);
    }

    const { password, ...restData } = formData;

    const member = {
      ...restData,
      passwordHash: passHash,
      id: formData.id || `EMP-${uuidShort(12)}`,
      updatedAt: new Date().toISOString(),
    } as any;

    if (formData.id) onUpdate(member);
    else onAdd(member);

    setViewMode("LIST");
    setFormData({
      name: "",
      status: "ACTIVE",
      role: "WORKER",
      department: "GENERAL",
      dailyWage: 0,
      defaultShift: "GENERAL",
    });
  };

  const openForm = (m?: TeamMember) => {
    if (m) {
      setFormData({ ...m, department: (m.department || "GENERAL").toUpperCase() });
    } else {
      setFormData({
        name: "",
        status: "ACTIVE",
        role: "WORKER",
        department: "GENERAL",
        dailyWage: 0,
        defaultShift: "GENERAL",
      });
    }
    setViewMode("FORM");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsUploading(true);
        const resultUrl = await commitImage(file, 400);
        setFormData((prev) => ({ ...prev, profileImageUrl: resultUrl }));
      } catch (err) {
        console.error("Profile photo commit failed:", err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const colors = {
      ADMIN: "text-[#ef4444] bg-[#fef2f2] border-[#fecaca]",
      MANAGER: "text-[#8b5cf6] bg-[#f5f3ff] border-[#ddd6fe]",
      ACCOUNTANT: "text-[#f59e0b] bg-[#fffbeb] border-[#fde68a]",
      SALES: "text-[#10b981] bg-[#ecfdf5] border-[#a7f3d0]",
      WORKER: "text-[#525c66] bg-[#f4f5f6] border-[#d1d8dd]",
    };
    const c = colors[role] || colors.WORKER;
    return (
      <span
        className={`px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide border ${c}`}
      >
        {role === "ADMIN"
          ? "Admin"
          : role === "MANAGER"
            ? "Manager"
            : role === "ACCOUNTANT"
              ? "Accountant"
              : role === "SALES"
                ? "Sales"
                : "Worker"}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === "ACTIVE")
      return (
        <span className="bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">
          Active
        </span>
      );
    if (status === "INACTIVE")
      return (
        <span className="bg-[#fef2f2] text-[#ef4444] border border-[#fecaca] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">
          Inactive
        </span>
      );
    return (
      <span className="bg-[#fffbeb] text-[#f59e0b] border border-[#fde68a] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">
        On Leave
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full font-sans antialiased -mx-4 -my-5 lg:-m-6 overflow-hidden">
      {viewMode === "LIST" ? (
        (() => {
          const empCols: ColumnDef<TeamMember>[] = [
            {
              key: "name",
              label: "Employee Name",
              width: 220,
              render: (r) => (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase shrink-0">
                    {r.name?.charAt(0)}
                  </span>
                  {r.name}
                </span>
              ),
              sortValue: (r) => r.name,
            },
            {
              key: "status",
              label: "Status",
              width: 110,
              render: (r) => <StatusBadge status={r.status || "ACTIVE"} />,
            },
            {
              key: "department",
              label: "Department",
              width: 160,
              render: (r) => r.department || "General",
              sortValue: (r) => r.department || "",
            },
            {
              key: "role",
              label: "Role",
              width: 120,
              render: (r) => <StatusBadge status={r.role} />,
              sortValue: (r) => r.role,
            },
            {
              key: "defaultShift",
              label: "Shift",
              width: 100,
              render: (r) => r.defaultShift || "—",
              defaultHidden: true,
            },
            {
              key: "joiningDate",
              label: "Joined",
              width: 110,
              render: (r) => r.joiningDate || "—",
              sortValue: (r) => r.joiningDate || "",
              defaultHidden: true,
            },
            {
              key: "dailyWage",
              label: "Daily Wage",
              render: (r, cur) =>
                `${cur}${(r.dailyWage || 0).toLocaleString()} / Day`,
              sortValue: (r) => r.dailyWage || 0,
              align: "right",
            },
          ];
          const empTags: TagFilter[] = [
            {
              key: "active",
              label: "Active",
              match: (r) => r.status === "ACTIVE",
            },
            {
              key: "inactive",
              label: "Inactive",
              match: (r) => r.status === "INACTIVE",
            },
            {
              key: "on_leave",
              label: "On leave",
              match: (r) => r.status === "ON_LEAVE",
            },
          ];
          const empBulk: BulkAction[] = [
            {
              key: "delete",
              label: "Delete",
              icon: Trash2,
              danger: true,
              onClick: (ids) => {
                // BUG 8 FIX: block self-delete and last-admin deletion
                const adminIds = team.filter(t => t.role === 'ADMIN' && !t.deleted).map(t => t.id);
                ids.forEach((id) => {
                  if (id === currentUserId) { return; } // cannot delete self
                  if (adminIds.length <= 1 && adminIds.includes(id)) { return; } // last admin guard
                  onDelete(id);
                });
              },
            },
          ];
          return (
            <ListPage<TeamMember>
              doctype="Employee"
              rows={team}
              columns={empCols}
              onRowClick={(m) => openForm(m)}
              onNew={() => openForm()}
              newLabel="New Employee"
              searchFields={["id", "name", "department", "email", "phone"]}
              tagFilters={empTags}
              bulkActions={empBulk}
              currency={currency}
              emptyIcon={Users}
              emptyMessage="No employees found"
            />
          );
        })()
      ) : (
        <div className="flex flex-col h-full animate-fade-in">
          {/* ─── FORM HEADER ─── */}
          <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
            <div className="flex justify-between items-center h-8">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewMode("LIST")}
                  className="h-7 w-7 flex items-center justify-center rounded hover:bg-[#f4f5f6] text-[#525c66] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight truncate max-w-lg">
                  {formData.id ? formData.name : "New Employee"}
                </span>
                {formData.id && getStatusBadge(formData.status || "ACTIVE")}
              </div>
              <div className="flex items-center gap-2">
                {/* BUG 8 FIX: hide delete for self and last admin */}
                {formData.id && onDelete &&
                  formData.id !== currentUserId &&
                  !(team.filter(t => t.role === 'ADMIN' && !t.deleted).length <= 1 && formData.role === 'ADMIN') && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onDelete(formData.id!);
                      setViewMode("LIST");
                    }}
                    className="h-7 px-3 flex items-center gap-1.5 bg-white hover:bg-[#fef2f2] hover:text-[#ef4444] border border-[#d1d8dd] hover:border-[#ef4444] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewMode("LIST")}
                  className="h-7 px-3 flex items-center gap-1.5 bg-white hover:bg-[#f4f5f6] border border-[#d1d8dd] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isUploading}
                  className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50 disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Save
                </button>
              </div>
            </div>

            {formData.id && (
              <div className="flex justify-between items-center mt-3 h-8 text-[13px]">
                <div className="flex items-center gap-4 text-[#1c2126] font-medium">
                  <a
                    onClick={() => setActiveTab("DETAILS")}
                    className={`hover:underline cursor-pointer opacity-80 border-b-2 pb-1 transition-all ${activeTab === "DETAILS" ? "border-[#1c2126] opacity-100 font-bold" : "border-transparent hover:border-[#1c2126]"}`}
                  >
                    Details
                  </a>
                  <a
                    onClick={() => setActiveTab("ATTENDANCE")}
                    className={`hover:underline cursor-pointer opacity-80 border-b-2 pb-1 transition-all ${activeTab === "ATTENDANCE" ? "border-[#1c2126] opacity-100 font-bold" : "border-transparent hover:border-[#1c2126]"}`}
                  >
                    Attendance
                  </a>
                  <a
                    onClick={() => setActiveTab("PAYROLL")}
                    className={`hover:underline cursor-pointer opacity-80 border-b-2 pb-1 transition-all ${activeTab === "PAYROLL" ? "border-[#1c2126] opacity-100 font-bold" : "border-transparent hover:border-[#1c2126]"}`}
                  >
                    Payroll
                  </a>
                </div>
                <div className="flex items-center gap-1">
                  <button className="text-[#525c66] hover:text-[#1c2126] font-semibold px-2 py-1 rounded hover:bg-[#f4f5f6] transition-colors">
                    Print
                  </button>
                  <button className="text-[#525c66] hover:text-[#1c2126] font-semibold px-2 py-1 rounded hover:bg-[#f4f5f6] transition-colors">
                    Menu
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ─── FORM BODY ─── */}
          <div className="flex-1 overflow-auto p-5 pb-16 flex justify-center">
            {activeTab === "DETAILS" && (
              <form
                onSubmit={handleSave}
                className="w-full max-w-[850px] space-y-4"
              >
                {/* Identity Card */}
                <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                  <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">
                    Identity
                  </h4>
                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Image Upload */}
                    <div className="w-32 flex flex-col gap-2 shrink-0">
                      <label className="text-xs text-[#525c66]">
                        Profile Image
                      </label>
                      <div className="w-32 h-32 rounded border border-[#d1d8dd] bg-[#fdfdfd] flex items-center justify-center relative overflow-hidden group">
                        {formData.profileImageUrl ? (
                          <img
                            src={formData.profileImageUrl}
                            className="w-full h-full object-cover"
                            alt="Profile"
                          />
                        ) : (
                          <UserCircle className="w-12 h-12 text-[#d1d8dd]" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none text-white font-medium text-xs">
                          Upload
                        </div>
                        <input
                          type="file"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          accept="image/*"
                          onChange={handleFileUpload}
                          disabled={isUploading}
                        />
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                      <div className="space-y-5">
                        <div className="space-y-1.5 flex flex-col">
                          <label className="text-xs text-[#525c66]">
                            Full Name{" "}
                            <span className="text-[#ef4444] ml-0.5">*</span>
                          </label>
                          <input
                            value={formData.name || ""}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                            className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium"
                          />
                        </div>
                        <div className="space-y-1.5 flex flex-col">
                          <label className="text-xs text-[#525c66]">
                            Contact Number
                          </label>
                          <input
                            value={formData.phone || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                phone: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                            placeholder="+91"
                          />
                        </div>
                        <div className="space-y-1.5 flex flex-col">
                          <label className="text-xs text-[#525c66]">
                            Email Address
                          </label>
                          <input
                            value={formData.email || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                email: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                            placeholder="user@example.com"
                          />
                        </div>
                        <div className="space-y-1.5 flex flex-col">
                          <label className="text-xs text-[#525c66]">
                            Username (Login)
                          </label>
                          <input
                            value={formData.username || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                username: e.target.value
                                  .toLowerCase()
                                  .replace(/\s+/g, ""),
                              })
                            }
                            className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium"
                            placeholder="username"
                          />
                        </div>
                        <div className="space-y-1.5 flex flex-col">
                          <label className="text-xs text-[#525c66]">
                            Password (Login){!formData.id && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <input
                            type="password"
                            autoComplete="new-password"
                            value={formData.password || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                password: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                            placeholder="Enter login password"
                          />
                        </div>
                      </div>
                      <div className="space-y-5">
                        <div className="space-y-1.5 flex flex-col">
                          <label className="text-xs text-[#525c66]">
                            Status
                          </label>
                          <div className="relative">
                            <select
                              value={formData.status || "ACTIVE"}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  status: e.target.value as any,
                                })
                              }
                              className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium appearance-none"
                            >
                              <option value="ACTIVE">Active</option>
                              <option value="INACTIVE">Inactive</option>
                              <option value="ON_LEAVE">On Leave</option>
                            </select>
                            <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Job Details Card */}
                <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                  <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">
                    Employment Details
                  </h4>
                  <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                    <div className="space-y-5">
                      <div className="space-y-1.5 flex flex-col">
                        <label className="text-xs text-[#525c66]">Department</label>
                        <div className="relative">
                          <select
                            value={formData.department || "GENERAL"}
                            onChange={(e) =>
                              setFormData(prev => ({ ...prev, department: e.target.value, deptFields: {} }))
                            }
                            className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] appearance-none"
                          >
                            <option value="GENERAL">General / Admin</option>
                            <option value="CUTTING">Cutting</option>
                            <option value="STITCHING">Stitching</option>
                            <option value="EMBROIDERY">Embroidery</option>
                            <option value="PRINTING">Printing</option>
                            <option value="DYEING">Dyeing</option>
                            <option value="WASHING">Washing</option>
                            <option value="FINISHING">Finishing</option>
                            <option value="PACKING">Packing</option>
                            <option value="DISPATCH">Dispatch</option>
                            <option value="ACCOUNTS">Accounts</option>
                            <option value="PURCHASE">Purchase</option>
                            <option value="SALES">Sales</option>
                            <option value="QC">Quality Control</option>
                            <option value="STORES">Stores / Inventory</option>
                          </select>
                          <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90" />
                        </div>
                      </div>
                      <div className="space-y-1.5 flex flex-col">
                        <label className="text-xs text-[#525c66]">Role / Designation</label>
                        <div className="relative">
                          <select
                            value={formData.role || "WORKER"}
                            onChange={(e) =>
                              setFormData({ ...formData, role: e.target.value as any })
                            }
                            className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] appearance-none"
                          >
                            <option value="WORKER">Production Worker</option>
                            <option value="SUPERVISOR">Supervisor</option>
                            <option value="MANAGER">Unit Manager</option>
                            <option value="ACCOUNTANT">Accountant</option>
                            <option value="SALES">Sales Agent</option>
                            <option value="ADMIN">Administrator</option>
                          </select>
                          <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90" />
                        </div>
                      </div>
                      <div className="space-y-1.5 flex flex-col">
                        <label className="text-xs text-[#525c66]">Joining Date</label>
                        <input
                          type="date"
                          value={formData.joiningDate || ""}
                          onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                          className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                        />
                      </div>
                    </div>
                    <div className="space-y-5">
                      <div className="space-y-1.5 flex flex-col">
                        <label className="text-xs text-[#525c66]">Default Shift</label>
                        <div className="relative">
                          <select
                            value={formData.defaultShift || "GENERAL"}
                            onChange={(e) =>
                              setFormData({ ...formData, defaultShift: e.target.value as any })
                            }
                            className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] appearance-none"
                          >
                            <option value="GENERAL">General (09:00 - 18:00)</option>
                            <option value="MORNING">Morning (06:00 - 14:00)</option>
                            <option value="EVENING">Evening (14:00 - 22:00)</option>
                            <option value="NIGHT">Night (22:00 - 06:00)</option>
                          </select>
                          <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90" />
                        </div>
                      </div>
                      <div className="space-y-1.5 flex flex-col">
                        <label className="text-xs text-[#525c66]">Experience (Years)</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.experienceYears || ""}
                          onChange={(e) => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
                          className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] tabular-nums"
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1.5 flex flex-col">
                        <label className="text-xs text-[#525c66]">Blood Group</label>
                        <div className="relative">
                          <select
                            value={formData.bloodGroup || ""}
                            onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                            className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] appearance-none"
                          >
                            <option value="">— Select —</option>
                            {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(bg => (
                              <option key={bg} value={bg}>{bg}</option>
                            ))}
                          </select>
                          <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Department-Wise Fields Card */}
                {formData.department && formData.department !== "GENERAL" && (() => {
                  const dept = formData.department;
                  const df = (formData.deptFields || {}) as Record<string, any>;
                  const setDF = (key: string, val: any) =>
                    setFormData(prev => ({ ...prev, deptFields: { ...(prev.deptFields || {}), [key]: val } }));
                  const inputCls = "w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]";
                  const selectCls = "w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] appearance-none";
                  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
                    <div className="space-y-1.5 flex flex-col">
                      <label className="text-xs text-[#525c66]">{label}</label>
                      {children}
                    </div>
                  );
                  const SelectWrap = ({ children }: { children: React.ReactNode }) => (
                    <div className="relative">{children}<ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90" /></div>
                  );

                  const deptLabel: Record<string, string> = {
                    CUTTING:"Cutting", STITCHING:"Stitching", EMBROIDERY:"Embroidery",
                    PRINTING:"Printing", DYEING:"Dyeing", WASHING:"Washing",
                    FINISHING:"Finishing", PACKING:"Packing", DISPATCH:"Dispatch",
                    ACCOUNTS:"Accounts", PURCHASE:"Purchase", SALES:"Sales",
                    QC:"Quality Control", STORES:"Stores / Inventory",
                  };

                  return (
                    <div className="bg-white border border-[#2490ef]/30 rounded shadow-sm p-6 text-[13px]">
                      <h4 className="font-semibold text-sm mb-5 text-[#2490ef] border-b border-[#2490ef]/20 pb-2 flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5" />
                        {deptLabel[dept] || dept} — Department Details
                      </h4>
                      <div className="grid grid-cols-2 gap-x-16 gap-y-5">

                        {/* CUTTING */}
                        {dept === "CUTTING" && (<>
                          <Field label="Machine Type">
                            <SelectWrap><select value={df.machineType||""} onChange={e=>setDF("machineType",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="STRAIGHT_KNIFE">Straight Knife</option>
                              <option value="ROUND_KNIFE">Round Knife</option>
                              <option value="BAND_KNIFE">Band Knife</option>
                              <option value="DIE_CUT">Die Cutting</option>
                              <option value="MANUAL">Manual / Scissors</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Fabric Types Handled">
                            <input value={df.fabricTypes||""} onChange={e=>setDF("fabricTypes",e.target.value)} className={inputCls} placeholder="e.g. Woven, Knit, Denim" />
                          </Field>
                          <Field label="Avg. Layers Per Lay">
                            <input type="number" value={df.avgLayers||""} onChange={e=>setDF("avgLayers",e.target.value)} className={inputCls} placeholder="e.g. 50" />
                          </Field>
                          <Field label="Marker Reading Skill">
                            <SelectWrap><select value={df.markerSkill||""} onChange={e=>setDF("markerSkill",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="BASIC">Basic</option>
                              <option value="CAD_MARKER">CAD Marker Reading</option>
                              <option value="MANUAL_MARKER">Manual Marker</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Safety Training Done">
                            <SelectWrap><select value={df.safetyTraining||""} onChange={e=>setDF("safetyTraining",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Yes</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Target Pieces/Day">
                            <input type="number" value={df.targetPieces||""} onChange={e=>setDF("targetPieces",e.target.value)} className={inputCls} placeholder="e.g. 500" />
                          </Field>
                        </>)}

                        {/* STITCHING */}
                        {dept === "STITCHING" && (<>
                          <Field label="Machine Type">
                            <SelectWrap><select value={df.machineType||""} onChange={e=>setDF("machineType",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="SINGLE_NEEDLE">Single Needle Lock Stitch</option>
                              <option value="DOUBLE_NEEDLE">Double Needle</option>
                              <option value="OVERLOCK">Overlock / Serger</option>
                              <option value="FLATLOCK">Flatlock</option>
                              <option value="BARTACK">Bartack</option>
                              <option value="BUTTON_HOLE">Button Hole</option>
                              <option value="BUTTON_ATTACH">Button Attach</option>
                              <option value="KANSAI">Kansai (Multi Needle)</option>
                              <option value="INTERLOCK">Interlock</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Operation Specialization">
                            <input value={df.operation||""} onChange={e=>setDF("operation",e.target.value)} className={inputCls} placeholder="e.g. Side Seam, Collar Attach" />
                          </Field>
                          <Field label="Target Pieces/Hour">
                            <input type="number" value={df.targetPieces||""} onChange={e=>setDF("targetPieces",e.target.value)} className={inputCls} placeholder="e.g. 60" />
                          </Field>
                          <Field label="Efficiency (%)">
                            <input type="number" value={df.efficiency||""} onChange={e=>setDF("efficiency",e.target.value)} className={inputCls} placeholder="e.g. 85" />
                          </Field>
                          <Field label="Can Handle Multiple Machines">
                            <SelectWrap><select value={df.multiMachine||""} onChange={e=>setDF("multiMachine",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Yes</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Stitch Rate (SPM)">
                            <input type="number" value={df.stitchRate||""} onChange={e=>setDF("stitchRate",e.target.value)} className={inputCls} placeholder="e.g. 5000" />
                          </Field>
                        </>)}

                        {/* EMBROIDERY */}
                        {dept === "EMBROIDERY" && (<>
                          <Field label="Machine Type">
                            <SelectWrap><select value={df.machineType||""} onChange={e=>setDF("machineType",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="SINGLE_HEAD">Single Head</option>
                              <option value="MULTI_HEAD">Multi Head</option>
                              <option value="MANUAL_HAND">Hand Embroidery</option>
                              <option value="SEQUIN">Sequin Machine</option>
                              <option value="CHENILLE">Chenille</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Design Software">
                            <input value={df.software||""} onChange={e=>setDF("software",e.target.value)} className={inputCls} placeholder="e.g. Wilcom, Brother PE-Design" />
                          </Field>
                          <Field label="Max Head Count Operated">
                            <input type="number" value={df.maxHeads||""} onChange={e=>setDF("maxHeads",e.target.value)} className={inputCls} placeholder="e.g. 12" />
                          </Field>
                          <Field label="Specialty (Zari / Aari / Thread)">
                            <input value={df.specialty||""} onChange={e=>setDF("specialty",e.target.value)} className={inputCls} placeholder="e.g. Zari, Aari, Thread" />
                          </Field>
                          <Field label="Digitizing Skill">
                            <SelectWrap><select value={df.digitizing||""} onChange={e=>setDF("digitizing",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Can Digitize</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Target Pieces/Day">
                            <input type="number" value={df.targetPieces||""} onChange={e=>setDF("targetPieces",e.target.value)} className={inputCls} placeholder="e.g. 200" />
                          </Field>
                        </>)}

                        {/* PRINTING */}
                        {dept === "PRINTING" && (<>
                          <Field label="Print Type">
                            <SelectWrap><select value={df.printType||""} onChange={e=>setDF("printType",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="SCREEN">Screen Printing</option>
                              <option value="DIGITAL">Digital Printing</option>
                              <option value="SUBLIMATION">Sublimation</option>
                              <option value="PIGMENT">Pigment</option>
                              <option value="DISCHARGE">Discharge</option>
                              <option value="HEAT_TRANSFER">Heat Transfer</option>
                              <option value="BLOCK">Block Printing</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Screen Count Managed">
                            <input type="number" value={df.screenCount||""} onChange={e=>setDF("screenCount",e.target.value)} className={inputCls} placeholder="e.g. 8" />
                          </Field>
                          <Field label="Color Mixing Skill">
                            <SelectWrap><select value={df.colorMix||""} onChange={e=>setDF("colorMix",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="BASIC">Basic</option>
                              <option value="ADVANCED">Advanced</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Paste Preparation">
                            <SelectWrap><select value={df.pastePrep||""} onChange={e=>setDF("pastePrep",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Can Prepare Paste</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Target Pieces/Day">
                            <input type="number" value={df.targetPieces||""} onChange={e=>setDF("targetPieces",e.target.value)} className={inputCls} placeholder="e.g. 1000" />
                          </Field>
                          <Field label="Machine Name / Model">
                            <input value={df.machineName||""} onChange={e=>setDF("machineName",e.target.value)} className={inputCls} placeholder="e.g. M&R Carousel" />
                          </Field>
                        </>)}

                        {/* DYEING */}
                        {dept === "DYEING" && (<>
                          <Field label="Dye Type Expertise">
                            <input value={df.dyeType||""} onChange={e=>setDF("dyeType",e.target.value)} className={inputCls} placeholder="e.g. Reactive, Acid, Vat, Disperse" />
                          </Field>
                          <Field label="Machine Operated">
                            <SelectWrap><select value={df.machine||""} onChange={e=>setDF("machine",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="JET">Jet Dyeing</option>
                              <option value="JIGGER">Jigger</option>
                              <option value="PADDING">Padding Mangle</option>
                              <option value="BEAM">Beam Dyeing</option>
                              <option value="HANK">Hank Dyeing</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Recipe Formulation Skill">
                            <SelectWrap><select value={df.recipeSkill||""} onChange={e=>setDF("recipeSkill",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Can Formulate</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Chemical Handling Cert">
                            <SelectWrap><select value={df.chemCert||""} onChange={e=>setDF("chemCert",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Certified</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Color Matching Skill">
                            <SelectWrap><select value={df.colorMatch||""} onChange={e=>setDF("colorMatch",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="VISUAL">Visual Only</option>
                              <option value="SPECTROPHOTOMETER">Spectrophotometer</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Lab Dip Experience">
                            <SelectWrap><select value={df.labDip||""} onChange={e=>setDF("labDip",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Yes</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                        </>)}

                        {/* WASHING */}
                        {dept === "WASHING" && (<>
                          <Field label="Wash Type Expertise">
                            <input value={df.washType||""} onChange={e=>setDF("washType",e.target.value)} className={inputCls} placeholder="e.g. Stone, Enzyme, Acid, Bleach" />
                          </Field>
                          <Field label="Machine Operated">
                            <SelectWrap><select value={df.machine||""} onChange={e=>setDF("machine",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="FRONT_LOAD">Front Load Washer</option>
                              <option value="TOP_LOAD">Top Load</option>
                              <option value="GARMENT_WASHER">Industrial Garment Washer</option>
                              <option value="TUMBLE_DRYER">Tumble Dryer</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Chemical Handling Cert">
                            <SelectWrap><select value={df.chemCert||""} onChange={e=>setDF("chemCert",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Certified</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Drying Method">
                            <SelectWrap><select value={df.dryMethod||""} onChange={e=>setDF("dryMethod",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="TUMBLE">Tumble Dry</option>
                              <option value="FLAT">Flat Dry</option>
                              <option value="HANG">Hang Dry</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Target KG/Day">
                            <input type="number" value={df.targetKg||""} onChange={e=>setDF("targetKg",e.target.value)} className={inputCls} placeholder="e.g. 300" />
                          </Field>
                        </>)}

                        {/* FINISHING */}
                        {dept === "FINISHING" && (<>
                          <Field label="Finishing Operations">
                            <input value={df.operations||""} onChange={e=>setDF("operations",e.target.value)} className={inputCls} placeholder="e.g. Ironing, Thread Cutting, Tagging" />
                          </Field>
                          <Field label="Iron Type">
                            <SelectWrap><select value={df.ironType||""} onChange={e=>setDF("ironType",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="STEAM">Steam Iron</option>
                              <option value="DRY">Dry Iron</option>
                              <option value="BOILER">Boiler Iron</option>
                              <option value="TUNNEL">Tunnel Finisher</option>
                              <option value="FORM_FINISHER">Form Finisher</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Target Pieces/Day">
                            <input type="number" value={df.targetPieces||""} onChange={e=>setDF("targetPieces",e.target.value)} className={inputCls} placeholder="e.g. 400" />
                          </Field>
                          <Field label="Stain Removal Skill">
                            <SelectWrap><select value={df.stainRemoval||""} onChange={e=>setDF("stainRemoval",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Yes</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Measurement Checking">
                            <SelectWrap><select value={df.measurement||""} onChange={e=>setDF("measurement",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Can Check Measurements</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                        </>)}

                        {/* PACKING */}
                        {dept === "PACKING" && (<>
                          <Field label="Packing Type">
                            <SelectWrap><select value={df.packType||""} onChange={e=>setDF("packType",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="POLY_BAG">Poly Bag Packing</option>
                              <option value="HANGER">Hanger Packing</option>
                              <option value="BOX">Box Packing</option>
                              <option value="FLAT_FOLD">Flat Fold</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Barcode / Label Scanning">
                            <SelectWrap><select value={df.barcodeSkill||""} onChange={e=>setDF("barcodeSkill",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Can Operate Scanner</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Target Pieces/Day">
                            <input type="number" value={df.targetPieces||""} onChange={e=>setDF("targetPieces",e.target.value)} className={inputCls} placeholder="e.g. 600" />
                          </Field>
                          <Field label="Carton Packing">
                            <SelectWrap><select value={df.cartonPack||""} onChange={e=>setDF("cartonPack",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Yes</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Export Compliance Knowledge">
                            <SelectWrap><select value={df.exportKnowledge||""} onChange={e=>setDF("exportKnowledge",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Yes</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                        </>)}

                        {/* DISPATCH */}
                        {dept === "DISPATCH" && (<>
                          <Field label="Vehicle License Type">
                            <SelectWrap><select value={df.licenseType||""} onChange={e=>setDF("licenseType",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="LMV">LMV (Light Motor Vehicle)</option>
                              <option value="HMV">HMV (Heavy Motor Vehicle)</option>
                              <option value="NONE">No License</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Vehicle Types Driven">
                            <input value={df.vehicleTypes||""} onChange={e=>setDF("vehicleTypes",e.target.value)} className={inputCls} placeholder="e.g. Tempo, Mini Truck" />
                          </Field>
                          <Field label="City Knowledge">
                            <input value={df.cityKnowledge||""} onChange={e=>setDF("cityKnowledge",e.target.value)} className={inputCls} placeholder="e.g. Jaipur, Delhi, Mumbai" />
                          </Field>
                          <Field label="Challan / E-Way Bill Knowledge">
                            <SelectWrap><select value={df.ewayKnowledge||""} onChange={e=>setDF("ewayKnowledge",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Yes</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Handling Fragile / Export Goods">
                            <SelectWrap><select value={df.fragileHandling||""} onChange={e=>setDF("fragileHandling",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Yes</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                        </>)}

                        {/* ACCOUNTS */}
                        {dept === "ACCOUNTS" && (<>
                          <Field label="Qualification">
                            <SelectWrap><select value={df.qualification||""} onChange={e=>setDF("qualification",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="B_COM">B.Com</option>
                              <option value="M_COM">M.Com</option>
                              <option value="CA_INTER">CA Inter</option>
                              <option value="CA">CA (Chartered Accountant)</option>
                              <option value="CMA">CMA</option>
                              <option value="OTHER">Other</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Tally Knowledge">
                            <SelectWrap><select value={df.tallyKnowledge||""} onChange={e=>setDF("tallyKnowledge",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="NONE">None</option>
                              <option value="BASIC">Basic</option>
                              <option value="ADVANCED">Advanced (TDL / Reports)</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="GST Filing Experience">
                            <SelectWrap><select value={df.gstExp||""} onChange={e=>setDF("gstExp",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Yes — GSTR-1/3B/2A</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="TDS / TCS Handling">
                            <SelectWrap><select value={df.tds||""} onChange={e=>setDF("tds",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Yes</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Bank Reconciliation">
                            <SelectWrap><select value={df.bankRecon||""} onChange={e=>setDF("bankRecon",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Yes</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Payroll Processing">
                            <SelectWrap><select value={df.payroll||""} onChange={e=>setDF("payroll",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Yes</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                        </>)}

                        {/* PURCHASE */}
                        {dept === "PURCHASE" && (<>
                          <Field label="Fabric / Raw Material Knowledge">
                            <SelectWrap><select value={df.fabricKnowledge||""} onChange={e=>setDF("fabricKnowledge",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Yes</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Vendor Negotiation Skill">
                            <SelectWrap><select value={df.negotiation||""} onChange={e=>setDF("negotiation",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="BASIC">Basic</option>
                              <option value="ADVANCED">Advanced</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="PO / Purchase Indent Experience">
                            <SelectWrap><select value={df.poExp||""} onChange={e=>setDF("poExp",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Yes</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Markets Known">
                            <input value={df.marketsKnown||""} onChange={e=>setDF("marketsKnown",e.target.value)} className={inputCls} placeholder="e.g. Surat, Bhilwara, Mumbai" />
                          </Field>
                        </>)}

                        {/* SALES */}
                        {dept === "SALES" && (<>
                          <Field label="Sales Channel">
                            <SelectWrap><select value={df.salesChannel||""} onChange={e=>setDF("salesChannel",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="B2B">B2B (Wholesale)</option>
                              <option value="B2C">B2C (Retail)</option>
                              <option value="EXPORT">Export</option>
                              <option value="ONLINE">Online / E-Commerce</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Languages for Sales">
                            <input value={df.salesLanguages||""} onChange={e=>setDF("salesLanguages",e.target.value)} className={inputCls} placeholder="e.g. Hindi, English, Marwari" />
                          </Field>
                          <Field label="Target Markets / Cities">
                            <input value={df.targetMarkets||""} onChange={e=>setDF("targetMarkets",e.target.value)} className={inputCls} placeholder="e.g. Delhi, Kolkata, Ahmedabad" />
                          </Field>
                          <Field label="Monthly Target (₹)">
                            <input type="number" value={df.monthlyTarget||""} onChange={e=>setDF("monthlyTarget",e.target.value)} className={inputCls} placeholder="e.g. 500000" />
                          </Field>
                          <Field label="Existing Buyer Network">
                            <SelectWrap><select value={df.buyerNetwork||""} onChange={e=>setDF("buyerNetwork",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Has Contacts</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                        </>)}

                        {/* QC */}
                        {dept === "QC" && (<>
                          <Field label="QC Stage Expertise">
                            <input value={df.qcStage||""} onChange={e=>setDF("qcStage",e.target.value)} className={inputCls} placeholder="e.g. Inline, End-line, Pre-shipment" />
                          </Field>
                          <Field label="AQL Standard Known">
                            <SelectWrap><select value={df.aql||""} onChange={e=>setDF("aql",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="AQL_2_5">AQL 2.5</option>
                              <option value="AQL_4_0">AQL 4.0</option>
                              <option value="AQL_1_0">AQL 1.0</option>
                              <option value="NONE">Not Familiar</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Measurement Tool Skill">
                            <input value={df.measureTools||""} onChange={e=>setDF("measureTools",e.target.value)} className={inputCls} placeholder="e.g. Tape, GSM Cutter, Tensile" />
                          </Field>
                          <Field label="Defect Coding Knowledge">
                            <SelectWrap><select value={df.defectCode||""} onChange={e=>setDF("defectCode",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Yes</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Fabric Testing Experience">
                            <SelectWrap><select value={df.fabricTest||""} onChange={e=>setDF("fabricTest",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Yes</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Audit Report Writing">
                            <SelectWrap><select value={df.auditReport||""} onChange={e=>setDF("auditReport",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Yes</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                        </>)}

                        {/* STORES */}
                        {dept === "STORES" && (<>
                          <Field label="Inventory Software">
                            <input value={df.software||""} onChange={e=>setDF("software",e.target.value)} className={inputCls} placeholder="e.g. Tally, TexFlow, Excel" />
                          </Field>
                          <Field label="Barcode / RFID Skill">
                            <SelectWrap><select value={df.barcodeSkill||""} onChange={e=>setDF("barcodeSkill",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Yes</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Material Categories Handled">
                            <input value={df.materialCats||""} onChange={e=>setDF("materialCats",e.target.value)} className={inputCls} placeholder="e.g. Fabric, Accessories, Dyes" />
                          </Field>
                          <Field label="Bin / Rack Management">
                            <SelectWrap><select value={df.binManagement||""} onChange={e=>setDF("binManagement",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Yes</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                          <Field label="Physical Audit Experience">
                            <SelectWrap><select value={df.auditExp||""} onChange={e=>setDF("auditExp",e.target.value)} className={selectCls}>
                              <option value="">— Select —</option>
                              <option value="YES">Yes</option><option value="NO">No</option>
                            </select></SelectWrap>
                          </Field>
                        </>)}

                      </div>
                    </div>
                  );
                })()}

                {/* Salary Card */}
                <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                  <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">
                    Salary Details
                  </h4>
                  <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                    <div className="space-y-5">
                      <div className="space-y-1.5 flex flex-col">
                        <label className="text-xs text-[#525c66]">
                          Daily Wage Structure
                        </label>
                        <input
                          type="number"
                          value={formData.dailyWage || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              dailyWage: Number(e.target.value),
                            })
                          }
                          className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] tabular-nums"
                          placeholder={`e.g. ${currency}500`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button type="submit" className="hidden">
                  Submit
                </button>
              </form>
            )}

            {(activeTab === "ATTENDANCE" || activeTab === "PAYROLL") && (
              <div className="w-full h-full pb-8">
                <Attendance
                  key={activeTab}
                  team={[formData as TeamMember]}
                  records={props.records || []}
                  loans={props.loans || []}
                  leaves={props.leaves || []}
                  payrollAdjustments={props.payrollAdjustments}
                  onSaveRecord={props.onSaveRecord!}
                  onSaveManyRecords={props.onSaveManyRecords}
                  onUpdateTeamMember={props.onUpdateTeamMember!}
                  onAddLoan={props.onAddLoan}
                  onDeleteLoan={props.onDeleteLoan}
                  onAddLeave={props.onAddLeave}
                  onUpdateLeave={props.onUpdateLeave}
                  onUpdatePayrollAdjustment={props.onUpdatePayrollAdjustment}
                  currency={currency}
                  companyInfo={props.companyInfo}
                  initialTab={
                    activeTab === "ATTENDANCE" ? "MONTHLY" : "PAYROLL"
                  }
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
