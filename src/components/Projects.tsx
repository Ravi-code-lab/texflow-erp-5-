
import React, { useState, useMemo } from 'react';
import { Project, ProjectTask, TeamMember, Customer } from '../types';
import { 
  Folder, Calendar, CheckSquare, Plus, Clock, Users, 
  BarChart2, MoreVertical, AlertCircle, Edit2, Trash2, 
  CheckCircle2, ArrowRight, Layout, List as ListIcon, 
  PieChart as PieChartIcon, Target, Cpu, TrendingUp, AlertTriangle, Layers, Copy, FileInput, FilePlus, ChevronLeft, ChevronRight,
  IndianRupee, RefreshCcw
} from 'lucide-react';
import BaseModal from './BaseModal';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { analyzeProjectHealth } from '../services/geminiService';

interface ProjectsProps {
  projects: Project[];
  team: TeamMember[];
  customers: Customer[];
  onAddProject: (p: Project) => void;
  onUpdateProject: (p: Project) => void;
  onDeleteProject: (id: string) => void;
  currency?: string;
  geminiApiKey?: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

const Projects: React.FC<ProjectsProps> = ({ 
  projects, team, customers, 
  onAddProject, onUpdateProject, onDeleteProject, 
  currency = '₹',
  geminiApiKey
}) => {
  const [viewMode, setViewMode] = useState<'KANBAN' | 'TIMELINE'>('KANBAN');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  
  // AI State
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Form States
  const [projectForm, setProjectForm] = useState<Partial<Project>>({});
  const [taskForm, setTaskForm] = useState<Partial<ProjectTask>>({});

  // --- Statistics ---
  const activeProjectsList = useMemo(() => projects.filter(p => !p.isTemplate), [projects]);
  const templatesList = useMemo(() => projects.filter(p => p.isTemplate), [projects]);

  const stats = useMemo(() => {
    return {
      total: activeProjectsList.length,
      active: activeProjectsList.filter(p => p.status === 'ACTIVE').length,
      planning: activeProjectsList.filter(p => p.status === 'PLANNING').length,
      completed: activeProjectsList.filter(p => p.status === 'COMPLETED').length,
      totalBudget: activeProjectsList.reduce((acc, p) => acc + p.budget, 0)
    };
  }, [activeProjectsList]);

  const chartData = [
    { name: 'Active', value: stats.active },
    { name: 'Planning', value: stats.planning },
    { name: 'Completed', value: stats.completed },
    { name: 'On Hold', value: activeProjectsList.filter(p => p.status === 'ON_HOLD').length }
  ];

  // --- Handlers ---

  const handleAiAnalyze = async (project: Project) => {
    setAnalyzing(true);
    setAiAnalysis(null);
    const result = await analyzeProjectHealth(project);
    setAiAnalysis(result);
    setAnalyzing(false);
  };

  const handleCreateTemplate = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    if(window.confirm(`Save "${project.name}" as a template?`)) {
      const template: Project = {
        ...project,
        id: `TMPL-${Date.now()}`,
        name: `${project.name} (Template)`,
        status: 'PLANNING',
        startDate: '',
        endDate: '',
        spent: 0,
        isTemplate: true,
        tasks: (project.tasks || []).map((t, i) => ({...t, status: 'TODO', id: `TSK-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`}))
      };
      onAddProject(template);
    }
  };

  const applyTemplate = (templateId: string) => {
    const template = templatesList.find(t => t.id === templateId);
    if (template) {
      setProjectForm({
        ...projectForm,
        name: template.name.replace(' (Template)', ''),
        description: template.description,
        tasks: template.tasks.map((t, i) => ({...t, id: `TSK-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`, status: 'TODO'})),
        clientName: template.clientName,
        budget: template.budget
      });
    }
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    const newProject: Project = {
      id: projectForm.id || `PROJ-${Date.now()}`,
      name: projectForm.name || 'New Project',
      status: projectForm.status || 'PLANNING',
      clientName: projectForm.clientName,
      startDate: projectForm.startDate || new Date().toISOString().split('T')[0],
      endDate: projectForm.endDate || '',
      budget: Number(projectForm.budget) || 0,
      spent: Number(projectForm.spent) || 0,
      description: projectForm.description || '',
      tasks: projectForm.tasks || [],
      teamMembers: projectForm.teamMembers || [],
      isTemplate: false
    };

    if (projectForm.id) onUpdateProject(newProject);
    else onAddProject(newProject);
    
    setIsModalOpen(false);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    const newTask: ProjectTask = {
      id: taskForm.id || `TSK-${Date.now()}`,
      title: taskForm.title || 'New Task',
      status: taskForm.status || 'TODO',
      assignee: taskForm.assignee,
      dueDate: taskForm.dueDate || ''
    };

    const updatedTasks = taskForm.id 
      ? selectedProject.tasks.map(t => t.id === newTask.id ? newTask : t)
      : [...selectedProject.tasks, newTask];

    onUpdateProject({ ...selectedProject, tasks: updatedTasks });
    setSelectedProject({ ...selectedProject, tasks: updatedTasks });
    setIsTaskModalOpen(false);
  };

