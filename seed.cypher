// =====================================================================
// E80 GraphRAG - prebuilt sample database (schema in src/e80kb/schema.py)
// Data taken from the documents in Projects/ and Processes/.
// Idempotent: uses MERGE only, safe to run again.
//
// How to run:
//   cypher-shell -u neo4j -p <password> -f seed.cypher
//   or paste everything into Neo4j Browser (multi-statement enabled)
// =====================================================================

// Reset. WARNING: deletes the whole database. Uncomment only if needed.
// MATCH (n) DETACH DELETE n

// ---------- Constraints on the source layer, indexes on domain keys ----------
// No uniqueness on domain labels: neo4j-graphrag writes a node per extraction
// and merges duplicates afterwards (see src/e80kb/db.py init_schema).
CREATE CONSTRAINT source_name    IF NOT EXISTS FOR (n:Source)   REQUIRE n.name IS UNIQUE;
CREATE CONSTRAINT document_id    IF NOT EXISTS FOR (n:Document) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT chunk_id       IF NOT EXISTS FOR (n:Chunk)    REQUIRE n.id IS UNIQUE;

// =====================================================================
// LAYER 2 - DOMAIN: nodes
// =====================================================================

// status = latest phase folder present in the project
UNWIND [
  {name:'Document Automation', status:'HLD'},
  {name:'Rinnovi Offerte H24', code:'173', status:'UAT'},
  {name:'Service Proposal',    code:'132', status:'Opening'},
  {name:'Qualifica fornitori', status:'UAT'},
  {name:'Project 73 - Plant',  code:'73'}
] AS x
MERGE (n:Project {name:x.name}) SET n += x;

// Level 2 names are not in the files: for now name = code
UNWIND [
  {code:'PTP',       name:'Procure to Pay', level:1},
  {code:'PTP.01',    name:'PTP.01', level:2},
  {code:'PTP.01.01', name:'Supplier Qualification', level:3},
  {code:'PTP.01.01 > Internal review', name:'Internal review', level:4},
  {code:'PTP.01.02', name:'Supplier Onboarding', level:3},
  {code:'PTP.04',    name:'PTP.04', level:2},
  {code:'PTP.04.03', name:'Goods receipt', level:3},
  {code:'PTP.04.07', name:'Put-away Coordination', level:3},
  {code:'PTP.04.07 (EL80)', name:'Put-away Coordination - EL80', level:4},
  {code:'PTP.04.07 (ELCS)', name:'Put-away Coordination - ELCS', level:4},
  {code:'PTP.05',    name:'PTP.05', level:2},
  {code:'PTP.05.02', name:'Invoice Validation', level:3},
  {code:'PTP.05.02 (Invoice linked to a PO)', name:'Invoice Validation - linked to a PO', level:4},
  {code:'PTP.05.02 (Invoice without a PO)',   name:'Invoice Validation - without a PO', level:4},
  {code:'LTC',          name:'Lead to Cash', level:1},
  {code:'LTC.04',       name:'LTC.04', level:2},
  {code:'LTC.04.01',    name:'Quotation', level:3},
  {code:'LTC.04.01.v1', name:'New equipment quotation', level:4},
  {code:'LTC.04.01.v4', name:'Create Service quotation', level:4},
  {code:'LTC.04.01.v8', name:'H24 renewal quotation', level:4}
] AS x
MERGE (n:Process {code:x.code}) SET n += x;

UNWIND ['Procurement', 'Administration & Finance', 'IT', 'Legal', 'HSE', 'Quality', 'Customer Service'] AS x
MERGE (:OrgUnit {name:x});

UNWIND [
  ['Service Owner', null],
  ['Buyer', 'Procurement'],
  ['Department', null],
  ['Supplier', null],
  ['Accounts Payable', 'Administration & Finance'],
  ['Sales Area Manager', 'Customer Service']
] AS x
MERGE (r:Role {name:x[0]})
WITH r, x WHERE x[1] IS NOT NULL
MATCH (o:OrgUnit {name:x[1]})
MERGE (r)-[:IN]->(o);

UNWIND [
  {code:'EL80', name:'E80 Group S.p.A.'},
  {code:'ELCS'}
] AS x
MERGE (n:Company {code:x.code}) SET n += x;

