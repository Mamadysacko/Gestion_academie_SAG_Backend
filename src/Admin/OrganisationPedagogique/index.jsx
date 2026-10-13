import { useState } from 'react';
import { CalendarDays, BookOpen, Layers, Users, GitMerge, LayoutDashboard } from 'lucide-react';
import DashboardPedagogique from './DashboardPedagogique';
import AnneesScolaires from './AnneesScolaires';

import TypesFormations from './TypesFormations';
import Sessions from './Sessions';
import Groupes from './Groupes';
import VueHierarchique from './VueHierarchique';

export default function OrganisationPedagogique({ onBack, currentUser }) {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'hierarchie', label: 'Vue Hiérarchique', icon: GitMerge },
    { id: 'annees', label: 'Années scolaires', icon: CalendarDays },
    { id: 'types', label: 'Types de Formations', icon: BookOpen },
    { id: 'sessions', label: 'Sessions', icon: Layers },
    { id: 'groupes', label: 'Groupes', icon: Users },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardPedagogique currentUser={currentUser} />;
      case 'hierarchie': return <VueHierarchique currentUser={currentUser} />;
      case 'annees': return <AnneesScolaires currentUser={currentUser} />;
      case 'types': return <TypesFormations currentUser={currentUser} />;
      case 'sessions': return <Sessions currentUser={currentUser} />;
      case 'groupes': return <Groupes currentUser={currentUser} />;
      default: return <DashboardPedagogique />;
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-8">
        {onBack && (
          <button onClick={onBack} className="mb-4 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
            ← Retour au tableau de bord
          </button>
        )}
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Organisation Pédagogique</h1>
        <p className="text-slate-500">Gestion centralisée des années scolaires, formations, sessions et groupes.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="flex overflow-x-auto border-b border-slate-200 hide-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[600px]">
        {renderContent()}
      </div>
    </div>
  );
}
