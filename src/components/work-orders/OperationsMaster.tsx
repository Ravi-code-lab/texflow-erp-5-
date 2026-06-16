import React, { useState } from "react";
import { uuidShort } from "../../utils/uuid";
import { Plus, Edit2, Trash2, Save, X, Hammer, Search, Settings2 } from "lucide-react";
import { toast, useConfirm } from "../../utils/toast";

interface Operation {
  id: string;
  name: string;
  workstation: string;
  defaultTime: string;
  defaultRate: number;
  description: string;
  taskCategory: string;
  isActive: boolean;
}

const TASK_CATEGORIES = ["Cutting", "Stitching", "Embroidery", "Printing", "Washing", "Finishing", "Packing", "Other"];

const DEFAULT_OPERATIONS: Operation[] = [
  { id: "OP-001", name: "Fabric Panel Cutting", workstation: "Cutting Table A", defaultTime: "10 Mins", defaultRate: 120, description: "Cut fabric panels as per marker plan", taskCategory: "Cutting", isActive: true },
  { id: "OP-002", name: "Collar Stitching", workstation: "High-Speed Stitch Line", defaultTime: "20 Mins", defaultRate: 180, description: "Stitch collar panels", taskCategory: "Stitching", isActive: true },
  { id: "OP-003", name: "Sleeve Attachment", workstation: "High-Speed Stitch Line", defaultTime: "15 Mins", defaultRate: 160, description: "Attach sleeves to body", taskCategory: "Stitching", isActive: true },
  { id: "OP-004", name: "Zari Embroidery Work", workstation: "Zari Computer Deck", defaultTime: "30 Mins", defaultRate: 250, description: "Computerized zari embroidery", taskCategory: "Embroidery", isActive: true },
  { id: "OP-005", name: "Screen Print Application", workstation: "Indigo Block Printing Vat", defaultTime: "25 Mins", defaultRate: 200, description: "Screen printing on panels", taskCategory: "Printing", isActive: true },
  { id: "OP-006", name: "Enzyme Wash", workstation: "Washing Drum Line B", defaultTime: "45 Mins", defaultRate: 150, description: "Enzyme washing for soft finish", taskCategory: "Washing", isActive: true },
  { id: "OP-007", name: "Steam Pressing & QC", workstation: "Finishing Steam Table", defaultTime: "12 Mins", defaultRate: 100, description: "Press and quality check", taskCategory: "Finishing", isActive: true },
  { id: "OP-008", name: "Poly Bag Packing", workstation: "Packing Station C", defaultTime: "5 Mins", defaultRate: 80, description: "Individual poly bag packing with tag", taskCategory: "Packing", isActive: true },
];

const TASK_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  Cutting:    { color: "text-rose-700",    bg: "bg-rose-50",    border: "border-rose-200",   icon: "✂️" },
  Stitching:  { color: "text-indigo-700",  bg: "bg-indigo-50",  border: "border-indigo-200", icon: "🧵" },
  Embroidery: { color: "text-violet-700",  bg: "bg-violet-50",  border: "border-violet-200", icon: "🌸" },
  Printing:   { color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200",  icon: "🖨️" },
  Washing:    { color: "text-cyan-700",    bg: "bg-cyan-50",    border: "border-cyan-200",   icon: "🫧" },
  Finishing:  { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: "✨" },
  Packing:    { color: "text-sky-700",     bg: "bg-sky-50",     border: "border-sky-200",    icon: "📦" },
  Other:      { color: "text-slate-600",   bg: "bg-slate-100",  border: "border-slate-200",  icon: "⚙️" },
};

const emptyOp = (): Operation => ({
  id: `OP-${uuidShort(8)}`,
  name: "",
  workstation: "",
  defaultTime: "15 Mins",
  defaultRate: 0,
  description: "",
  taskCategory: "Stitching",
  isActive: true,
});