UNWIND [
  {name:'SAP',          aliases:['ERP', 'ERP-System']},
  {name:'Salesforce',   aliases:['SFDC', 'CRM']},
  {name:'ProcessUnity', aliases:['Process Unity', 'Supplier qualification - SW']},
  {name:'DDM',          aliases:[]},
  {name:'SDI',          aliases:['Sistema di Interscambio']},
  {name:'SAGE',         aliases:[]},
  {name:'Configuratore Excel', aliases:['Configurator', 'tool Ghinelli']}
] AS x
MERGE (n:System {name:x.name}) SET n += x;

UNWIND ['Invoice', 'Purchase Order', 'Goods Receipt', 'Delivery Note (DDT)', 'Quote',
        'Opportunity', 'Contract', 'Asset', 'Vendor', 'NDA'] AS x
MERGE (:BusinessObject {name:x});

UNWIND ['Ammagamma', 'Accenture', 'Reply', 'Cybercel'] AS x
MERGE (:Organization {name:x});

UNWIND [
  {name:'Luca Mondini',       aliases:['Mondini Luca'], unit:'IT'},
  {name:'Massimo Albertario', title:'CFO', unit:'Administration & Finance'},
  {name:'Caterina Rota'},
  {name:'Roberto Sansiveri'},
  {name:'Andrea Ghinelli'},
  {name:'Stephane Lanfrey',   aliases:['Lanfrey Stephane']},
  {name:'Sahil Minhas'},
  {name:'Franco De Angelis',  aliases:['De Angelis Franco']},
  {name:'Riccardo Zucchetti', aliases:['Zucchetti Riccardo']},
  {name:'Fabio Righettini'},
  {name:'Aurora Montanino'},
  {name:'Andrea Giorgini',    aliases:['Giorgini Andrea']},
  {name:'Sonia Santini',      org:'Ammagamma'}
] AS x
MERGE (p:Person {name:x.name})
SET p.aliases = coalesce(x.aliases, []), p.title = x.title
WITH p, x
OPTIONAL MATCH (u:OrgUnit {name:x.unit})
OPTIONAL MATCH (o:Organization {name:x.org})
FOREACH (_ IN CASE WHEN u IS NULL THEN [] ELSE [1] END | MERGE (p)-[:MEMBER_OF]->(u))
FOREACH (_ IN CASE WHEN o IS NULL THEN [] ELSE [1] END | MERGE (p)-[:MEMBER_OF]->(o));

UNWIND [
  {id:'173/RQ-002', project:'Rinnovi Offerte H24', title:'Prevention of Duplicate Renewal Process', priority:'High', status:'In revision'},
  {id:'132/RQ-001', project:'Service Proposal', title:'Quotations with integrated price lists', priority:'High', status:'BBP'},
  {id:'132/RQ-002', project:'Service Proposal', title:'Creation of the quotation document from CRM', priority:'Medium', status:'BBP'},
  {id:'132/RQ-004', project:'Service Proposal', title:'Availability of relevant customer master data', priority:'Low', status:'BBP'}
] AS x
MERGE (q:Requirement {id:x.id})
SET q.title = x.title, q.priority = x.priority, q.status = x.status
WITH q, x
MATCH (p:Project {name:x.project})
MERGE (p)-[:HAS_REQ]->(q);

UNWIND [
  {id:'173/TST-003', project:'Rinnovi Offerte H24', title:'Existing open H24 Opportunity blocks renewal', result:'OK', date:date('2026-09-25')},
  {id:'Qualifica fornitori/TC-1.1.1', project:'Qualifica fornitori', title:'Richiesta Nuova Fornitura - bottone Check Supplier Availability', result:'KO', date:date('2026-06-26')},
  {id:'Qualifica fornitori/TC-1.1.2', project:'Qualifica fornitori', title:'Richiesta Nuova Fornitura - invio al procurement', result:'OK', date:date('2026-06-26')},
  {id:'Qualifica fornitori/TC-1.2.1', project:'Qualifica fornitori', title:'Valutazione Supplier Availability - bottone Retrieve NDA Data', result:'KO', date:date('2026-06-26')}
] AS x
MERGE (t:TestCase {id:x.id})
SET t.title = x.title, t.result = x.result, t.date = x.date
WITH t, x
MATCH (p:Project {name:x.project})
MERGE (p)-[:HAS_TEST]->(t);

UNWIND [
  {id:'ISS-001', description:'Invoices without a purchase order posted manually (Excel + batch input FB60)'},
  {id:'ISS-002', description:'Automatic renewal may create duplicate Offer and Quote records'}
] AS x
MERGE (i:Issue {id:x.id}) SET i.description = x.description;

// =====================================================================
// LAYER 2 - DOMAIN: processes and activities
// =====================================================================

