'use client';

import { useState } from 'react';
import { X, Users, FileText, Clock, ArrowRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Template {
  id: string;
  name: string;
  description?: string | null;
  defaultDuration?: number | null;
}

interface MeetingTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: Template[];
  onSelectTemplate: (template: Template | null) => void;
  recentTemplates?: Template[];
}

export function MeetingTemplateModal({
  isOpen,
  onClose,
  templates,
  onSelectTemplate,
  recentTemplates = [],
}: MeetingTemplateModalProps) {
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  if (!isOpen) return null;

  const allTemplates = [...recentTemplates, ...templates.filter(t => !recentTemplates.find(rt => rt.id === t.id))];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 border-b border-border flex items-center justify-between bg-surface/30 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-text-primary font-literata">
              Start a New Meeting
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Choose a template or start from scratch
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-board rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-text-secondary" />
          </button>
        </div>

        {/* Template Grid */}
        <div className="p-8 overflow-y-auto">
          {/* Custom Meeting Option */}
          <button
            onClick={() => onSelectTemplate(null)}
            className="w-full mb-6 p-6 rounded-2xl border-2 border-dashed border-border hover:border-primary hover:bg-surface/50 transition-all group text-left"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-mint/30 flex items-center justify-center group-hover:bg-mint/50 transition-colors">
                <Plus className="h-6 w-6 text-status-green" />
              </div>
              <div>
                <h3 className="font-bold text-text-primary text-lg">Custom Meeting</h3>
                <p className="text-sm text-text-tertiary">Start with a blank slate and configure everything</p>
              </div>
              <ArrowRight className="h-5 w-5 text-text-tertiary ml-auto group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </button>

          {/* Templates Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
              {recentTemplates.length > 0 ? 'Recent & Templates' : 'Templates'}
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
              {allTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => onSelectTemplate(template)}
                  onMouseEnter={() => setHoveredTemplate(template.id)}
                  onMouseLeave={() => setHoveredTemplate(null)}
                  className={cn(
                    "p-4 rounded-2xl border-2 text-left transition-all",
                    hoveredTemplate === template.id
                      ? "border-primary bg-surface/50 shadow-sm"
                      : "border-border/50 hover:border-primary/30 bg-white"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                      hoveredTemplate === template.id ? "bg-primary/10" : "bg-surface"
                    )}>
                      <FileText className={cn(
                        "h-5 w-5",
                        hoveredTemplate === template.id ? "text-primary" : "text-text-secondary"
                      )} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-text-primary truncate">
                          {template.name}
                        </h4>
                        {recentTemplates.find(rt => rt.id === template.id) && (
                          <span className="px-2 py-0.5 bg-mint/30 text-status-green text-xs font-medium rounded-full">
                            Recent
                          </span>
                        )}
                      </div>
                      
                      {template.description && (
                        <p className="text-sm text-text-tertiary line-clamp-1">
                          {template.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-2">
                        {template.defaultDuration && (
                          <div className="flex items-center gap-1 text-xs text-text-tertiary">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{template.defaultDuration} min</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-text-tertiary">
                          <Users className="h-3.5 w-3.5" />
                          <span>Default participants</span>
                        </div>
                      </div>
                    </div>

                    <ArrowRight className={cn(
                      "h-5 w-5 shrink-0 transition-all",
                      hoveredTemplate === template.id 
                        ? "text-primary translate-x-1" 
                        : "text-text-tertiary"
                    )} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-border bg-surface/30 shrink-0">
          <p className="text-sm text-text-tertiary text-center">
            Templates save time by pre-filling meeting details and default tasks
          </p>
        </div>
      </div>
    </div>
  );
}
