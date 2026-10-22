import type { Change, Citation, Entity, Relation, Scenario, Scope } from '../../types'

const CHARTER = 'Charter_DocAutomation.docx'
const MAPS = 'Maps_Process_PTP_v2.xlsx'
const KICKOFF = 'Verbale_Kickoff_DA.pdf'
const cite = (doc: string, page?: number, passage?: string): Citation => ({ doc, page, passage })

// ---- Process structure: Map → Process (codes are stable ids) -------------------
const structure: Entity[] = [
  { id: 'map-03', type: 'map', code: 'PTP.03', label: 'Procurement', parent: 'prj', sources: [cite(MAPS, undefined, 'Indice mappe')] },
  { id: 'map-04', type: 'map', code: 'PTP.04', label: 'Goods receipt', parent: 'prj', sources: [cite(MAPS, undefined, 'Indice mappe')] },
  { id: 'map-05', type: 'map', code: 'PTP.05', label: 'Supplier invoices', parent: 'prj', sources: [cite(MAPS, undefined, 'Indice mappe')] },
  { id: 'p-0307', type: 'process', code: 'PTP.03.07', label: 'Open order follow-up', parent: 'map-03', sources: [] },
  { id: 'p-0403', type: 'process', code: 'PTP.04.03', label: 'Delivery note acceptance', parent: 'map-04', sources: [] },
  { id: 'p-0404', type: 'process', code: 'PTP.04.04', label: 'Incoming inspection', parent: 'map-04', sources: [] },
  { id: 'p-0501', type: 'process', code: 'PTP.05.01', label: 'Invoice capture', parent: 'map-05', sources: [] },
  { id: 'p-0502', type: 'process', code: 'PTP.05.02', label: 'Invoice verification', parent: 'map-05', sources: [] },
  { id: 'p-0506', type: 'process', code: 'PTP.05.06', label: 'Accounting posting', parent: 'map-05', sources: [] },
]

const mapImpacts: [string, Scope, number, number][] = [
  ['map-05', 'direct', 0.93, 3],
  ['map-04', 'direct', 0.87, 3],
  ['map-03', 'indirect', 0.58, 4],
]
const processImpacts: [string, Scope, number][] = [
  ['p-0501', 'direct', 0.9], ['p-0502', 'direct', 0.91], ['p-0506', 'direct', 0.74],
  ['p-0403', 'direct', 0.86], ['p-0404', 'indirect', 0.57], ['p-0307', 'indirect', 0.52],
]

// ---- Activities: one row each. Adding a row adds it everywhere in the UI ----------
type Row = [id: string, process: string, label: string, roles: string[], systems: string[], change: Change, confidence: number, scope: Scope, src: Citation]
const rows: Row[] = [
  ['a-01', 'p-0501', 'Paper invoice digitization', ['r-fin'], ['s-ddm'], 'automated', 0.9, 'direct', cite(MAPS, undefined, 'PTP.05.01 · passo 2')],
  ['a-02', 'p-0501', 'Document archiving', ['r-fin'], ['s-docupro'], 'changed', 0.79, 'direct', cite(MAPS, undefined, 'PTP.05.01 · passo 4')],
  ['a-03', 'p-0501', 'Electronic invoice receipt', ['r-fin'], ['s-sdi', 's-ddm'], 'needs_review', 0.61, 'direct', cite(KICKOFF, 3, 'Il canale SDI resta da approfondire con IT.')],
  ['a-04', 'p-0502', 'Purchase order, goods receipt and invoice matching', ['r-fin'], ['s-erp', 's-ddm'], 'changed', 0.86, 'direct', cite(MAPS, undefined, 'PTP.05.02 · passo 1')],
  ['a-05', 'p-0502', 'Data completeness classification', ['r-fin'], ['s-ddm'], 'changed', 0.8, 'direct', cite(MAPS, undefined, 'PTP.05.02 · passo 3')],
  ['a-06', 'p-0502', 'Invoice data check without a purchase order', ['r-fin'], ['s-ddm'], 'automated', 0.92, 'direct', cite(CHARTER, 2, 'Priorità alle fatture non collegate a un ordine di acquisto.')],
  ['a-07', 'p-0502', 'Supplier master data and VAT verification', ['r-fin'], ['s-erp'], 'changed', 0.77, 'direct', cite(MAPS, undefined, 'PTP.05.02 · passo 6')],
  ['a-08', 'p-0506', 'Adjustment and credit note handling', ['r-buyer', 'r-wh'], ['s-ddm', 's-erp'], 'changed', 0.71, 'direct', cite(CHARTER, 2, 'Eccezioni e riconciliazioni nel perimetro.')],
  ['a-09', 'p-0403', 'Delivery note scanning', ['r-wh'], ['s-dms'], 'automated', 0.89, 'direct', cite(MAPS, undefined, 'PTP.04.03 · passo 1')],
  ['a-10', 'p-0403', 'Delivery note and purchase order reconciliation', ['r-wh'], ['s-erp'], 'automated', 0.84, 'direct', cite(MAPS, undefined, 'PTP.04.03 · passo 2')],
  ['a-11', 'p-0403', 'Received quantity confirmation', ['r-wh'], [], 'changed', 0.74, 'direct', cite(MAPS, undefined, 'PTP.04.03 · passo 3')],
  ['a-12', 'p-0404', 'Nonconforming goods inspection', ['r-qa'], ['s-erp'], 'changed', 0.55, 'indirect', cite(MAPS, undefined, 'PTP.04.04 · passo 2')],
  ['a-13', 'p-0307', 'Partial delivery follow-up', ['r-pc', 'r-wh'], ['s-erp'], 'changed', 0.52, 'indirect', cite(CHARTER, 2, 'Topic: solleciti verso fornitori.')],
]

