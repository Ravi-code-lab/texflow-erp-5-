
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, Circle, Clock, AlertCircle, 
  Plus, Trash2, Edit2, Filter, Search,
  Calendar, User, Tag, MoreVertical,
  Check, X, Archive, ArrowRight,
  LayoutGrid, List, Kanban
} from 'lucide-react';
import { Task, TeamMember } from '../types';

interface TaskManagerProps {
  tasks: Task[];
  team: TeamMember[];
  onAddTask: (task: Partial<Task>) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
}

const TaskManager: React.FC<TaskManagerProps> = ({
  tasks,
  team,
  onAddTask,
  onUpdateTask,
  onDeleteTask
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [filter, setFilter] = useState<Task['status'] | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: new Date().toISOString().split('T')[0]
  });

  const filteredTasks = tasks.filter(t => {
    const matchesFilter = filter === 'ALL' || t.status === filter;
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                          t.description?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'URGENT': return 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30';
      case 'HIGH': return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30';
      case 'MEDIUM': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30';
      case 'LOW': return 'text-slate-600 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'DONE': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'IN_PROGRESS': return <Clock className="w-5 h-5 text-indigo-500" />;
      case 'ARCHIVED': return <Archive className="w-5 h-5 text-slate-400" />;
      default: return <Circle className="w-5 h-5 text-slate-300" />;
    }
  };

  const handleAdd = () => {
    if (!newTask.title) return;
    onAddTask(newTask);
    setNewTask({
      title: '',
      description: '',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: new Date().toISOString().split('T')[0]
    });
    setIsAdding(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Task Matrix</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Operational Workflow & Team Coordination</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search tasks, descriptions, tags..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {['ALL', 'TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s as any)}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border whitespace-nowrap ${
                filter === s 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                  : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Add Task Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 border-indigo-500/30 shadow-xl space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1">Task Title</label>
                  <input 
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold bg-white dark:bg-slate-950 outline-none" 
                    value={newTask.title}
                    onChange={e => setNewTask({...newTask, title: e.target.value})}
                    placeholder="What needs to be done?"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1">Priority</label>
                  <select 
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold bg-white dark:bg-slate-950 outline-none"
                    value={newTask.priority}
                    onChange={e => setNewTask({...newTask, priority: e.target.value as any})}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1">Due Date</label>
                  <input 
                    type="date"
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold bg-white dark:bg-slate-950 outline-none"
                    value={newTask.dueDate}
                    onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1">Description</label>
                  <textarea 
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-950 outline-none"
                    rows={2}
                    value={newTask.description}
                    onChange={e => setNewTask({...newTask, description: e.target.value})}
                    placeholder="Add more details..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAdd}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                >
                  Create Task
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task List */}
      <div className="grid grid-cols-1 gap-3">
        <AnimatePresence initial={false}>
          {filteredTasks.length > 0 ? (
            filteredTasks.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex items-center gap-4"
              >
                <button 
                  onClick={() => onUpdateTask(t.id, { status: t.status === 'DONE' ? 'TODO' : 'DONE' })}
                  className="shrink-0 transition-transform hover:scale-110"
                >
                  {getStatusIcon(t.status)}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className={`text-sm font-bold uppercase tracking-tight truncate ${t.status === 'DONE' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                      {t.title}
                    </h4>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${getPriorityColor(t.priority)}`}>
                      {t.priority}
                    </span>
                  </div>
                  {t.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-2xl">
                      {t.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                      <Calendar className="w-3 h-3" /> {t.dueDate || 'No Date'}
                    </div>
                    {t.assignedTo && (
                      <div className="flex items-center gap-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                        <User className="w-3 h-3" /> {team.find(tm => tm.id === t.assignedTo)?.name || 'Unknown'}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onDeleteTask(t.id)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">All Tasks Completed</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Great job! You've cleared your current task list.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TaskManager;
