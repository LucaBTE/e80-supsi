import type { Citation } from '../types'

export type ProjectStatus = 'in_progress' | 'planned' | 'closed'

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
    status: 'in_progress',
    owner: 'Finance department',
    period: 'Apr 2026 – Sep 2026',
    objective: 'Evaluate document intelligence for supplier invoices and delivery notes, with ERP integration.',
    themes: ['Invoices without a purchase order', 'Exceptions and reconciliations', 'Partial deliveries'],
    exclusions: ['Development and deployment', 'Legal and tax advice'],
    milestones: [
      { label: 'Kickoff', date: '04/2026', done: true },
      { label: 'Process mapping', date: '05/2026', done: true },
      { label: 'Prototype', date: '09/2026', done: false },
    ],
    documents: [{ doc: 'Charter_DocAutomation.docx', page: 1 }, { doc: 'Maps_Process_PTP_v2.xlsx' }],
    scenarioId: 'document-automation',
  },
  {
    id: 'prj-wms',
    code: 'WMS-25',
    name: 'Load unit review',
    status: 'in_progress',
    owner: 'Engineering department',
    period: 'Jan 2026 – Dec 2026',
    objective: 'Extend the pallet formats supported by WMS and LGV while maintaining current cycle times.',
    themes: ['EUR / ISO formats', 'LGV fork handling parameters'],
    exclusions: ['Fork hardware changes'],
    milestones: [
      { label: 'Specification', date: '03/2026', done: true },
      { label: 'Validation at the pilot plant', date: '11/2026', done: false },
    ],
    documents: [{ doc: 'Specifica_Funzionale_WMS_v3.2.pdf', page: 14 }],
    scenarioId: 'pallet',
  },
  {
    id: 'prj-lgv',
    code: 'LGV-27',
    name: 'LGV fleet predictive maintenance',
    status: 'planned',
    owner: 'Service',
    period: 'TBD',
    objective: 'Anticipate fleet failures using telemetry data.',
    themes: ['Telemetry', 'Maintenance scheduling'],
    exclusions: [],
    milestones: [{ label: 'Charter approval', date: 'TBD', done: false }],
    documents: [],
  },
]

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  in_progress: 'In progress',
  planned: 'Planned',
  closed: 'Closed',
}