  const deleteTask = (taskId: string) => {
    if (!selectedProject) return;
    const updatedTasks = selectedProject.tasks.filter(t => t.id !== taskId);
    onUpdateProject({ ...selectedProject, tasks: updatedTasks });
    setSelectedProject({ ...selectedProject, tasks: updatedTasks });
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'ACTIVE': return 'bg-green-100 text-green-700 border-green-200';
      case 'PLANNING': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'ON_HOLD': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'COMPLETED': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  const renderStats = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3 transition-all hover:border-indigo-400">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl"><Folder className="w-4 h-4"/></div>
          <div><p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total</p><h3 className="text-base font-bold text-slate-800 dark:text-white leading-tight">{stats.total}</h3></div>
      </div>
      <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3 transition-all hover:border-green-400">
          <div className="p-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl"><Target className="w-4 h-4"/></div>
          <div><p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Active</p><h3 className="text-base font-bold text-slate-800 dark:text-white leading-tight">{stats.active}</h3></div>
      </div>
      <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3 transition-all hover:border-blue-400">
          <div className="p-2 bg-blue-50 dark:bg-indigo-900/30 text-blue-600 dark:text-blue-400 rounded-xl"><Calendar className="w-4 h-4"/></div>
          <div><p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Planning</p><h3 className="text-base font-bold text-slate-800 dark:text-white leading-tight">{stats.planning}</h3></div>
      </div>
      <div className="bg-slate-900 rounded-2xl p-3 text-white flex items-center gap-3 shadow-md relative overflow-hidden group">
          <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md relative z-10"><IndianRupee className="w-4 h-4 text-indigo-300"/></div>
          <div className="relative z-10"><p className="text-[9px] text-indigo-300 font-bold uppercase tracking-wider">Budget</p><h3 className="text-base font-bold leading-tight">{currency}{(stats.totalBudget/1000).toFixed(1)}k</h3></div>
      </div>
    </div>
  );

