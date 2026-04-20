'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Check, FileText, Edit2, Users, X } from 'lucide-react';
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
  due_days_before: number | null;
}

interface Participant {
  id: string;
  name: string;
  division?: string | null;
}

export default function TemplatesPage() {
  const supabase = createClient();
  
  // Form state
  const [tasks, setTasks] = useState<TemplateTask[]>([]);
  const [newTask, setNewTask] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [chairman, setChairman] = useState('');
  const [coordinator, setCoordinator] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [allPeople, setAllPeople] = useState<Participant[]>([]);
  const [participantSearch, setParticipantSearch] = useState('');
  const [showParticipantDropdown, setShowParticipantDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [userRefreshKey, setUserRefreshKey] = useState(0);
  
  // Templates list state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Fetch templates and people on mount
  useEffect(() => {
    fetchTemplates();
    fetchAllPeople();
  }, []);

  const fetchAllPeople = async () => {
    const { data } = await supabase
      .from('people')
      .select('id, name, division')
      .order('name');
    if (data) setAllPeople(data);
  };

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
      setTasks([...tasks, { id: crypto.randomUUID(), description: newTask.trim(), due_days_before: null }]);
      setNewTask('');
    }
  };

  const updateTaskDueDays = (taskId: string, value: number | null) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, due_days_before: value } : t));
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
          .from('people')
          .select('id')
          .eq('name', value.trim())
          .single();
        
        if (!existingUser) {
          // Create new person in the directory
          const { data: newUser, error: createError } = await supabase
            .from('people')
            .insert([
              {
                id: crypto.randomUUID(),
                name: value.trim(),
                division: 'General',
                rank: 'Member',
              }
            ])
            .select()
            .single();
          
          if (createError) {
            console.error('Error creating user:', createError);
          } else {
            // Force UserSelectInput to remount and refetch
            setUserRefreshKey(prev => prev + 1);
          }
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
          .from('people')
          .select('id')
          .eq('name', value.trim())
          .single();
        
        if (!existingUser) {
          // Create new person in the directory
          const { error: createError } = await supabase
            .from('people')
            .insert([
              {
                id: crypto.randomUUID(),
                name: value.trim(),
                division: 'General',
                rank: 'Member',
              }
            ])
            .select()
            .single();
          
          if (createError) {
            console.error('Error creating user:', createError);
          } else {
            // Force UserSelectInput to remount and refetch
            setUserRefreshKey(prev => prev + 1);
          }
        }
      } catch (error) {
        console.error('Error checking/creating user:', error);
      }
    }
  };

  const addParticipant = (person: Participant) => {
    if (!participants.find(p => p.id === person.id)) {
      setParticipants(prev => [...prev, person]);
    }
    setParticipantSearch('');
    setShowParticipantDropdown(false);
  };

  const removeParticipant = (id: string) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
  };

  const filteredPeopleForParticipants = allPeople.filter(
    p =>
      !participants.find(x => x.id === p.id) &&
      p.name.toLowerCase().includes(participantSearch.toLowerCase())
  );

  const handleSave = async () => {
    if (!templateName.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      // Get chairman and coordinator profile IDs if they exist
      let chairmanId = null;
      let coordinatorId = null;
      
      if (chairman.trim()) {
        const { data: chairmanProfile, error: chairmanError } = await supabase
          .from('people')
          .select('id')
          .eq('name', chairman.trim())
          .maybeSingle();
        
        if (chairmanError) {
          console.error('Chairman lookup error:', chairmanError);
        } else if (chairmanProfile) {
          chairmanId = chairmanProfile.id;
        }
      }
      
      if (coordinator.trim()) {
        const { data: coordinatorProfile, error: coordinatorError } = await supabase
          .from('people')
          .select('id')
          .eq('name', coordinator.trim())
          .maybeSingle();
        
        if (coordinatorError) {
          console.error('Coordinator lookup error:', coordinatorError);
        } else if (coordinatorProfile) {
          coordinatorId = coordinatorProfile.id;
        }
      }

      let templateId: string;
      let isUpdating = false;

      if (editingTemplateId) {
        // Update existing template
        const { error: updateError } = await supabase
          .from('templates')
          .update({
            name: templateName.trim(),
            chairman_id: chairmanId,
            coordinator_id: coordinatorId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTemplateId);
        
        if (updateError) {
          console.error('Template update error:', updateError);
          throw updateError;
        }
        
        templateId = editingTemplateId;
        isUpdating = true;
        
        // Delete existing tasks and re-insert
        const { error: deleteTasksError } = await supabase
          .from('template_checklist_tasks')
          .delete()
          .eq('template_id', templateId);
        
        if (deleteTasksError) {
          console.error('Delete tasks error:', deleteTasksError);
          throw deleteTasksError;
        }
      } else {
        // Check for existing template with same name
        const { data: existingTemplate } = await supabase
          .from('templates')
          .select('id, name')
          .ilike('name', templateName.trim())
          .maybeSingle();
        
        if (existingTemplate) {
          const confirmed = window.confirm(
            `A template named "${existingTemplate.name}" already exists.\n\nDo you want to overwrite it?`
          );
          
          if (!confirmed) {
            setIsSubmitting(false);
            return;
          }
          
          // Update existing template instead of creating new
          const { error: updateError } = await supabase
            .from('templates')
            .update({
              name: templateName.trim(),
              chairman_id: chairmanId,
              coordinator_id: coordinatorId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingTemplate.id);
          
          if (updateError) {
            console.error('Template update error:', updateError);
            throw updateError;
          }
          
          templateId = existingTemplate.id;
          isUpdating = true;
          
          // Delete existing tasks and re-insert
          const { error: deleteTasksError } = await supabase
            .from('template_checklist_tasks')
            .delete()
            .eq('template_id', templateId);
          
          if (deleteTasksError) {
            console.error('Delete tasks error:', deleteTasksError);
            throw deleteTasksError;
          }
        } else {
          // Create new template
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
          
          templateId = templateData.id;
        }
      }
      
      // Save tasks
      if (tasks.length > 0) {
        const { error: tasksError } = await supabase
          .from('template_checklist_tasks')
          .insert(
            tasks.map((task) => ({
              template_id: templateId,
              description: task.description,
              due_days_before: task.due_days_before ?? null,
            }))
          );
        
        if (tasksError) {
          console.error('Tasks insert error:', tasksError);
          throw tasksError;
        }
      }

      // Save participants — delete existing then re-insert
      const { error: deleteParticipantsError } = await supabase
        .from('template_participants')
        .delete()
        .eq('template_id', templateId);

      if (deleteParticipantsError) {
        console.error('Delete participants error:', deleteParticipantsError);
        throw deleteParticipantsError;
      }

      if (participants.length > 0) {
        const { error: participantsError } = await supabase
          .from('template_participants')
          .insert(
            participants.map((p) => ({
              template_id: templateId,
              person_id: p.id,
            }))
          );

        if (participantsError) {
          console.error('Participants insert error:', participantsError);
          throw participantsError;
        }
      }
      
      // Refresh templates list
      await fetchTemplates();
      
      // Reset form
      setTemplateName('');
      setChairman('');
      setCoordinator('');
      setTasks([]);
      setParticipants([]);
      setEditingTemplateId(null);
      
    } catch (error: any) {
      console.error('Error saving template:', error);
      alert('Failed to save template: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadTemplateForEdit = async (template: Template) => {
    setEditingTemplateId(template.id);
    setTemplateName(template.name);
    
    // Load chairman, coordinator names, tasks, and participants in parallel
    const [chairmanRes, coordinatorRes, tasksRes, participantsRes] = await Promise.all([
      template.chairman_id
        ? supabase.from('people').select('name').eq('id', template.chairman_id).maybeSingle()
        : Promise.resolve({ data: null }),
      template.coordinator_id
        ? supabase.from('people').select('name').eq('id', template.coordinator_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('template_checklist_tasks').select('*').eq('template_id', template.id),
      supabase
        .from('template_participants')
        .select('person_id, people(id, name, division)')
        .eq('template_id', template.id),
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
      setTasks(tasksRes.data.map((t: any) => ({ id: t.id, description: t.description, due_days_before: t.due_days_before ?? null })));
    } else {
      setTasks([]);
    }

    // Update participants state
    if (participantsRes.data) {
      const loaded = participantsRes.data
        .map((row: any) => row.people)
        .filter(Boolean) as Participant[];
      setParticipants(loaded);
    } else {
      setParticipants([]);
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
        setParticipants([]);
        setEditingTemplateId(null);
      }
      
      // Refresh templates list
      await fetchTemplates();
      
    } catch (error: any) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template: ' + (error.message || 'Unknown error'));
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto space-y-8 pb-12 pt-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary font-literata">
          Template Builder
        </h1>
        <p className="text-base font-light text-text-secondary">
          Design reusable meeting structures with custom attributes and default tasks.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
        {/* Left Column - Form */}
        <div className="w-full sm:flex-[2] min-w-0 order-2 sm:order-1">
          <div className="bg-white rounded-3xl shadow-sm border border-border overflow-hidden">
            {/* Meeting Details Section */}
            <div className="p-5 sm:p-8 border-b border-border bg-surface/30">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-2">Chairman</label>
                    <UserSelectInput
                      key={`chairman-${userRefreshKey}`}
                      value={chairman}
                      onChange={handleChairmanChange}
                      placeholder="Select user..."
                      allowCreate={true}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-2">Coordinator</label>
                    <UserSelectInput
                      key={`coordinator-${userRefreshKey}`}
                      value={coordinator}
                      onChange={handleCoordinatorChange}
                      placeholder="Select user..."
                      allowCreate={true}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Participants Section */}
            <div className="p-5 sm:p-8 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-text-primary font-literata">Participants</h2>
                  <p className="text-sm text-text-tertiary font-light mt-1">Default attendees added whenever this template is used.</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-text-tertiary">
                  <Users className="h-4 w-4" />
                  <span>{participants.length} added</span>
                </div>
              </div>

              {/* Participant chips */}
              {participants.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {participants.map(p => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-full text-sm"
                    >
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {p.name.charAt(0)}
                      </div>
                      <span className="text-text-primary font-light">{p.name}</span>
                      {p.division && (
                        <span className="text-text-tertiary text-xs">({p.division})</span>
                      )}
                      <button
                        onClick={() => removeParticipant(p.id)}
                        className="ml-1 text-text-tertiary hover:text-coral-text transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Participant search/add */}
              <div className="relative">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={participantSearch}
                    onChange={e => {
                      setParticipantSearch(e.target.value);
                      setShowParticipantDropdown(true);
                    }}
                    onFocus={() => setShowParticipantDropdown(true)}
                    onBlur={() => setTimeout(() => setShowParticipantDropdown(false), 150)}
                    placeholder="Search and add participants..."
                    className="flex-1 px-5 py-3 bg-white border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-primary placeholder:text-text-tertiary font-light text-base"
                  />
                </div>
                {showParticipantDropdown && filteredPeopleForParticipants.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-border rounded-2xl shadow-lg z-50 max-h-52 overflow-y-auto">
                    {filteredPeopleForParticipants.map(person => (
                      <button
                        key={person.id}
                        onMouseDown={() => addParticipant(person)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-surface transition-colors text-left"
                      >
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                          {person.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{person.name}</p>
                          {person.division && (
                            <p className="text-xs text-text-tertiary">{person.division}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Default Checklist Section */}
            <div className="p-5 sm:p-8">
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
                    className="flex items-start gap-4 p-4 bg-board border border-border/50 rounded-2xl hover:border-border transition-colors group"
                  >
                    <GripVertical className="h-5 w-5 text-text-tertiary cursor-grab active:cursor-grabbing mt-1" />
                    <div className="w-6 h-6 rounded border border-border flex items-center justify-center text-transparent bg-white mt-1 shrink-0">
                      <Check className="h-4 w-4" />
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <span className="text-base text-text-primary font-light">{task.description}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-tertiary shrink-0">Due:</span>
                        <input
                          type="number"
                          placeholder="days before meeting"
                          value={task.due_days_before ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                            updateTaskDueDays(task.id, isNaN(val as number) ? null : val);
                          }}
                          className="w-36 px-2 py-1 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary/30 text-text-primary placeholder:text-text-tertiary"
                        />
                        <span className="text-xs text-text-tertiary">
                          {task.due_days_before === null
                            ? 'no due date'
                            : task.due_days_before >= 0
                            ? `${task.due_days_before} day${task.due_days_before !== 1 ? 's' : ''} before`
                            : `${Math.abs(task.due_days_before)} day${Math.abs(task.due_days_before) !== 1 ? 's' : ''} after`}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeTask(task.id)}
                      className="text-text-tertiary hover:text-coral-text transition-colors p-2 rounded-xl hover:bg-coral-text/10 opacity-0 group-hover:opacity-100 mt-0.5"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
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
                  className="px-5 sm:px-6 py-3 sm:py-3.5 bg-board text-text-primary border border-border rounded-2xl text-sm sm:text-base font-light hover:bg-surface transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
                >
                  <Plus className="h-5 w-5" />
                  Add Task
                </button>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-5 sm:p-6 border-t border-border bg-surface/30 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button 
                className="px-5 sm:px-6 py-3 bg-white border border-border text-text-primary rounded-full text-sm sm:text-base font-light hover:bg-board transition-colors shadow-sm"
                onClick={() => {
                  setTemplateName('');
                  setChairman('');
                  setCoordinator('');
                  setTasks([]);
                  setParticipants([]);
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isSubmitting || !templateName.trim()}
                className="px-5 sm:px-6 py-3 bg-primary text-white rounded-full text-sm sm:text-base font-light hover:bg-primary-hover shadow-md transition-colors active:scale-95 disabled:opacity-50"
              >
                {isSubmitting 
                  ? 'Saving...' 
                  : editingTemplateId 
                    ? 'Update Template' 
                    : 'Save Template'
                }
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Templates List */}
        <div className="w-full sm:flex-1 min-w-0 order-1 sm:order-2">
          <div className="bg-white rounded-3xl shadow-sm border border-border overflow-hidden sm:sticky sm:top-4">
            <div className="p-6 border-b border-border bg-surface/30">
              <h2 className="text-lg font-bold text-text-primary font-literata">Your Templates</h2>
              <p className="text-sm text-text-tertiary mt-1">{templates.length} template{templates.length !== 1 ? 's' : ''} created</p>
            </div>

            <div className="p-4 sm:max-h-[calc(100vh-200px)] sm:overflow-y-auto">
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
                  setParticipants([]);
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