export default function OperationsMaster() {
  const { confirm, ConfirmModal } = useConfirm();
  const [operations, setOperations] = useState<Operation[]>(DEFAULT_OPERATIONS);
  const [editing, setEditing] = useState<Operation | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("ALL");

  const filtered = operations.filter((op) => {
    if (filterCat !== "ALL" && op.taskCategory !== filterCat) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!op.name.toLowerCase().includes(q) && !op.workstation.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleSave = () => {
    if (!editing || !editing.name.trim()) return;
    if (isNew) {
      setOperations((prev) => [...prev, editing]);
    } else {
      setOperations((prev) => prev.map((o) => (o.id === editing.id ? editing : o)));
    }
    setEditing(null);
    setIsNew(false);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: "Delete operation template?", message: "This cannot be undone." });
    if (!ok) return;
    setOperations((prev) => prev.filter((o) => o.id !== id));
  };

  const handleToggle = (id: string) => {
    setOperations((prev) => prev.map((o) => o.id === id ? { ...o, isActive: !o.isActive } : o));
  };

  if (editing) {
    return (
      <div className="flex flex-col h-full bg-slate-50 min-h-screen">
        <div className="flex-none bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => { setEditing(null); setIsNew(false); }} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5 text-slate-500" />
            </button>
            <h2 className="text-xl font-bold text-slate-800">{isNew ? "New Operation" : "Edit Operation"}</h2>
          </div>
          <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm">
            <Save className="w-4 h-4" /> Save Operation
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Operation Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Operation Name *</label>
                  <input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Collar Stitching"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Task Category</label>
                  <select
                    value={editing.taskCategory}
                    onChange={(e) => setEditing({ ...editing, taskCategory: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    {TASK_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Workstation</label>
                  <input
                    value={editing.workstation}
                    onChange={(e) => setEditing({ ...editing, workstation: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. High-Speed Stitch Line"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Default Time</label>
                  <input
                    value={editing.defaultTime}
                    onChange={(e) => setEditing({ ...editing, defaultTime: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. 15 Mins"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Default Rate (₹)</label>
                  <input
                    type="number"
                    value={editing.defaultRate}
                    onChange={(e) => setEditing({ ...editing, defaultRate: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-lg p-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                    placeholder="0"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                  <textarea
                    value={editing.description}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    rows={3}
                    className="w-full border border-slate-300 rounded-lg p-3 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                    placeholder="Brief description of this operation..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                  <select
                    value={editing.isActive ? "ACTIVE" : "DISABLED"}
                    onChange={(e) => setEditing({ ...editing, isActive: e.target.value === "ACTIVE" })}
                    className="w-full border border-slate-300 rounded-lg p-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="DISABLED">Disabled</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      <ConfirmModal />
      <div className="flex-none bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg">
            <Settings2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Operations Master</h2>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-0.5">Manufacturing Setup · {operations.length} operations</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search operations..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
            />
          </div>
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-700 font-semibold focus:outline-none focus:border-indigo-500 bg-white"
          >
            <option value="ALL">All Tasks</option>
            {TASK_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <button
            onClick={() => { setEditing(emptyOp()); setIsNew(true); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> New
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Operation Name</th>
                <th className="py-3 px-4 border-l border-slate-200">Task Category</th>
                <th className="py-3 px-4 border-l border-slate-200">Workstation</th>
                <th className="py-3 px-4 border-l border-slate-200">Time</th>
                <th className="py-3 px-4 border-l border-slate-200">Rate</th>
                <th className="py-3 px-4 border-l border-slate-200">Status</th>
                <th className="py-3 px-4 border-l border-slate-200 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <Hammer className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                    <p className="font-bold text-slate-600">No Operations Found</p>
                    <p className="text-xs mt-1">Click "New" to add operation templates used in BOM routing.</p>
                  </td>
                </tr>
              ) : filtered.map((op) => {
                const cfg = TASK_CONFIG[op.taskCategory] || TASK_CONFIG["Other"];
                return (
                  <tr key={op.id} className={`hover:bg-slate-50 transition-colors ${!op.isActive ? "opacity-50" : ""}`}>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{op.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{op.id}</div>
                      {op.description && <div className="text-xs text-slate-500 mt-0.5">{op.description}</div>}
                    </td>
                    <td className="py-3 px-4 border-l border-slate-100">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                        {cfg.icon} {op.taskCategory}
                      </span>
                    </td>
                    <td className="py-3 px-4 border-l border-slate-100 text-slate-600 font-semibold text-xs">{op.workstation || "—"}</td>
                    <td className="py-3 px-4 border-l border-slate-100 text-slate-600 font-semibold text-xs">{op.defaultTime}</td>
                    <td className="py-3 px-4 border-l border-slate-100 font-bold text-slate-700 tabular-nums">₹{op.defaultRate}</td>
                    <td className="py-3 px-4 border-l border-slate-100">
                      <button
                        onClick={() => handleToggle(op.id)}
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border transition-colors ${op.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"}`}
                      >
                        {op.isActive ? "Active" : "Disabled"}
                      </button>
                    </td>
                    <td className="py-3 px-4 border-l border-slate-100">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setEditing({ ...op }); setIsNew(false); }} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(op.id)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
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
  );
}