UNWIND [
  ['PTP.01', 'PTP'], ['PTP.01.01', 'PTP.01'], ['PTP.01.02', 'PTP.01'],
  ['PTP.01.01 > Internal review', 'PTP.01.01'],
  ['PTP.04', 'PTP'], ['PTP.04.03', 'PTP.04'], ['PTP.04.07', 'PTP.04'],
  ['PTP.05', 'PTP'], ['PTP.05.02', 'PTP.05'],
  ['LTC.04', 'LTC'], ['LTC.04.01', 'LTC.04']
] AS r
MATCH (a:Process {code:r[0]}), (b:Process {code:r[1]})
MERGE (a)-[:PART_OF]->(b);

UNWIND [
  ['PTP.05.02 (Invoice linked to a PO)', 'PTP.05.02'],
  ['PTP.05.02 (Invoice without a PO)',   'PTP.05.02'],
  ['PTP.04.07 (EL80)', 'PTP.04.07'],
  ['PTP.04.07 (ELCS)', 'PTP.04.07'],
  ['LTC.04.01.v1', 'LTC.04.01'],
  ['LTC.04.01.v4', 'LTC.04.01'],
  ['LTC.04.01.v8', 'LTC.04.01']
] AS r
MATCH (a:Process {code:r[0]}), (b:Process {code:r[1]})
MERGE (a)-[:VARIANT_OF]->(b);

UNWIND [
  ['PTP.01.01', 'EL80'],
  ['PTP.05.02 (Invoice linked to a PO)', 'EL80'],
  ['PTP.04.07 (EL80)', 'EL80'],
  ['PTP.04.07 (ELCS)', 'ELCS'],
  ['LTC.04.01.v8', 'EL80']
] AS r
MATCH (p:Process {code:r[0]}), (c:Company {code:r[1]})
MERGE (p)-[:RUNS_AT]->(c);

// BPMN lane -> role. seq = order in the diagram.
UNWIND [
  {process:'PTP.01.01', seq:1, name:'New Supplier qualification request',     role:'Service Owner'},
  {process:'PTP.01.01', seq:2, name:'Supplier availability analysis',         role:'Buyer'},
  {process:'PTP.01.01', seq:3, name:'Supplier NDA management',                role:'Buyer'},
  {process:'PTP.01.01', seq:4, name:'Inherent Risk evaluation',               role:'Buyer'},
  {process:'PTP.01.01', seq:5, name:'Questionnaire completion',               role:'Supplier'},
  {process:'PTP.01.01', seq:6, name:'Internal review',                        role:'Department', kind:'subprocess'},
  {process:'PTP.01.01', seq:7, name:'Financial risk assessment',              role:'Buyer'},
  {process:'PTP.01.01', seq:8, name:'Scorecard and Contract data management', role:'Buyer'},
  {process:'PTP.01.01', seq:9, name:'Audit management',                       role:'Service Owner'},
  {process:'PTP.05.02 (Invoice linked to a PO)', seq:1, name:'Check data completeness',                role:'Accounts Payable'},
  {process:'PTP.05.02 (Invoice linked to a PO)', seq:2, name:'Perform 3-Way Matching (PO-GR-Invoice)', role:'Accounts Payable'},
  {process:'PTP.05.02 (Invoice linked to a PO)', seq:3, name:'Auto-post',                              role:'Accounts Payable'},
  {process:'LTC.04.01.v8', seq:1, name:'Create new quote', role:'Sales Area Manager'},
  {process:'LTC.04.01.v8', seq:2, name:'Run the tool',     role:'Sales Area Manager'},
  {process:'LTC.04.01.v8', seq:3, name:'Send offer',       role:'Sales Area Manager'}
] AS x
MERGE (a:Activity {id: x.process + '#' + x.name})
SET a.name = x.name, a.seq = x.seq, a.kind = coalesce(x.kind, 'task')
WITH a, x
MATCH (p:Process {code:x.process}), (r:Role {name:x.role})
MERGE (p)-[:HAS_STEP]->(a)
MERGE (a)-[:DONE_BY]->(r);

// Linear flow by seq. The real BPMN gateways will come from the loader.
MATCH (p:Process)-[:HAS_STEP]->(a:Activity)
WITH p, a ORDER BY a.seq
WITH p, collect(a) AS steps
UNWIND range(0, size(steps) - 2) AS i
WITH steps[i] AS a, steps[i + 1] AS b
MERGE (a)-[:NEXT]->(b);

MATCH (a:Activity {id:'PTP.01.01#Internal review'}), (p:Process {code:'PTP.01.01 > Internal review'})
MERGE (a)-[:CALLS]->(p);

