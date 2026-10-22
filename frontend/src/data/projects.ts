import type { Citation } from '../types'

export type ProjectStatus = 'in_corso' | 'pianificato' | 'chiuso'

/** Project register. Impacted processes and gaps are derived from the linked scenario, never typed here. */
export type Project = {
  id: string
  code: string
  name: string
  status: ProjectStatus
  owner: string
  period: string
  objective: string
  themes: string[]
  exclusions: string[]
  milestones: { label: string; date: string; done: boolean }[]
  documents: Citation[]
  /** Impact-analysis scenario, when one exists */
  scenarioId?: string
}

export const PROJECTS: Project[] = [
  {
    id: 'prj-da',
    code: 'DA-26',
    name: 'Document Automation',
    status: 'in_corso',
    owner: 'Direzione finanziaria',
    period: 'Apr 2026 – Set 2026',
    objective: 'Valutare l’uso di document intelligence su fatture passive e documenti di trasporto, con integrazione verso l’ERP.',
    themes: ['Fatture senza ordine', 'Eccezioni e riconciliazioni', 'Consegne parziali'],
    exclusions: ['Sviluppo e messa in produzione', 'Consulenza legale e fiscale'],
    milestones: [
      { label: 'Avvio', date: '04/2026', done: true },
      { label: 'Mappatura processi', date: '05/2026', done: true },
      { label: 'Prototipo', date: '09/2026', done: false },
    ],
    documents: [{ doc: 'Charter_DocAutomation.docx', page: 1 }, { doc: 'Mappe_Processo_PTP_v2.xlsx' }],
    scenarioId: 'document-automation',
  },
  {
    id: 'prj-wms',
    code: 'WMS-25',
    name: 'Revisione unità di carico',
    status: 'in_corso',
    owner: 'Ufficio tecnico',
    period: 'Gen 2026 – Dic 2026',
    objective: 'Estendere i formati pallet gestiti da WMS e LGV mantenendo invariati i tempi di ciclo.',
    themes: ['Formati EUR / ISO', 'Parametri di presa LGV'],
    exclusions: ['Modifiche hardware alle forche'],
    milestones: [
      { label: 'Specifica', date: '03/2026', done: true },
      { label: 'Validazione su impianto pilota', date: '11/2026', done: false },
    ],
    documents: [{ doc: 'Specifica_Funzionale_WMS_v3.2.pdf', page: 14 }],
    scenarioId: 'pallet',
  },
  {
    id: 'prj-lgv',
    code: 'LGV-27',
    name: 'Manutenzione predittiva flotta LGV',
    status: 'pianificato',
    owner: 'Service',
    period: 'TBD',
    objective: 'Anticipare i guasti della flotta a partire dai dati di telemetria.',
    themes: ['Telemetria', 'Pianificazione interventi'],
    exclusions: [],
    milestones: [{ label: 'Approvazione charter', date: 'TBD', done: false }],
    documents: [],
  },
]

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  in_corso: 'In corso',
  pianificato: 'Pianificato',
  chiuso: 'Chiuso',
}