  const renderTimeline = () => {
    const today = new Date();
    const days = Array.from({length: 30}, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });

    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex-1 flex flex-col animate-fade-in">
         <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase flex items-center gap-2 tracking-widest"><Calendar className="w-4 h-4 text-indigo-600"/> 30-Day Critical Roadmap</h3>
         </div>
         <div className="overflow-x-auto custom-scrollbar flex-1">
            <div className="min-w-[1200px]">
              <div className="flex sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                 <div className="w-48 px-4 py-3 font-bold text-slate-500 uppercase text-[10px] tracking-widest border-r dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shrink-0">Collection Node</div>
                 <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
                    {days.map((d, i) => (
                      <div key={i} className={`text-center py-2 border-r border-slate-100 dark:border-slate-800 flex flex-col justify-center ${d.getDay() === 0 ? 'bg-slate-100 dark:bg-slate-800/50' : ''}`}>
                         <span className="text-[9px] font-bold text-slate-400 leading-none">{d.toLocaleString('default', {weekday: 'short'})}</span>
                         <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5">{d.getDate()}</span>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeProjectsList.filter(p => p.status === 'ACTIVE').map(project => (
                   <div key={project.id} className="flex hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors group h-14">
                      <div 
                          className="w-48 px-4 flex flex-col justify-center border-r dark:border-slate-700 sticky left-0 bg-white dark:bg-slate-800 z-10 shrink-0 cursor-pointer group-hover:bg-slate-50 dark:group-hover:bg-slate-700/50"
                          onClick={() => setSelectedProject(project)}
                      >
                          <span className="text-xs font-bold text-slate-800 dark:text-white truncate uppercase tracking-tight leading-none mb-0.5">{project.name}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider truncate">{project.clientName || 'Internal'}</span>
                      </div>
                      <div className="flex-1 relative">
                         <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
                            {days.map((_, i) => <div key={i} className="border-r border-slate-50 dark:border-slate-800 h-full"></div>)}
                         </div>
                         
                         {(() => {
                            const start = new Date(project.startDate);
                            const end = project.endDate ? new Date(project.endDate) : new Date(start.getTime() + 30*24*60*60*1000);
                            const diffStart = Math.ceil((start.getTime() - today.getTime()) / (1000 * 3600 * 24));
                            const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
                            if (diffStart + duration < 0 || diffStart > 30) return null;
                            const left = Math.max(0, diffStart);
                            const width = Math.min(30 - left, duration);
                            return width > 0 ? (
                              <div 
                                className="absolute h-6 top-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[9px] font-bold flex items-center px-2 shadow-sm whitespace-nowrap overflow-hidden z-10 uppercase tracking-tighter"
                                style={{ left: `${(left / 30) * 100}%`, width: `${(width / 30) * 100}%` }}
                              >
                                Roadmap
                              </div>
                            ) : null;
                         })()}

                         {(project.tasks || []).map(task => {
                             if (!task.dueDate) return null;
                             const due = new Date(task.dueDate);
                             const dayIndex = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                             if (dayIndex < 0 || dayIndex >= 30) return null;
                             return (
                                 <div 
                                    key={task.id}
                                    className={`absolute top-5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800 shadow-sm z-20 cursor-pointer hover:scale-125 transition-transform ${task.status === 'DONE' ? 'bg-green-500' : 'bg-amber-500'}`}
                                    style={{ left: `${(dayIndex / 30) * 100}%`, transform: 'translateX(-50%)' }}
                                    title={`${task.title} (${task.status})`}
                                 ></div>
                             );
                         })}
                      </div>
                   </div>
                ))}
              </div>
            </div>
         </div>
      </div>
    );
  };

  const renderProjectCard = (project: Project) => {
    const completedTasks = (project.tasks || []).filter(t => t.status === 'DONE').length;
    const totalTasks = (project.tasks || []).length;
    const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return (
      <div 
        key={project.id} 
        onClick={() => setSelectedProject(project)}
        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden flex flex-col h-[200px]"
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50"></div>
        <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400`}>
                    <Layers className="w-3.5 h-3.5" />
                </div>
                <span className="text-[9px] text-slate-400 font-mono tracking-tighter uppercase">{project.id}</span>
            </div>
            <div className="flex items-center gap-1.5">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleCreateTemplate(project, e); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-indigo-600"
                  title="Save Template"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                </button>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getStatusColor(project.status)}`}>{project.status}</span>
            </div>
        </div>
        
        <h3 className="font-bold text-slate-800 dark:text-white text-sm truncate uppercase tracking-tight mb-0.5 leading-tight">{project.name}</h3>
        {project.clientName && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1"><Users className="w-3 h-3"/> {project.clientName}</p>}
        
        <div className="grid grid-cols-2 gap-3 my-3 bg-slate-50/50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
            <div>
                <p className="text-[8px] text-slate-400 uppercase font-bold tracking-widest">Protocol Budget</p>
                <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">{currency}{(project.budget/1000).toFixed(1)}k</p>
            </div>
            <div className="text-right">
                <p className="text-[8px] text-slate-400 uppercase font-bold tracking-widest">Egress</p>
                <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">{project.endDate || 'TBD'}</p>
            </div>
        </div>

        <div className="mt-auto">
            <div className="flex justify-between text-[10px] mb-1.5">
                <span className="text-slate-500 font-bold uppercase tracking-tighter">Convergence</span>
                <span className="font-bold text-slate-700 dark:text-white">{taskProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-700" style={{width: `${taskProgress}%`}}></div>
            </div>
        </div>
      </div>
    );
  };

  const renderProjectDetail = () => {
    if (!selectedProject) return null;

    const taskCols = {
      TODO: selectedProject.tasks.filter(t => t.status === 'TODO'),
      IN_PROGRESS: selectedProject.tasks.filter(t => t.status === 'IN_PROGRESS'),
      REVIEW: selectedProject.tasks.filter(t => t.status === 'REVIEW'),
      DONE: selectedProject.tasks.filter(t => t.status === 'DONE'),
    };

    return (
      <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 z-50 flex flex-col animate-fade-in overflow-hidden">
         {/* Detail Header */}
         <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-5 py-3 flex justify-between items-center shadow-sm shrink-0">
            <div className="flex items-center gap-4">
               <button onClick={() => { setSelectedProject(null); setAiAnalysis(null); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-all active:scale-90"><ChevronLeft className="w-5 h-5"/></button>
               <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-3 leading-tight uppercase tracking-tight truncate">
                     {selectedProject.name} 
                     <span className={`text-[9px] px-2 py-0.5 rounded border uppercase tracking-wider font-bold ${getStatusColor(selectedProject.status)}`}>{selectedProject.status}</span>
                  </h2>
                  <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{selectedProject.description || 'System resource node'}</p>
               </div>
            </div>
            <div className="flex gap-2 shrink-0">
                <button 
                    onClick={() => handleAiAnalyze(selectedProject)}
                    disabled={analyzing}
                    className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-purple-100 transition-all uppercase tracking-widest"
                >
                    {analyzing ? <RefreshCcw className="w-3 h-3 animate-spin"/> : <Cpu className="w-3 h-3"/>}
                    Analysis
                </button>
               <button onClick={() => { setProjectForm(selectedProject); setIsModalOpen(true); }} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 uppercase tracking-widest">
                  <Edit2 className="w-3 h-3"/> Edit
               </button>
               <button onClick={() => { setTaskForm({status: 'TODO'}); setIsTaskModalOpen(true); }} className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-indigo-700 shadow-md uppercase tracking-widest transition-all active:scale-95">
                  <Plus className="w-3 h-3"/> Task
               </button>
            </div>
         </div>

         <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Detail Sidebar */}
            <div className="w-full md:w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-5 overflow-y-auto hidden md:block">
               {aiAnalysis && (
                   <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 p-4 rounded-2xl mb-5 animate-fade-in shadow-sm">
                       <h4 className="font-bold text-purple-900 dark:text-purple-300 text-[10px] mb-2 uppercase tracking-widest flex items-center gap-2"><Cpu className="w-3.5 h-3.5"/> Gemini Pulse</h4>
                       <p className="text-[10px] text-purple-800 dark:text-purple-200 leading-relaxed whitespace-pre-line">{aiAnalysis}</p>
                   </div>
               )}

               <div className="mb-5">
                  <h3 className="text-[9px] font-bold text-slate-400 uppercase mb-3 tracking-widest border-b border-slate-100 dark:border-slate-700 pb-1">Node Attributes</h3>
                  <div className="space-y-4">
                     <div><p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Entity</p><p className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-tight">{selectedProject.clientName || 'Nexus Direct'}</p></div>
                     <div className="grid grid-cols-2 gap-4">
                        <div><p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Ingress</p><p className="font-bold text-slate-700 dark:text-slate-300 text-xs">{selectedProject.startDate}</p></div>
                        <div><p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Egress</p><p className="font-bold text-slate-700 dark:text-slate-300 text-xs">{selectedProject.endDate || '-'}</p></div>
                     </div>
                     <div>
                        <p className="text-[9px] text-slate-400 uppercase font-bold mb-1.5">Magntitude Consumption</p>
                        <div className="flex justify-between items-end mb-1 text-[10px] font-bold uppercase tracking-tighter">
                           <span className="text-slate-800 dark:text-white">{currency}{selectedProject.spent.toLocaleString()}</span>
                           <span className="text-slate-400">{currency}{selectedProject.budget.toLocaleString()}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                           <div className="h-full bg-indigo-500 transition-all duration-700" style={{width: `${Math.min(100, (selectedProject.spent/selectedProject.budget)*100)}%`}}></div>
                        </div>
                     </div>
                  </div>
               </div>
               
               <div className="pt-5 border-t border-slate-100 dark:border-slate-700">
                  <h3 className="text-[9px] font-bold text-slate-400 uppercase mb-3 tracking-widest border-b border-slate-100 dark:border-slate-700 pb-1">Personnel Cluster</h3>
                  <div className="flex flex-col gap-2">
                     {selectedProject.teamMembers?.map(mid => {
                        const member = team.find(t => t.id === mid);
                        return member ? (
                           <div key={mid} className="flex items-center gap-2 group cursor-default">
                              <div className="w-6 h-6 rounded-lg bg-slate-50 dark:bg-slate-700 border dark:border-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase shadow-inner group-hover:border-indigo-400 transition-colors">{member.name.charAt(0)}</div>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">{member.name}</span>
                           </div>
                        ) : null;
                     })}
                     {(!selectedProject.teamMembers || selectedProject.teamMembers.length === 0) && <p className="text-[10px] text-slate-400 italic">Unassigned cluster</p>}
                  </div>
               </div>
            </div>

            {/* Task Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden bg-slate-50 dark:bg-slate-900/50 p-4">
               <div className="flex gap-4 h-full min-w-[1000px]">
                  {Object.entries(taskCols).map(([status, tasks]) => (
                     <div key={status} className="flex-1 flex flex-col min-w-[250px] bg-slate-100/30 dark:bg-slate-800/30 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                        <div className="px-4 py-3 flex justify-between items-center sticky top-0 z-10 border-b border-slate-200/50 dark:border-slate-700/50 rounded-t-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-md">
                           <h4 className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-[0.2em]">{status.replace('_', ' ')}</h4>
                           <span className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-[9px] font-bold shadow-sm">{tasks.length}</span>
                        </div>
                        <div className="flex-1 p-2 overflow-y-auto space-y-2 custom-scrollbar">
                           {tasks.map(task => (
                              <div key={task.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all group relative">
                                 <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    <button onClick={() => { setTaskForm(task); setIsTaskModalOpen(true); }} className="p-1 hover:bg-slate-50 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 className="w-3.5 h-3.5"/></button>
                                    <button onClick={() => deleteTask(task.id)} className="p-1 hover:bg-slate-50 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                                 </div>
                                 <h5 className="font-bold text-slate-800 dark:text-white text-xs mb-2 leading-snug uppercase tracking-tight">{task.title}</h5>
                                 <div className="flex justify-between items-center text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider pt-2 border-t border-slate-50 dark:border-slate-700">
                                    {task.assignee ? (
                                       <span className="flex items-center gap-1 truncate max-w-[100px]"><Users className="w-3 h-3"/> {team.find(t => t.id === task.assignee)?.name}</span>
                                    ) : <span className="opacity-40">Unassigned</span>}
                                    {task.dueDate && <span className={`flex items-center gap-1 ${new Date(task.dueDate) < new Date() && status !== 'DONE' ? 'text-red-500' : ''}`}><Clock className="w-3 h-3"/> {task.dueDate}</span>}
                                 </div>
                              </div>
                           ))}
                           {tasks.length === 0 && (
                              <div className="h-16 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-400 text-[10px] font-bold uppercase tracking-widest bg-white/10">Idle</div>
                           )}
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 h-full flex flex-col relative">
       {activeProjectsList.length > 0 && renderStats()}

       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 shrink-0 z-10">
          <div className="flex flex-1 items-center gap-3">
             <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-xl border dark:border-slate-700">
                <button onClick={() => setViewMode('KANBAN')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${viewMode === 'KANBAN' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-white' : 'text-slate-500 hover:text-slate-800'}`}><Layout className="w-3.5 h-3.5"/> Cluster Board</button>
                <button onClick={() => setViewMode('TIMELINE')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${viewMode === 'TIMELINE' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-white' : 'text-slate-500 hover:text-slate-800'}`}><Calendar className="w-3.5 h-3.5"/> Roadmap</button>
             </div>
          </div>
          
          <div className="flex items-center gap-2 pr-2">
             <button 
                onClick={() => { setProjectForm({status: 'PLANNING'}); setIsModalOpen(true); }}
                className="flex items-center gap-1.5 bg-indigo-600 text-white px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 shadow-md shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
             >
                <Plus className="w-3.5 h-3.5" /> Initialize Node
             </button>
          </div>
       </div>

       <div className="flex-1 overflow-y-auto p-1 min-h-0">
          {viewMode === 'TIMELINE' ? renderTimeline() : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6 animate-fade-in">
                {activeProjectsList.map(p => renderProjectCard(p))}
                {activeProjectsList.length === 0 && (
                   <div className="col-span-full py-16 text-center text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      <Folder className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-bold uppercase tracking-widest opacity-50">Empty Protocol Queue</p>
                   </div>
                )}
             </div>
          )}
       </div>

       {/* Overlays */}
       {selectedProject && renderProjectDetail()}

       {/* Add/Edit Project Modal */}
       <BaseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={projectForm.id ? "Protocol Modification" : "Project Initialization"} size="md">
          <form onSubmit={handleSaveProject} className="space-y-4">
             {!projectForm.id && templatesList.length > 0 && (
               <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-3 mb-4">
                 <label className="block text-[9px] font-bold text-indigo-800 dark:text-indigo-400 mb-1.5 uppercase tracking-widest ml-1">Clone Cluster Template</label>
                 <select 
                   className="w-full border border-indigo-200 dark:border-indigo-800 rounded-xl p-2.5 text-xs font-bold bg-white dark:bg-slate-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                   onChange={(e) => applyTemplate(e.target.value)}
                   defaultValue=""
                 >
                   <option value="" disabled>Select template archetype...</option>
                   {templatesList.map(t => (
                     <option key={t.id} value={t.id}>{t.name}</option>
                   ))}
                 </select>
               </div>
             )}

             <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Project Identifier</label><input required className="w-full border dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold bg-slate-50 dark:bg-slate-900 outline-none focus:ring-1 focus:ring-indigo-500" value={projectForm.name || ''} onChange={e => setProjectForm({...projectForm, name: e.target.value})} /></div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Status Protocol</label>
                   <select className="w-full border dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold bg-white dark:bg-slate-900" value={projectForm.status} onChange={e => setProjectForm({...projectForm, status: e.target.value as any})}>
                      <option value="PLANNING">Planning</option>
                      <option value="ACTIVE">Active</option>
                      <option value="ON_HOLD">On Hold</option>
                      <option value="COMPLETED">Completed</option>
                   </select>
                </div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Client Entity</label><input list="clients" className="w-full border dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold bg-white dark:bg-slate-900" value={projectForm.clientName || ''} onChange={e => setProjectForm({...projectForm, clientName: e.target.value})} /><datalist id="clients">{customers.map(c => <option key={c.id} value={c.name} />)}</datalist></div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Ingress Date</label><input type="date" className="w-full border dark:border-slate-700 rounded-xl p-2.5 text-sm bg-white dark:bg-slate-900" value={projectForm.startDate || ''} onChange={e => setProjectForm({...projectForm, startDate: e.target.value})} /></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Egress Date</label><input type="date" className="w-full border dark:border-slate-700 rounded-xl p-2.5 text-sm bg-white dark:bg-slate-900" value={projectForm.endDate || ''} onChange={e => setProjectForm({...projectForm, endDate: e.target.value})} /></div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Resource Allocation</label><input type="number" className="w-full border dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold bg-slate-50 dark:bg-slate-900" value={projectForm.budget || ''} onChange={e => setProjectForm({...projectForm, budget: Number(e.target.value)})} /></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Current Consumption</label><input type="number" className="w-full border dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold bg-slate-50 dark:bg-slate-900" value={projectForm.spent || ''} onChange={e => setProjectForm({...projectForm, spent: Number(e.target.value)})} /></div>
             </div>
             <button type="submit" className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-indigo-700 shadow-md transition-all active:scale-95 mt-4">Commit Configuration</button>
          </form>
       </BaseModal>

       {/* Task Modal */}
       <BaseModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title={taskForm.id ? "Task Mutation" : "New Task Node"} size="sm">
          <form onSubmit={handleSaveTask} className="space-y-4">
             <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Task Title</label><input required className="w-full border dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold bg-slate-50 dark:bg-slate-900 outline-none focus:ring-1 focus:ring-indigo-500" value={taskForm.title || ''} onChange={e => setTaskForm({...taskForm, title: e.target.value})} /></div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Status</label>
                   <select className="w-full border dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold bg-white dark:bg-slate-900" value={taskForm.status} onChange={e => setTaskForm({...taskForm, status: e.target.value as any})}>
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="REVIEW">Review</option>
                      <option value="DONE">Done</option>
                   </select>
                </div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Target Date</label><input type="date" className="w-full border dark:border-slate-700 rounded-xl p-2.5 text-sm bg-white dark:bg-slate-900" value={taskForm.dueDate || ''} onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})} /></div>
             </div>
             <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Assignee Cluster</label>
                <select className="w-full border dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold bg-white dark:bg-slate-900" value={taskForm.assignee || ''} onChange={e => setTaskForm({...taskForm, assignee: e.target.value})}>
                   <option value="">System Unassigned</option>
                   {team.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
             </div>
             <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all active:scale-95 mt-4">Save Node</button>
          </form>
       </BaseModal>
    </div>
  );
};

export default Projects;
