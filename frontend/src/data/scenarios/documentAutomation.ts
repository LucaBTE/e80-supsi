import type { Change, Citation, Entity, Relation, Scenario, Scope } from '../../types'

const CHARTER = 'Charter_DocAutomation.docx'
const MAPS = 'Mappe_Processo_PTP_v2.xlsx'
const KICKOFF = 'Verbale_Kickoff_DA.pdf'
const cite = (doc: string, page?: number, passage?: string): Citation => ({ doc, page, passage })

// ---- Process structure: Mappa → Processo (codes are stable ids) -------------------
const structure: Entity[] = [
  { id: 'map-03', type: 'mappa', code: 'PTP.03', label: 'Approvvigionamento', parent: 'prj', sources: [cite(MAPS, undefined, 'Indice mappe')] },
  { id: 'map-04', type: 'mappa', code: 'PTP.04', label: 'Ricevimento merci', parent: 'prj', sources: [cite(MAPS, undefined, 'Indice mappe')] },
  { id: 'map-05', type: 'mappa', code: 'PTP.05', label: 'Fatture passive', parent: 'prj', sources: [cite(MAPS, undefined, 'Indice mappe')] },
  { id: 'p-0307', type: 'processo', code: 'PTP.03.07', label: 'Follow-up ordini aperti', parent: 'map-03', sources: [] },
  { id: 'p-0403', type: 'processo', code: 'PTP.04.03', label: 'Accettazione documento di trasporto', parent: 'map-04', sources: [] },
  { id: 'p-0404', type: 'processo', code: 'PTP.04.04', label: 'Controllo in ingresso', parent: 'map-04', sources: [] },
  { id: 'p-0501', type: 'processo', code: 'PTP.05.01', label: 'Acquisizione fatture', parent: 'map-05', sources: [] },
  { id: 'p-0502', type: 'processo', code: 'PTP.05.02', label: 'Verifica fatture', parent: 'map-05', sources: [] },
  { id: 'p-0506', type: 'processo', code: 'PTP.05.06', label: 'Registrazione contabile', parent: 'map-05', sources: [] },
]

const mapImpacts: [string, Scope, number, number][] = [
  ['map-05', 'diretto', 0.93, 3],
  ['map-04', 'diretto', 0.87, 3],
  ['map-03', 'indiretto', 0.58, 4],
]
const processImpacts: [string, Scope, number][] = [
  ['p-0501', 'diretto', 0.9], ['p-0502', 'diretto', 0.91], ['p-0506', 'diretto', 0.74],
  ['p-0403', 'diretto', 0.86], ['p-0404', 'indiretto', 0.57], ['p-0307', 'indiretto', 0.52],
]

// ---- Activities: one row each. Adding a row adds it everywhere in the UI ----------
type Row = [id: string, process: string, label: string, roles: string[], systems: string[], change: Change, confidence: number, scope: Scope, src: Citation]
const rows: Row[] = [
  ['a-01', 'p-0501', 'Digitalizzazione fattura cartacea', ['r-fin'], ['s-ddm'], 'automatizzata', 0.9, 'diretto', cite(MAPS, undefined, 'PTP.05.01 · passo 2')],
  ['a-02', 'p-0501', 'Archiviazione del documento', ['r-fin'], ['s-docupro'], 'modificata', 0.79, 'diretto', cite(MAPS, undefined, 'PTP.05.01 · passo 4')],
  ['a-03', 'p-0501', 'Ricezione fattura elettronica', ['r-fin'], ['s-sdi', 's-ddm'], 'da_verificare', 0.61, 'diretto', cite(KICKOFF, 3, 'Il canale SDI resta da approfondire con IT.')],
  ['a-04', 'p-0502', 'Abbinamento ordine, entrata merci e fattura', ['r-fin'], ['s-erp', 's-ddm'], 'modificata', 0.86, 'diretto', cite(MAPS, undefined, 'PTP.05.02 · passo 1')],
  ['a-05', 'p-0502', 'Classificazione completezza dati', ['r-fin'], ['s-ddm'], 'modificata', 0.8, 'diretto', cite(MAPS, undefined, 'PTP.05.02 · passo 3')],
  ['a-06', 'p-0502', 'Controllo dati fattura senza ordine', ['r-fin'], ['s-ddm'], 'automatizzata', 0.92, 'diretto', cite(CHARTER, 2, 'Priorità alle fatture non collegate a un ordine di acquisto.')],
  ['a-07', 'p-0502', 'Verifica anagrafica fornitore e IVA', ['r-fin'], ['s-erp'], 'modificata', 0.77, 'diretto', cite(MAPS, undefined, 'PTP.05.02 · passo 6')],
  ['a-08', 'p-0506', 'Gestione rettifiche e note di credito', ['r-buyer', 'r-wh'], ['s-ddm', 's-erp'], 'modificata', 0.71, 'diretto', cite(CHARTER, 2, 'Eccezioni e riconciliazioni nel perimetro.')],
  ['a-09', 'p-0403', 'Scansione documento di trasporto', ['r-wh'], ['s-dms'], 'automatizzata', 0.89, 'diretto', cite(MAPS, undefined, 'PTP.04.03 · passo 1')],
  ['a-10', 'p-0403', 'Riconciliazione DDT con ordine', ['r-wh'], ['s-erp'], 'automatizzata', 0.84, 'diretto', cite(MAPS, undefined, 'PTP.04.03 · passo 2')],
  ['a-11', 'p-0403', 'Conferma quantità ricevute', ['r-wh'], [], 'modificata', 0.74, 'diretto', cite(MAPS, undefined, 'PTP.04.03 · passo 3')],
  ['a-12', 'p-0404', 'Ispezione merce non conforme', ['r-qa'], ['s-erp'], 'modificata', 0.55, 'indiretto', cite(MAPS, undefined, 'PTP.04.04 · passo 2')],
  ['a-13', 'p-0307', 'Sollecito per consegne parziali', ['r-pc', 'r-wh'], ['s-erp'], 'modificata', 0.52, 'indiretto', cite(CHARTER, 2, 'Tema: solleciti verso fornitori.')],
]

