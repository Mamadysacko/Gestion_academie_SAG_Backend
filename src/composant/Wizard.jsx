import React from 'react';
import { Check } from 'lucide-react';

/**
 * Wizard — barre de progression multi-étapes.
 *
 * Props :
 *  - steps       : Array<{ id, label, icon? }>  — liste des étapes
 *  - current     : number                        — index de l'étape active (0-based)
 *  - onStepClick : (index: number) => void       — rappel au clic sur une étape passée
 */
const Wizard = ({ steps = [], current = 0, onStepClick }) => {
  return (
    <nav aria-label="Progression" className="mb-6">
      <ol className="flex items-center gap-0">
        {steps.map((step, index) => {
          const Icon    = step.icon;
          const isDone  = index < current;
          const isActive = index === current;
          const isLast  = index === steps.length - 1;

          return (
            <React.Fragment key={step.id}>
              {/* Étape */}
              <li className="flex flex-col items-center gap-1.5 min-w-[80px]">
                <button
                  type="button"
                  onClick={() => isDone && onStepClick?.(index)}
                  disabled={!isDone}
                  aria-current={isActive ? 'step' : undefined}
                  className={`
                    w-9 h-9 rounded-xl flex items-center justify-center border-2 text-xs font-bold
                    transition-all duration-200
                    ${isDone
                      ? 'bg-emerald-500 border-emerald-500 text-white cursor-pointer hover:bg-emerald-600'
                      : isActive
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200'
                        : 'bg-white border-slate-200 text-slate-400 cursor-default'
                    }
                  `}
                >
                  {isDone ? (
                    <Check className="w-4 h-4" />
                  ) : Icon ? (
                    <Icon className="w-4 h-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </button>

                <span className={`text-[10px] font-bold text-center leading-tight ${
                  isActive ? 'text-blue-600' : isDone ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  {step.label}
                </span>
              </li>

              {/* Connecteur */}
              {!isLast && (
                <li
                  aria-hidden="true"
                  className={`
                    flex-1 h-0.5 mb-4 mx-1 rounded-full transition-all duration-300
                    ${index < current ? 'bg-emerald-400' : 'bg-slate-200'}
                  `}
                />
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

export default Wizard;
