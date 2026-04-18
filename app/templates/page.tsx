'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Check, FileText, Edit2 } from 'lucide-react';
import { UserTaggingInput } from '@/components/UserTaggingInput';
import { UserSelectInput } from '@/components/UserSelectInput';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';

interface Template {
  id: string;
  name: string;
  description?: string | null;
  chairman_id?: string | null;
  coordinator_id?: string | null;
  created_at: string;
}

interface TemplateTask {
  id: string;
  description: string;
}

export default function TemplatesPage() {
  const supabase = createClient();
  
  // Form state
  const [tasks, setTasks] = useState<TemplateTask[]>([]);
  const [newTask, setNewTask] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [chairman, setChairman] = useState('');
  const [coordinator, setCoordinator] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  
  // Templates list state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setTemplates(data);
    }
    setLoadingTemplates(false);
  };

  const handleAddTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks, { id: crypto.randomUUID(), description: newTask.trim() }]);
      setNewTask('');
    }
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const handleChairmanChange = async (value: string, isNew: boolean) => {
    setChairman(value);
    
    // If it's a new user, create them in the database
    if (isNew && value.trim()) {
      try {
        // Check if user already exists
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('name', value.trim())
          .single();
        
        if (!existingUser) {
          // Create new user via auth (this would typically require admin privileges)
          // For now, we'll just log that a new user should be created
        }
      } catch (error) {
        console.error('Error checking/creating user:', error);
      }
    }
  };

  const handleCoordinatorChange = async (value: string, isNew: boolean) => {
    setCoordinator(value);
    
    if (isNew && value.trim()) {
      try {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('name', value.trim())
          .single();
        
        if (!existingUser) {
        }
      } catch (error) {
        console.error('Error checking/creating user:', error);
      }
    }
  };

  const handleSave = async () => {
    if (!templateName.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      // Get chairman and coordinator profile IDs if they exist
      let chairmanId = null;
      let coordinatorId = null;
      
      if (chairman.trim()) {
        const { data: chairmanProfile, error: chairmanError } = await supabase
          .from('profiles')
          .select('id')
          .eq('name', chairman.trim())
          .maybeSingle();
        
        if (chairmanError) {
          console.error('Chairman lookup error:', chairmanError);
        } else if (chairmanProfile) {
          chairmanId = chairmanProfile.id;
        } else {
          // Chairman not found - could create new user here
        }
      }
      
      if (coordinator.trim()) {
        const { data: coordinatorProfile, error: coordinatorError } = await supabase
          .from('profiles')
          .select('id')
          .eq('name', coordinator.trim())
          .maybeSingle();
        
        if (coordinatorError) {
          console.error('Coordinator lookup error:', coordinatorError);
        } else if (coordinatorProfile) {
          coordinatorId = coordinatorProfile.id;
        } else {
          // Coordinator not found - could create new user here
        }
      }

      // Save template
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .insert([
          {
            name: templateName.trim(),
            description: null,
            chairman_id: chairmanId,
            coordinator_id: coordinatorId,
          }
        ])
        .select()
        .single();
      
      if (templateError) {
        console.error('Template insert error:', templateError);
        throw templateError;
      }
      
      // Save tasks
      if (tasks.length > 0 && templateData) {
        const { error: tasksError } = await supabase
          .from('template_checklist_tasks')
          .insert(
            tasks.map((task) => ({
              template_id: templateData.id,
              description: task.description,
            }))
          );
        
        if (tasksError) {
          console.error('Tasks insert error:', tasksError);
          throw tasksError;
        }
      }
      
      // Refresh templates list
      await fetchTemplates();
      
      // Reset form
      setTemplateName('');
      setChairman('');
      setCoordinator('');
      setTasks([]);
      setEditingTemplateId(null);
      
    } catch (error: any) {
      console.error('Error saving template:', error);
      alert('Failed to save template. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadTemplateForEdit = async (template: Template) => {
    setEditingTemplateId(template.id);
    setTemplateName(template.name);
    
    // Load chairman, coordinator names and tasks in parallel
    const [chairmanRes, coordinatorRes, tasksRes] = await Promise.all([
      template.chairman_id
        ? supabase.from('profiles').select('name').eq('id', template.chairman_id).maybeSingle()
        : Promise.resolve({ data: null }),
      template.coordinator_id
        ? supabase.from('profiles').select('name').eq('id', template.coordinator_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('template_checklist_tasks').select('*').eq('template_id', template.id)
    ]);

    // Update chairman name state
    if (template.chairman_id) {
      if (chairmanRes.data) setChairman(chairmanRes.data.name);
    } else {
      setChairman('');
    }
    
    // Update coordinator name state
    if (template.coordinator_id) {
      if (coordinatorRes.data) setCoordinator(coordinatorRes.data.name);
    } else {
      setCoordinator('');
    }
    
    // Update tasks state
    if (tasksRes.data) {
      setTasks(tasksRes.data.map(t => ({ id: t.id, description: t.description })));
    } else {
      setTasks([]);
    }
  };

  const handleDeleteTemplate = async (template: Template, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the edit action
    
    const confirmed = window.confirm(`Delete template "${template.name}"?\n\nThis action cannot be undone.`);
    if (!confirmed) return;
    
    try {
      // Delete template (tasks will cascade delete due to FK constraint)
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', template.id);
      
      if (error) throw error;
      
      // If we deleted the currently editing template, reset the form
      if (editingTemplateId === template.id) {
        setTemplateName('');
        setChairman('');
        setCoordinator('');
        setTasks([]);
        setEditingTemplateId(null);
      }
      
      // Refresh templates list
      await fetchTemplates();
      
    } catch (error: any) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template. Please try again later.');
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto space-y-8 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight text-text-primary font-literata">
          Template Builder
        </h1>
        <p className="text-base font-light text-text-secondary">
          Design reusable meeting structures with custom attributes and default tasks.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column - Form */}
        <div className="col-span-8">
          <div className="bg-white rounded-3xl shadow-sm border border-border overflow-hidden">
            {/* Meeting Details Section */}
            <div className="p-8 border-b border-border bg-surface/30">
              <h2 className="text-xl font-bold text-text-primary font-literata">Meeting Details</h2>
              <p className="text-sm text-text-tertiary font-light mt-1 mb-6">Set the core details and roles for this template type.</p>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">Template Name</label>
                  <input 
                    type="text" 
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full px-5 py-3 bg-white border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-primary placeholder:text-text-tertiary font-light text-base"
                    placeholder="e.g. Weekly Product Sync"
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-2">Chairman</label>
                    <UserSelectInput
                      value={chairman}
                      onChange={handleChairmanChange}
                      placeholder="Select user..."
                      allowCreate={true}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-2">Coordinator</label>
                    <UserSelectInput
                      value={coordinator}
                      onChange={handleCoordinatorChange}
                      placeholder="Select user..."
                      allowCreate={true}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Default Checklist Section */}
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-text-primary font-literata">Default Checklist</h2>
                  <p className="text-sm text-text-tertiary font-light mt-1">These tasks will be automatically generated whenever this meeting template is used.</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {tasks.map((task) => (
                  <div 
                    key={task.id} 
                    className="flex items-center gap-4 p-4 bg-board border border-border/50 rounded-2xl hover:border-border transition-colors group"
                  >
                    <GripVertical className="h-5 w-5 text-text-tertiary cursor-grab active:cursor-grabbing" />
                    <div className="w-6 h-6 rounded border border-border flex items-center justify-center text-transparent bg-white">
                      <Check className="h-4 w-4" />
                    </div>
                    <span className="flex-1 text-base text-text-primary font-light">{task.description}</span>
                    <button 
                      onClick={() => removeTask(task.id)}
                      className="text-text-tertiary hover:text-coral-text transition-colors p-2 rounded-xl hover:bg-coral-text/10 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <UserTaggingInput 
                    value={newTask} 
                    onChange={setNewTask} 
                    onEnter={handleAddTask} 
                  />
                </div>
                <button 
                  onClick={handleAddTask}
                  disabled={!newTask.trim()}
                  className="px-6 py-3.5 bg-board text-text-primary border border-border rounded-2xl text-base font-light hover:bg-surface transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0"
                >
                  <Plus className="h-5 w-5" />
                  Add Task
                </button>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-border bg-surface/30 flex justify-end gap-3">
              <button 
                className="px-6 py-3 bg-white border border-border text-text-primary rounded-full text-base font-light hover:bg-board transition-colors shadow-sm"
                onClick={() => {
                  setTemplateName('');
                  setChairman('');
                  setCoordinator('');
                  setTasks([]);
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isSubmitting || !templateName.trim()}
                className="px-6 py-3 bg-primary text-white rounded-full text-base font-light hover:bg-primary-hover shadow-md transition-colors active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Templates List */}
        <div className="col-span-4">
          <div className="bg-white rounded-3xl shadow-sm border border-border overflow-hidden sticky top-4">
            <div className="p-6 border-b border-border bg-surface/30">
              <h2 className="text-lg font-bold text-text-primary font-literata">Your Templates</h2>
              <p className="text-sm text-text-tertiary mt-1">{templates.length} template{templates.length !== 1 ? 's' : ''} created</p>
            </div>

            <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {loadingTemplates ? (
                <div className="text-center py-8 text-text-tertiary">Loading...</div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-text-tertiary">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No templates yet.</p>
                  <p className="text-xs mt-1">Create your first template!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => loadTemplateForEdit(template)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          loadTemplateForEdit(template);
                        }
                      }}
                      className={cn(
                        "w-full p-4 rounded-2xl text-left transition-all group cursor-pointer",
                        editingTemplateId === template.id
                          ? "bg-mint/30 border-2 border-primary"
                          : "bg-surface/50 border-2 border-transparent hover:border-primary/30 hover:bg-surface"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                          editingTemplateId === template.id ? "bg-primary/10" : "bg-board"
                        )}>
                          <FileText className={cn(
                            "h-5 w-5",
                            editingTemplateId === template.id ? "text-primary" : "text-text-secondary"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-text-primary truncate text-sm">
                            {template.name}
                          </h4>
                          <p className="text-xs text-text-tertiary mt-0.5">
                            {new Date(template.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Edit2 className={cn(
                            "h-4 w-4",
                            editingTemplateId === template.id ? "text-primary" : "text-text-tertiary"
                          )} />
                          <button
                            onClick={(e) => handleDeleteTemplate(template, e)}
                            className="p-1.5 rounded-lg hover:bg-coral-text/10 text-text-tertiary hover:text-coral-text transition-colors"
                            title="Delete template"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Create New */}
              <button
                onClick={() => {
                  setTemplateName('');
                  setChairman('');
                  setCoordinator('');
                  setTasks([]);
                  setEditingTemplateId(null);
                }}
                className="w-full mt-4 p-4 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-surface/30 transition-all text-center"
              >
                <Plus className="h-5 w-5 mx-auto mb-1 text-text-tertiary" />
                <span className="text-sm text-text-tertiary">Create New Template</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
