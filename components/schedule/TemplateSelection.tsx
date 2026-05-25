import { Sparkles, Users, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Template } from './types';

interface TemplateSelectionProps {
  initialTemplates: Template[];
  selectedTemplate: string | null;
  handleTemplateSelect: (id: string | null) => void;
}

export function TemplateSelection({
  initialTemplates,
  selectedTemplate,
  handleTemplateSelect
}: TemplateSelectionProps) {
  return (
    <div className="bg-surface border border-border/30 rounded-[24px] p-6 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-text-primary" />
        <h2 className="text-xl font-bold text-text-primary font-literata">
          Template Selection
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {initialTemplates.map((template) => (
          <div
            key={template.id}
            onClick={() => handleTemplateSelect(template.id)}
            className={cn(
              "relative rounded-[24px] p-5 cursor-pointer transition-all border-2",
              selectedTemplate === template.id
                ? "bg-cream border-primary shadow-sm"
                : "bg-white border-border/50 hover:border-primary/50"
            )}
          >
            {selectedTemplate === template.id && (
              <div className="absolute top-3 right-3 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            )}
            <Users className="h-5 w-5 text-text-primary mb-3" />
            <h3 className="font-bold text-text-primary text-base mb-1">{template.name}</h3>
            {template.description && (
              <p className="text-xs font-light text-text-secondary">{template.description}</p>
            )}
          </div>
        ))}

        <div
          onClick={() => handleTemplateSelect(null)}
          className={cn(
            "relative rounded-[24px] p-5 cursor-pointer transition-all border-2 border-dashed flex flex-col items-center justify-center text-center",
            selectedTemplate === null
              ? "bg-cream border-primary shadow-sm"
              : "bg-transparent border-border/50 hover:border-primary/50"
          )}
        >
          <PlusCircle className="h-6 w-6 text-text-secondary mb-2" />
          <h3 className="font-bold text-text-tertiary text-sm">Custom Type</h3>
        </div>
      </div>
    </div>
  );
}