// Lane "Supplier qualification - SW" = ProcessUnity
MATCH (:Process {code:'PTP.01.01'})-[:HAS_STEP]->(a:Activity), (s:System {name:'ProcessUnity'})
MERGE (a)-[:USES]->(s);

UNWIND [
  ['PTP.05.02 (Invoice linked to a PO)#Check data completeness',                'DDM', null],
  ['PTP.05.02 (Invoice linked to a PO)#Perform 3-Way Matching (PO-GR-Invoice)', 'SAP', 'MIRO'],
  ['PTP.05.02 (Invoice linked to a PO)#Auto-post',                              'SAP', null],
  ['LTC.04.01.v8#Create new quote', 'Salesforce', null],
  ['LTC.04.01.v8#Run the tool',     'Configuratore Excel', null],
  ['LTC.04.01.v8#Send offer',       'Salesforce', null]
] AS r
MATCH (a:Activity {id:r[0]}), (s:System {name:r[1]})
MERGE (a)-[u:USES]->(s)
SET u.transaction = r[2];

UNWIND [
  ['PTP.01.01#Supplier NDA management',                                         'CREATES', 'NDA'],
  ['PTP.01.01#Scorecard and Contract data management',                          'UPDATES', 'Vendor'],
  ['PTP.05.02 (Invoice linked to a PO)#Check data completeness',                'READS',   'Invoice'],
  ['PTP.05.02 (Invoice linked to a PO)#Perform 3-Way Matching (PO-GR-Invoice)', 'READS',   'Purchase Order'],
  ['PTP.05.02 (Invoice linked to a PO)#Perform 3-Way Matching (PO-GR-Invoice)', 'READS',   'Goods Receipt'],
  ['PTP.05.02 (Invoice linked to a PO)#Perform 3-Way Matching (PO-GR-Invoice)', 'READS',   'Invoice'],
  ['PTP.05.02 (Invoice linked to a PO)#Auto-post',                              'UPDATES', 'Invoice'],
  ['LTC.04.01.v8#Create new quote', 'CREATES', 'Quote'],
  ['LTC.04.01.v8#Run the tool',     'READS',   'Asset'],
  ['LTC.04.01.v8#Send offer',       'UPDATES', 'Quote']
] AS r
MATCH (a:Activity {id:r[0]}), (b:BusinessObject {name:r[2]})
FOREACH (_ IN CASE r[1] WHEN 'CREATES' THEN [1] ELSE [] END | MERGE (a)-[:CREATES]->(b))
FOREACH (_ IN CASE r[1] WHEN 'READS'   THEN [1] ELSE [] END | MERGE (a)-[:READS]->(b))
FOREACH (_ IN CASE r[1] WHEN 'UPDATES' THEN [1] ELSE [] END | MERGE (a)-[:UPDATES]->(b));

UNWIND [
  ['SAP', 'Invoice'], ['SAP', 'Purchase Order'], ['SAP', 'Goods Receipt'], ['SAP', 'Vendor'],
  ['Salesforce', 'Quote'], ['Salesforce', 'Opportunity'], ['Salesforce', 'Contract'], ['Salesforce', 'Asset'],
  ['ProcessUnity', 'NDA']
] AS r
MATCH (s:System {name:r[0]}), (b:BusinessObject {name:r[1]})
MERGE (s)-[:MASTERS]->(b);

// =====================================================================
// LAYER 2 - DOMAIN: projects
// =====================================================================

UNWIND [
  ['Document Automation', 'PTP.05.02', null],
  ['Document Automation', 'PTP.04.03', null],
  ['Rinnovi Offerte H24', 'LTC.04.01.v8', 'h24-charter-rev1#2'],
  ['Qualifica fornitori', 'PTP.01.01', null],
  ['Qualifica fornitori', 'PTP.01.02', null],
  ['Service Proposal',    'LTC.04.01.v1', null],
  ['Service Proposal',    'LTC.04.01.v4', null]
] AS r
MATCH (p:Project {name:r[0]}), (q:Process {code:r[1]})
MERGE (p)-[c:CHANGES]->(q)
SET c.evidence = CASE WHEN r[2] IS NULL THEN [] ELSE [r[2]] END;

UNWIND [
  ['Document Automation', 'SAP'],
  ['Rinnovi Offerte H24', 'Salesforce'],
  ['Service Proposal',    'Salesforce'],
  ['Qualifica fornitori', 'ProcessUnity']
] AS r
MATCH (p:Project {name:r[0]}), (s:System {name:r[1]})
MERGE (p)-[:CHANGES]->(s);