const roles: [id: string, label: string, level: 'alta' | 'media' | 'bassa', scope: Scope, inCharter: boolean, ref: string | undefined, conf: number][] = [
  ['r-fin', 'Amministrazione e Finanza', 'alta', 'diretto', true, 'Charter §4 · Finance (IT, PL, US)', 0.94],
  ['r-wh', 'Magazzino e Logistica', 'alta', 'diretto', true, 'Charter §4 · Ricevimento merci', 0.88],
  ['r-buyer', 'Buyer di categoria', 'media', 'diretto', true, 'Charter §4 · Acquisti', 0.7],
  ['r-qa', 'Qualità', 'bassa', 'indiretto', false, undefined, 0.55],
  ['r-pc', 'Coordinamento acquisti', 'bassa', 'indiretto', false, undefined, 0.5],
]

const systems: [string, string, string][] = [
  ['s-ddm', 'DDM', 'Piattaforma document intelligence (in valutazione)'],
  ['s-docupro', 'DocuPro', 'Archivio documentale'],
  ['s-sdi', 'SDI', 'Sistema di interscambio fatture elettroniche'],
  ['s-erp', 'ERP (SAP)', 'Gestionale di riferimento'],
  ['s-dms', 'DM-System', 'Acquisizione documenti di magazzino'],
]

const entities: Entity[] = [
  {
    id: 'prj', type: 'progetto', code: 'DA-26', label: 'Document Automation',
    subtitle: 'Design sprint · ciclo passivo e ricevimento merci', sources: [cite(CHARTER, 1)],
  },
  { id: 'doc-charter', type: 'documento', label: CHARTER, subtitle: 'SharePoint › Progetti › Document Automation', sources: [cite(CHARTER, 1)] },
  { id: 'doc-maps', type: 'documento', label: MAPS, subtitle: 'Mappe PTP, revisione 2', sources: [cite(MAPS)] },
  { id: 'doc-kickoff', type: 'documento', label: KICKOFF, subtitle: 'Verbale riunione di avvio', sources: [cite(KICKOFF, 1)] },
  ...structure,
  ...rows.map(([id, parent, label]): Entity => ({ id, type: 'attivita', label, parent, sources: [] })),
  ...roles.map(([id, label]): Entity => ({ id, type: 'ruolo', label, sources: [] })),
  ...systems.map(([id, label, subtitle]): Entity => ({ id, type: 'sistema', label, subtitle, sources: [] })),
  { id: 'pe-sponsor', type: 'persona', label: 'Sponsor di progetto', subtitle: 'Direzione finanziaria', sources: [cite(CHARTER, 1)] },
  { id: 'pe-pm', type: 'persona', label: 'Project manager', subtitle: 'Coordinamento design sprint', sources: [cite(CHARTER, 1)] },
  { id: 'pe-it', type: 'persona', label: 'Referenti IT', subtitle: 'Tre persone, integrazione con ERP', sources: [cite(CHARTER, 1)] },
  { id: 'ex-forn', type: 'esterno', label: 'Fornitori', subtitle: 'Formato di fatture e DDT in ingresso', sources: [] },
  { id: 'ex-consult', type: 'esterno', label: 'Partner di consulenza', subtitle: 'Supporto metodologico allo sprint', sources: [cite(CHARTER, 1)] },
  { id: 't-nopo', type: 'tema', label: 'Fatture senza ordine', sources: [cite(CHARTER, 2)] },
  { id: 't-exc', type: 'tema', label: 'Eccezioni e riconciliazioni', sources: [cite(CHARTER, 2)] },
  { id: 't-part', type: 'tema', label: 'Consegne parziali', sources: [cite(CHARTER, 2)] },
  { id: 'c-geo', type: 'paese', label: 'Italia · Polonia · Stati Uniti', sources: [cite(CHARTER, 1)] },
  { id: 'v-scope', type: 'vincolo', label: 'Escluso: sviluppo e messa in produzione', sources: [cite(CHARTER, 3)] },
  { id: 'v-legal', type: 'vincolo', label: 'Escluso: consulenza legale e fiscale', sources: [cite(CHARTER, 3)] },
  { id: 'v-time', type: 'vincolo', label: 'Prototipo atteso entro settembre 2026', sources: [cite(CHARTER, 3)] },
]