const roles: [id: string, label: string, level: 'high' | 'medium' | 'low', scope: Scope, inCharter: boolean, ref: string | undefined, conf: number][] = [
  ['r-fin', 'Administration and Finance', 'high', 'direct', true, 'Charter §4 · Finance (IT, PL, US)', 0.94],
  ['r-wh', 'Warehouse and Logistics', 'high', 'direct', true, 'Charter §4 · Ricevimento merci', 0.88],
  ['r-buyer', 'Category buyer', 'medium', 'direct', true, 'Charter §4 · Acquisti', 0.7],
  ['r-qa', 'Quality', 'low', 'indirect', false, undefined, 0.55],
  ['r-pc', 'Purchasing coordination', 'low', 'indirect', false, undefined, 0.5],
]

const systems: [string, string, string][] = [
  ['s-ddm', 'DDM', 'Document intelligence platform (under evaluation)'],
  ['s-docupro', 'DocuPro', 'Document archive'],
  ['s-sdi', 'SDI', 'Electronic invoice exchange system'],
  ['s-erp', 'ERP (SAP)', 'Primary ERP system'],
  ['s-dms', 'DM-System', 'Warehouse document capture'],
]

const entities: Entity[] = [
  {
    id: 'prj', type: 'project', code: 'DA-26', label: 'Document Automation',
    subtitle: 'Design sprint · accounts payable and goods receipt', sources: [cite(CHARTER, 1)],
  },
  { id: 'doc-charter', type: 'document', label: CHARTER, subtitle: 'SharePoint › Projects › Document Automation', sources: [cite(CHARTER, 1)] },
  { id: 'doc-maps', type: 'document', label: MAPS, subtitle: 'PTP maps, revision 2', sources: [cite(MAPS)] },
  { id: 'doc-kickoff', type: 'document', label: KICKOFF, subtitle: 'Kickoff meeting minutes', sources: [cite(KICKOFF, 1)] },
  ...structure,
  ...rows.map(([id, parent, label]): Entity => ({ id, type: 'activity', label, parent, sources: [] })),
  ...roles.map(([id, label]): Entity => ({ id, type: 'role', label, sources: [] })),
  ...systems.map(([id, label, subtitle]): Entity => ({ id, type: 'system', label, subtitle, sources: [] })),
  { id: 'pe-sponsor', type: 'person', label: 'Project sponsor', subtitle: 'Finance department', sources: [cite(CHARTER, 1)] },
  { id: 'pe-pm', type: 'person', label: 'Project manager', subtitle: 'Design sprint coordination', sources: [cite(CHARTER, 1)] },
  { id: 'pe-it', type: 'person', label: 'IT contacts', subtitle: 'Three people, ERP integration', sources: [cite(CHARTER, 1)] },
  { id: 'ex-forn', type: 'external', label: 'Suppliers', subtitle: 'Incoming invoice and delivery note formats', sources: [] },
  { id: 'ex-consult', type: 'external', label: 'Consulting partner', subtitle: 'Sprint methodology support', sources: [cite(CHARTER, 1)] },
  { id: 't-nopo', type: 'topic', label: 'Invoices without a purchase order', sources: [cite(CHARTER, 2)] },
  { id: 't-exc', type: 'topic', label: 'Exceptions and reconciliations', sources: [cite(CHARTER, 2)] },
  { id: 't-part', type: 'topic', label: 'Partial deliveries', sources: [cite(CHARTER, 2)] },
  { id: 'c-geo', type: 'country', label: 'Italy · Poland · United States', sources: [cite(CHARTER, 1)] },
  { id: 'v-scope', type: 'constraint', label: 'Excluded: development and deployment', sources: [cite(CHARTER, 3)] },
  { id: 'v-legal', type: 'constraint', label: 'Excluded: legal and tax advice', sources: [cite(CHARTER, 3)] },
  { id: 'v-time', type: 'constraint', label: 'Prototype expected by September 2026', sources: [cite(CHARTER, 3)] },
]