MATCH (a:Project {name:'Service Proposal'}), (b:Project {name:'Project 73 - Plant'})
MERGE (a)-[d:DEPENDS_ON]->(b)
SET d.evidence = ['sp132-reqmatrix-en#RQ-004'];

UNWIND [
  ['Luca Mondini',       'Document Automation', 'PM'],
  ['Massimo Albertario', 'Document Automation', 'sponsor'],
  ['Caterina Rota',      'Document Automation', 'stakeholder'],
  ['Sonia Santini',      'Document Automation', 'team'],
  ['Roberto Sansiveri',  'Rinnovi Offerte H24', 'PM'],
  ['Andrea Ghinelli',    'Rinnovi Offerte H24', 'sponsor'],
  ['Stephane Lanfrey',   'Rinnovi Offerte H24', 'sponsor'],
  ['Sahil Minhas',       'Rinnovi Offerte H24', 'team'],
  ['Franco De Angelis',  'Rinnovi Offerte H24', 'stakeholder'],
  ['Franco De Angelis',  'Service Proposal',    'stakeholder'],
  ['Riccardo Zucchetti', 'Service Proposal',    'stakeholder'],
  ['Fabio Righettini',   'Service Proposal',    'stakeholder'],
  ['Aurora Montanino',   'Qualifica fornitori', 'tester'],
  ['Andrea Giorgini',    'Qualifica fornitori', 'tester']
] AS r
MATCH (x:Person {name:r[0]}), (p:Project {name:r[1]})
MERGE (x)-[w:WORKS_ON]->(p)
SET w.role = r[2];

UNWIND [
  ['Ammagamma', 'Document Automation', 'partner'],
  ['Accenture', 'Document Automation', 'partner'],
  ['Reply',     'Document Automation', 'Invoice RPA proposal'],
  ['Cybercel',  'Qualifica fornitori', 'partner']
] AS r
MATCH (o:Organization {name:r[0]}), (p:Project {name:r[1]})
MERGE (o)-[w:WORKS_ON]->(p)
SET w.role = r[2];

UNWIND [
  ['Riccardo Zucchetti', '132/RQ-001'], ['Riccardo Zucchetti', '132/RQ-002'],
  ['Franco De Angelis',  '132/RQ-001'], ['Franco De Angelis',  '132/RQ-002'],
  ['Fabio Righettini',   '132/RQ-004']
] AS r
MATCH (x:Person {name:r[0]}), (q:Requirement {id:r[1]})
MERGE (x)-[:REQUESTED]->(q);

UNWIND [
  ['173/RQ-002', 'Quote'], ['173/RQ-002', 'Opportunity'],
  ['132/RQ-001', 'Quote'], ['132/RQ-002', 'Quote']
] AS r
MATCH (q:Requirement {id:r[0]}), (b:BusinessObject {name:r[1]})
MERGE (q)-[:IMPACTS]->(b);

UNWIND [
  ['173/RQ-002', 'Salesforce'], ['132/RQ-001', 'Salesforce'],
  ['132/RQ-002', 'Salesforce'], ['132/RQ-004', 'Salesforce']
] AS r
MATCH (q:Requirement {id:r[0]}), (s:System {name:r[1]})
MERGE (q)-[:IMPACTS]->(s);

MATCH (q:Requirement {id:'173/RQ-002'}), (p:Process {code:'LTC.04.01.v8'})
MERGE (q)-[:IMPACTS]->(p);

MATCH (t:TestCase {id:'173/TST-003'}), (q:Requirement {id:'173/RQ-002'})
MERGE (t)-[:VERIFIES]->(q);

UNWIND [
  ['Qualifica fornitori/TC-1.1.1', 'PTP.01.01#New Supplier qualification request'],
  ['Qualifica fornitori/TC-1.1.2', 'PTP.01.01#New Supplier qualification request'],
  ['Qualifica fornitori/TC-1.2.1', 'PTP.01.01#Supplier availability analysis']
] AS r
MATCH (t:TestCase {id:r[0]}), (a:Activity {id:r[1]})
MERGE (t)-[:TESTS]->(a);

UNWIND [
  ['Sahil Minhas',     '173/TST-003'],
  ['Stephane Lanfrey', '173/TST-003'],
  ['Aurora Montanino', 'Qualifica fornitori/TC-1.1.1'],
  ['Aurora Montanino', 'Qualifica fornitori/TC-1.1.2'],
  ['Andrea Giorgini',  'Qualifica fornitori/TC-1.2.1']
] AS r
MATCH (x:Person {name:r[0]}), (t:TestCase {id:r[1]})
MERGE (x)-[:EXECUTED]->(t);