const relations: Relation[] = [
  { from: 'doc-charter', to: 'prj', kind: 'fonte', confidence: 1, sources: [cite(CHARTER, 1)] },
  { from: 'doc-maps', to: 'prj', kind: 'fonte', confidence: 1, sources: [cite(MAPS)] },
  { from: 'doc-kickoff', to: 'prj', kind: 'fonte', confidence: 0.9, sources: [cite(KICKOFF, 1)] },
  ...mapImpacts.map(([to, scope, confidence, page]): Relation => ({
    from: 'prj', to, kind: 'impatta', scope, confidence, sources: [cite(CHARTER, page, 'Processi nel perimetro dello sprint')],
  })),
  ...processImpacts.map(([to, scope, confidence]): Relation => ({
    from: 'prj', to, kind: 'impatta', scope, confidence, sources: [cite(MAPS, undefined, `Foglio ${structure.find((s) => s.id === to)?.code}`)],
  })),
  ...rows.flatMap(([id, , , rs, ss, change, confidence, scope, src]): Relation[] => [
    { from: 'prj', to: id, kind: 'impatta', scope, change, confidence, sources: [src] },
    ...rs.map((r): Relation => ({ from: id, to: r, kind: 'eseguita_da', confidence, sources: [src] })),
    ...ss.map((s): Relation => ({ from: id, to: s, kind: 'usa_sistema', confidence, sources: [src] })),
  ]),
  ...roles.map(([id, , level, scope, inCharter, charterRef, confidence]): Relation => ({
    from: 'prj', to: id, kind: 'impatta', scope, level, inCharter, charterRef, confidence,
    sources: inCharter ? [cite(CHARTER, 4, charterRef)] : [cite(MAPS, undefined, 'Ruolo presente nelle mappe a valle')],
  })),
  // Suppliers: formats of incoming documents. The invoice side has no citation yet.
  { from: 'p-0501', to: 'ex-forn', kind: 'impatta', scope: 'indiretto', confidence: 0.45, sources: [] },
  { from: 'p-0403', to: 'ex-forn', kind: 'impatta', scope: 'indiretto', confidence: 0.5, sources: [cite(KICKOFF, 2, 'Formati DDT eterogenei tra fornitori.')] },
  ...['pe-sponsor', 'pe-pm', 'pe-it', 'ex-consult'].map((from): Relation => ({
    from, to: 'prj', kind: 'appartiene', confidence: 1, sources: [cite(CHARTER, 1)],
  })),
  ...['t-nopo', 't-exc', 't-part', 'c-geo', 'v-scope', 'v-legal', 'v-time'].map((from): Relation => ({
    from, to: 'prj', kind: 'appartiene', confidence: 1, sources: [cite(CHARTER, 2)],
  })),
]

export const documentAutomation: Scenario = {
  id: 'document-automation',
  label: 'Impatti di progetto · Document Automation',
  query: 'Quali ruoli e processi tocca il progetto Document Automation?',
  keywords: ['document', 'automation', 'progetto', 'fattur', 'ddt'],
  rootId: 'prj',
  scopeLabel: 'Perimetro: charter di progetto · mappe PTP',
  overview: [
    {
      text: 'Il progetto interviene soprattutto sulle mappe Fatture passive e Ricevimento merci: parte delle attività viene automatizzata, il resto cambia nel modo di esecuzione.',
      cites: ['prj', 'map-05', 'map-04', 'doc-charter'],
    },
    {
      text: 'Amministrazione e Finanza è il ruolo più esposto, seguito da Magazzino e Logistica; i buyer di categoria entrano in gioco sulle rettifiche contabili.',
      cites: ['r-fin', 'r-wh', 'r-buyer'],
    },
    {
      text: 'A valle risultano coinvolti Qualità e Coordinamento acquisti, attraverso il controllo in ingresso e i solleciti; nessuno dei due ruoli compare nel charter.',
      cites: ['r-qa', 'r-pc', 'p-0404', 'p-0307'],
    },
  ],
  entities,
  relations,
}