const relations: Relation[] = [
  { from: 'doc-charter', to: 'prj', kind: 'source', confidence: 1, sources: [cite(CHARTER, 1)] },
  { from: 'doc-maps', to: 'prj', kind: 'source', confidence: 1, sources: [cite(MAPS)] },
  { from: 'doc-kickoff', to: 'prj', kind: 'source', confidence: 0.9, sources: [cite(KICKOFF, 1)] },
  ...mapImpacts.map(([to, scope, confidence, page]): Relation => ({
    from: 'prj', to, kind: 'impacts', scope, confidence, sources: [cite(CHARTER, page, 'Processes nel perimetro dello sprint')],
  })),
  ...processImpacts.map(([to, scope, confidence]): Relation => ({
    from: 'prj', to, kind: 'impacts', scope, confidence, sources: [cite(MAPS, undefined, `Foglio ${structure.find((s) => s.id === to)?.code}`)],
  })),
  ...rows.flatMap(([id, , , rs, ss, change, confidence, scope, src]): Relation[] => [
    { from: 'prj', to: id, kind: 'impacts', scope, change, confidence, sources: [src] },
    ...rs.map((r): Relation => ({ from: id, to: r, kind: 'performed_by', confidence, sources: [src] })),
    ...ss.map((s): Relation => ({ from: id, to: s, kind: 'uses_system', confidence, sources: [src] })),
  ]),
  ...roles.map(([id, , level, scope, inCharter, charterRef, confidence]): Relation => ({
    from: 'prj', to: id, kind: 'impacts', scope, level, inCharter, charterRef, confidence,
    sources: inCharter ? [cite(CHARTER, 4, charterRef)] : [cite(MAPS, undefined, 'Role presente nelle mappe downstream')],
  })),
  // Suppliers: formats of incoming documents. The invoice side has no citation yet.
  { from: 'p-0501', to: 'ex-forn', kind: 'impacts', scope: 'indirect', confidence: 0.45, sources: [] },
  { from: 'p-0403', to: 'ex-forn', kind: 'impacts', scope: 'indirect', confidence: 0.5, sources: [cite(KICKOFF, 2, 'Formati DDT eterogenei tra fornitori.')] },
  ...['pe-sponsor', 'pe-pm', 'pe-it', 'ex-consult'].map((from): Relation => ({
    from, to: 'prj', kind: 'belongs_to', confidence: 1, sources: [cite(CHARTER, 1)],
  })),
  ...['t-nopo', 't-exc', 't-part', 'c-geo', 'v-scope', 'v-legal', 'v-time'].map((from): Relation => ({
    from, to: 'prj', kind: 'belongs_to', confidence: 1, sources: [cite(CHARTER, 2)],
  })),
]

export const documentAutomation: Scenario = {
  id: 'document-automation',
  label: 'Project impacts · Document Automation',
  query: 'Which roles and processes are affected by the Document Automation project?',
  keywords: ['document', 'automation', 'project', 'invoice', 'ddt'],
  rootId: 'prj',
  scopeLabel: 'Scope: project charter · PTP maps',
  overview: [
    {
      text: 'The project mainly affects the Supplier invoices and Goods receipt maps: some activities are automated and others change in how they are performed.',
      cites: ['prj', 'map-05', 'map-04', 'doc-charter'],
    },
    {
      text: 'Administration and Finance is the most affected role, followed by Warehouse and Logistics; category buyers are involved in accounting adjustments.',
      cites: ['r-fin', 'r-wh', 'r-buyer'],
    },
    {
      text: 'Quality and Purchasing coordination are involved downstream through incoming inspection and follow-ups; neither role is listed in the charter.',
      cites: ['r-qa', 'r-pc', 'p-0404', 'p-0307'],
    },
  ],
  entities,
  relations,
}