UNWIND [
  ['ISS-001', 'PTP.05.02 (Invoice without a PO)', 'docauto-recap-20260408-ap-it#1'],
  ['ISS-002', 'LTC.04.01.v8', 'h24-charter-rev1#1']
] AS r
MATCH (i:Issue {id:r[0]}), (p:Process {code:r[1]})
MERGE (i)-[a:AFFECTS]->(p)
SET a.evidence = [r[2]];

UNWIND [['ISS-001', 'SAP'], ['ISS-002', 'Salesforce']] AS r
MATCH (i:Issue {id:r[0]}), (s:System {name:r[1]})
MERGE (i)-[:AFFECTS]->(s);

// =====================================================================
// LAYER 1 - SOURCES: documents, chunks, FROM_CHUNK links
// ACLs and source excerpts are prebuilt sample data; no ingestion is needed.
// =====================================================================

UNWIND ['sharepoint', 'signavio', 'devops'] AS x
MERGE (:Source {name:x});

UNWIND [
  {id:'h24-charter-rev1', source:'sharepoint', project:'Rinnovi Offerte H24',
   path:'Projects/Rinnovi Offerte H24/01. Project opening/H24 OFFERS - Project Charter_Rev1.pdf',
   title:'H24 OFFERS - Project Charter', type:'Charter', format:'pdf', lang:'en', rev:'Rev1', phase:'01. Project opening', acl:'Internal'},
  {id:'h24-bbp-rev2', source:'sharepoint', project:'Rinnovi Offerte H24',
   path:'Projects/Rinnovi Offerte H24/04. Business Blueprint/173_H24 OFFERS - Business Blueprint_Rev2.docx',
   title:'173_H24 OFFERS - Business Blueprint', type:'BBP', format:'docx', lang:'en', rev:'Rev2', phase:'04. Business Blueprint', acl:'Internal'},
  {id:'h24-bbp-rev3', source:'sharepoint', project:'Rinnovi Offerte H24',
   path:'Projects/Rinnovi Offerte H24/04. Business Blueprint/173_H24 OFFERS - Business Blueprint_Rev3.docx',
   title:'173_H24 OFFERS - Business Blueprint', type:'BBP', format:'docx', lang:'en', rev:'Rev3', phase:'04. Business Blueprint', acl:'Internal'},
  {id:'h24-testbook-rev1', source:'sharepoint', project:'Rinnovi Offerte H24',
   path:'Projects/Rinnovi Offerte H24/05. UAT & Training/173_H24 OFFERS RENEWAL ÔÇô Testbook_Rev1.xlsx',
   title:'173_H24 OFFERS RENEWAL - Testbook', type:'Testbook', format:'xlsx', lang:'en', rev:'Rev1', phase:'05. UAT & Training', acl:'Internal'},
  {id:'sp132-reqmatrix-en', source:'sharepoint', project:'Service Proposal',
   path:'Projects/Service Proposal/01. Project Opening/132- CS Proposal review-Requirements Matrix - EN.xlsx',
   title:'132 - CS Proposal review - Requirements Matrix', type:'ReqMatrix', format:'xlsx', lang:'en', phase:'01. Project Opening', acl:'Internal'},
  {id:'docauto-charter', source:'sharepoint', project:'Document Automation',
   path:'Projects/Document Automation/01. Project opening/Document automation - Project Charter.docx',
   title:'Document automation - Project Charter', type:'Charter', format:'docx', lang:'en', phase:'01. Project opening', acl:'Internal'},
  {id:'docauto-recap-20260408-ap-it', source:'sharepoint', project:'Document Automation',
   path:'Projects/Document Automation/02. High Level Design/20260408 Liability cycle (invoices) - IT/20260408_SupplierInvocises_IT_Recap.docx',
   title:'Recap design sprint - fatture passive IT', type:'Recap', format:'docx', lang:'it', date:date('2026-04-08'), phase:'02. High Level Design', acl:'Internal'},
  {id:'qf-testbook-20260626', source:'sharepoint', project:'Qualifica fornitori',
   path:'Projects/Qualifica fornitori/05. UAT & Training/Testbook_qualifica fornitori 26-06-2026.xlsx',
   title:'Testbook qualifica fornitori', type:'Testbook', format:'xlsx', lang:'it', date:date('2026-06-26'), phase:'05. UAT & Training', acl:'Internal'},
  {id:'ptp-01-01-map', source:'signavio', process:'PTP.01.01',
   path:'Processes/PTP.01/PTP.01.01/PTP.01.01 - Supplier Qualification.pdf',
   title:'PTP.01.01 - Supplier Qualification', type:'ProcessMap', format:'pdf', lang:'en', acl:'Internal'}
] AS x
MERGE (d:Document {id:x.id})
SET d += x {.path, .title, .type, .format, .lang, .rev, .date, .phase, .acl}
WITH d, x
MATCH (s:Source {name:x.source})
MERGE (d)-[:FROM]->(s)
WITH d, x
OPTIONAL MATCH (p:Project {name:x.project})
OPTIONAL MATCH (q:Process {code:x.process})
FOREACH (_ IN CASE WHEN p IS NULL THEN [] ELSE [1] END | MERGE (d)-[:ABOUT]->(p))
FOREACH (_ IN CASE WHEN q IS NULL THEN [] ELSE [1] END | MERGE (d)-[:ABOUT]->(q));

MATCH (new:Document {id:'h24-bbp-rev3'}), (old:Document {id:'h24-bbp-rev2'})
MERGE (new)-[:NEW_REV_OF]->(old);

UNWIND [
  {id:'h24-charter-rev1#1', doc:'h24-charter-rev1', seq:1, loc:'p.1 Goal',
   text:'Start H24 renewals on time. Reduce user manual work. Prevent duplicate commercial records and activity.'},
  {id:'h24-charter-rev1#2', doc:'h24-charter-rev1', seq:2, loc:'p.1 Objectives',
   text:'Create new Opportunity and Quote automatically three months before Contract expiry date.'},
  {id:'docauto-recap-20260408-ap-it#1', doc:'docauto-recap-20260408-ap-it', seq:1, loc:'Meeting notes',
   text:'La contabilizzazione delle fatture passive avviene con ordine sottostante (transazione MIRO) e senza ordine (gestite manualmente tramite FB60).'},
  {id:'sp132-reqmatrix-en#RQ-004', doc:'sp132-reqmatrix-en', seq:4, loc:'Requirements Matrix, row RQ-004',
   text:'RQ-004 Availability of relevant customer master data. Constraints: dependent on master-data quality and Project 73 - Plant.'},
  {id:'h24-testbook-rev1#TST-003', doc:'h24-testbook-rev1', seq:3, loc:'Test Case Planning & Execution, row TST-003',
   text:'TST-003 Duplicate prevention. Prevent duplicate creation when an open H24 Opportunity exists for the same Plant. Result OK.'},
  {id:'ptp-01-01-map#1', doc:'ptp-01-01-map', seq:1, loc:'p.1',
   text:'PTP.01.01 - Supplier Qualification. Lanes: Service Owner, Buyer, Department, Supplier. System lane: Supplier qualification - SW.'}
] AS x
MERGE (c:Chunk {id:x.id})
SET c.text = x.text, c.loc = x.loc, c.index = x.seq
WITH c, x
MATCH (d:Document {id:x.doc})
MERGE (c)-[:FROM_DOCUMENT]->(d);

MATCH (c:Chunk)-[:FROM_DOCUMENT]->(d:Document)
WITH d, c ORDER BY c.index
WITH d, collect(c) AS chunks
UNWIND range(0, size(chunks) - 2) AS i
WITH chunks[i] AS a, chunks[i + 1] AS b
MERGE (a)-[:NEXT_CHUNK]->(b);

// [chunk, label, key]. The key can be name, code or id.
UNWIND [
  ['h24-charter-rev1#1', 'Issue', 'ISS-002'],
  ['h24-charter-rev1#2', 'BusinessObject', 'Opportunity'],
  ['h24-charter-rev1#2', 'BusinessObject', 'Quote'],
  ['h24-charter-rev1#2', 'BusinessObject', 'Contract'],
  ['docauto-recap-20260408-ap-it#1', 'System', 'SAP'],
  ['docauto-recap-20260408-ap-it#1', 'Issue', 'ISS-001'],
  ['sp132-reqmatrix-en#RQ-004', 'Requirement', '132/RQ-004'],
  ['sp132-reqmatrix-en#RQ-004', 'Project', 'Project 73 - Plant'],
  ['h24-testbook-rev1#TST-003', 'TestCase', '173/TST-003'],
  ['h24-testbook-rev1#TST-003', 'BusinessObject', 'Opportunity'],
  ['ptp-01-01-map#1', 'Process', 'PTP.01.01'],
  ['ptp-01-01-map#1', 'System', 'ProcessUnity'],
  ['ptp-01-01-map#1', 'Role', 'Buyer']
] AS r
MATCH (c:Chunk {id:r[0]})
MATCH (e) WHERE r[1] IN labels(e) AND r[2] IN [e.name, e.code, e.id]
MERGE (e)-[:FROM_CHUNK]->(c);

// Additional sample excerpts make every seeded document consultable.
// These passages describe the demo graph; they are not original file contents.
UNWIND [
  {doc:'docauto-charter', text:'Demo document: Document Automation is linked to SAP and processes PTP.05.02 and PTP.04.03. Luca Mondini is the PM and Massimo Albertario is the sponsor. Accenture and Ammagamma are partners.'},
  {doc:'h24-bbp-rev2', text:'Demo document: project Rinnovi Offerte H24, code 173, covers Salesforce and Opportunity and Quote renewals based on Contract records.'},
  {doc:'h24-bbp-rev3', text:'Demo document: Rinnovi Offerte H24 automatically creates Opportunity and Quote records three months before Contract expiry. Test TST-003 verifies duplicate prevention.'},
  {doc:'qf-testbook-20260626', text:'Demo document: Qualifica fornitori is linked to process PTP.01.01 Supplier Qualification and the ProcessUnity system. The process involves Buyer and Service Owner.'}
] AS x
MATCH (d:Document {id:x.doc})
MERGE (c:Chunk {id:x.doc + '#demo'})
SET c.text = x.text, c.loc = 'Demo excerpt', c.index = 1
MERGE (c)-[:FROM_DOCUMENT]->(d);

UNWIND [
  ['docauto-charter', 'Project', 'Document Automation'],
  ['docauto-charter', 'System', 'SAP'],
  ['docauto-charter', 'Person', 'Luca Mondini'],
  ['docauto-charter', 'Person', 'Massimo Albertario'],
  ['h24-bbp-rev2', 'Project', 'Rinnovi Offerte H24'],
  ['h24-bbp-rev3', 'Project', 'Rinnovi Offerte H24'],
  ['h24-bbp-rev3', 'System', 'Salesforce'],
  ['qf-testbook-20260626', 'Project', 'Qualifica fornitori'],
  ['qf-testbook-20260626', 'Process', 'PTP.01.01'],
  ['qf-testbook-20260626', 'System', 'ProcessUnity']
] AS x
MATCH (c:Chunk {id:x[0] + '#demo'})
MATCH (n) WHERE x[1] IN labels(n) AND x[2] IN [n.name, n.code, n.id]
MERGE (n)-[:FROM_CHUNK]->(c);

// Domain nodes carry __Entity__, like the ones neo4j-graphrag writes.
MATCH (n)
WHERE any(l IN labels(n) WHERE l IN ['Project', 'Process', 'Activity', 'Role', 'Person', 'OrgUnit', 'Company',
  'Organization', 'System', 'BusinessObject', 'Requirement', 'TestCase', 'Issue'])
SET n:__Entity__;

// =====================================================================
// Useful queries (run by hand, one at a time)
// =====================================================================
//
// 1. Schema as a meta-graph (labels + relationship types):
//    CALL db.schema.visualization()
//
// 2. The whole domain, without chunks:
//    MATCH (n)-[r]->(m) WHERE NOT n:Chunk AND NOT m:Chunk RETURN n, r, m
//
// 3. Impact: if I change Quote, which activities, roles, processes and projects do I touch?
//    MATCH (b:BusinessObject {name:'Quote'})<-[:CREATES|READS|UPDATES]-(a:Activity)-[:DONE_BY]->(r:Role),
//          (p:Process)-[:HAS_STEP]->(a)
//    OPTIONAL MATCH (prj:Project)-[:CHANGES]->(p)
//    RETURN b, a, r, p, prj
//
// 4. Traceability: from the test to the requirement, the project and the source document:
//    MATCH (t:TestCase {id:'173/TST-003'})-[:VERIFIES]->(q:Requirement)<-[:HAS_REQ]-(p:Project)
//    OPTIONAL MATCH (t)-[:FROM_CHUNK]->(c:Chunk)-[:FROM_DOCUMENT]->(d:Document)
//    RETURN t, q, p, c, d
//
// 5. Who do I call about a Salesforce change?
//    MATCH (s:System {name:'Salesforce'})<-[:CHANGES]-(p:Project)<-[w:WORKS_ON]-(x:Person)
//    RETURN s.name AS system, p.name AS project, x.name AS person, w.role AS role
