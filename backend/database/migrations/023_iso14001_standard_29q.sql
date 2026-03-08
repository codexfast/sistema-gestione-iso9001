-- Migration 023: ISO 14001:2015 — Checklist sistematica da norma (clausole 4→10)
-- Data: 2026-03-08
-- 7 sezioni, 29 domande seguendo la struttura della norma UNI EN ISO 14001:2015
-- Fonte: Normative/Normative NORMA_00003_ UNI EN ISO 14001_2015 Rev. 0.pdf
--
-- OPERAZIONI:
-- 1. Soft-delete delle 46 domande legislative (iso14001_s4/s5) → is_active=0
-- 2. Disattivazione sezioni legislative legacy (is_active=0)
-- 3. Creazione 7 nuove sezioni per clausole 4→10
-- 4. Inserimento 29 domande basate sui requisiti della norma
--
-- Idempotente: rieseguibile senza danni

USE SGQ_ISO9001;
GO

-- 0. Verifica stato PRIMA
SELECT 'PRIMA' AS fase,
    (SELECT COUNT(*) FROM checklist_sections WHERE standard_id = 2) AS sections_count,
    (SELECT COUNT(*) FROM checklist_sections WHERE standard_id = 2 AND is_active = 1) AS sections_active,
    (SELECT COUNT(*) FROM checklist_questions WHERE standard_id = 2) AS total_questions,
    (SELECT COUNT(*) FROM checklist_questions WHERE standard_id = 2 AND is_active = 1) AS active_questions;
GO

-- 1. Soft-delete domande legislative ISO 14001 (iso14001_s4 e iso14001_s5)
--    Le risposte degli audit esistenti rimangono intatte (FK preservata)
UPDATE checklist_questions
SET is_active = 0, updated_at = GETDATE()
WHERE standard_id = 2
  AND section_code IN ('iso14001_s4', 'iso14001_s5');
GO

-- 2. Disattiva sezioni legislative legacy (non compaiono più nell'app)
UPDATE checklist_sections
SET is_active = 0
WHERE standard_id = 2
  AND section_code IN ('iso14001_s4', 'iso14001_s5');
GO

-- 3. Crea (o riattiva) le 7 sezioni ISO 14001:2015 basate sulle clausole 4→10
MERGE checklist_sections AS target
USING (VALUES
    ('14001_c4',  '4 – Contesto dell''Organizzazione',  2, 1),
    ('14001_c5',  '5 – Leadership',                      2, 2),
    ('14001_c6',  '6 – Pianificazione',                  2, 3),
    ('14001_c7',  '7 – Supporto',                        2, 4),
    ('14001_c8',  '8 – Attività Operative',              2, 5),
    ('14001_c9',  '9 – Valutazione delle Prestazioni',   2, 6),
    ('14001_c10', '10 – Miglioramento',                  2, 7)
) AS source(section_code, section_title, standard_id, display_order)
ON target.section_code = source.section_code AND target.standard_id = source.standard_id
WHEN MATCHED THEN
    UPDATE SET
        section_title = source.section_title,
        is_active     = 1,
        display_order = source.display_order
WHEN NOT MATCHED THEN
    INSERT (section_code, section_title, standard_id, display_order, is_active)
    VALUES (source.section_code, source.section_title, source.standard_id, source.display_order, 1);
GO

-- 4. Inserisci le 29 domande ISO 14001:2015
DECLARE @questions TABLE (
    section_code  NVARCHAR(50),
    question_text NVARCHAR(MAX),
    display_order INT
);

INSERT INTO @questions VALUES
-- =====================================================================
-- Clausola 4 – Contesto dell'Organizzazione  (4 domande)
-- =====================================================================
('14001_c4',  'Comprendere l''organizzazione e il suo contesto (fattori interni ed esterni, condizioni ambientali rilevanti)',   1),
('14001_c4',  'Esigenze e aspettative delle parti interessate rilevanti per il SGA e obblighi di conformità che ne derivano',   2),
('14001_c4',  'Campo di applicazione del sistema di gestione ambientale (confini, unità organizzative, attività e servizi)',     3),
('14001_c4',  'Istituzione, attuazione, mantenimento e miglioramento continuo del sistema di gestione ambientale',               4),
-- =====================================================================
-- Clausola 5 – Leadership  (3 domande)
-- =====================================================================
('14001_c5',  'Leadership e impegno dell''alta direzione nel SGA (responsabilità, risorse, miglioramento continuo)',            5),
('14001_c5',  'Politica ambientale (appropriata al contesto, impegni, comunicazione, disponibilità alle parti interessate)',    6),
('14001_c5',  'Ruoli, responsabilità e autorità per la conformità al SGA e per il reporting alla direzione',                    7),
-- =====================================================================
-- Clausola 6 – Pianificazione  (6 domande)
-- =====================================================================
('14001_c6',  'Azioni per affrontare rischi e opportunità — determinazione e gestione delle situazioni di emergenza ambientale', 8),
('14001_c6',  'Aspetti ambientali delle attività, prodotti e servizi — identificazione, valutazione significatività, ciclo di vita', 9),
('14001_c6',  'Obblighi di conformità — requisiti legali e altri requisiti applicabili agli aspetti ambientali',                10),
('14001_c6',  'Pianificazione delle azioni per aspetti significativi, obblighi di conformità e rischi/opportunità identificati', 11),
('14001_c6',  'Obiettivi ambientali (coerenti con politica, misurabili, monitorati, comunicati, aggiornati)',                   12),
('14001_c6',  'Pianificazione per il raggiungimento degli obiettivi ambientali (cosa, risorse, responsabile, tempi, indicatori)', 13),
-- =====================================================================
-- Clausola 7 – Supporto  (7 domande)
-- =====================================================================
('14001_c7',  'Risorse necessarie per istituzione, attuazione, mantenimento e miglioramento del SGA',                          14),
('14001_c7',  'Competenza del personale con impatto sulla prestazione ambientale e sull''adempimento degli obblighi',           15),
('14001_c7',  'Consapevolezza del personale (politica ambientale, aspetti significativi, contributo personale, implicazioni NC)', 16),
('14001_c7',  'Comunicazione interna ed esterna — processi per cosa, quando, con chi e come comunicare',                        17),
('14001_c7',  'Informazioni documentate richieste dalla norma e da esigenze proprie del SGA',                                   18),
('14001_c7',  'Creazione e aggiornamento delle informazioni documentate (identificazione, formato, riesame, approvazione)',      19),
('14001_c7',  'Controllo delle informazioni documentate (disponibilità, protezione, distribuzione, conservazione, eliminazione)', 20),
-- =====================================================================
-- Clausola 8 – Attività Operative  (2 domande)
-- =====================================================================
('14001_c8',  'Pianificazione e controllo operativi — criteri operativi, prospettiva di ciclo di vita, gestione fornitori e appaltatori', 21),
('14001_c8',  'Preparazione e risposta alle emergenze ambientali (piano, prove periodiche, riesame post-emergenza, formazione)', 22),
-- =====================================================================
-- Clausola 9 – Valutazione delle Prestazioni  (4 domande)
-- =====================================================================
('14001_c9',  'Monitoraggio, misurazione, analisi e valutazione della prestazione ambientale (KPI, strumenti tarati, comunicazione)', 23),
('14001_c9',  'Valutazione della conformità agli obblighi di conformità (frequenza, azioni, conoscenza dello stato)',           24),
('14001_c9',  'Programma di audit interno (frequenza, metodi, responsabilità, obiettività, reporting ai livelli pertinenti)',    25),
('14001_c9',  'Riesame di direzione del SGA (input: cambiamenti, obiettivi, NC/AC, audit; output: decisioni e azioni)',         26),
-- =====================================================================
-- Clausola 10 – Miglioramento  (3 domande)
-- =====================================================================
('14001_c10', 'Determinazione delle opportunità di miglioramento della prestazione ambientale',                                 27),
('14001_c10', 'Non conformità e azioni correttive (controllo NC, analisi cause, efficacia AC, impatti ambientali, modifiche SGA)', 28),
('14001_c10', 'Miglioramento continuo dell''idoneità, adeguatezza ed efficacia del sistema di gestione ambientale',             29);

-- INSERT idempotente: salta se la combinazione section_code+question_text esiste già come attiva
INSERT INTO checklist_questions
    (standard_id, section_code, question_text, question_type, is_mandatory, display_order, is_active, created_at, updated_at)
SELECT
    2, q.section_code, q.question_text, 'text', 1, q.display_order, 1, GETDATE(), GETDATE()
FROM @questions q
WHERE NOT EXISTS (
    SELECT 1 FROM checklist_questions existing
    WHERE existing.standard_id    = 2
      AND existing.section_code   = q.section_code
      AND existing.question_text  = q.question_text
      AND existing.is_active      = 1
);
GO

-- 5. Verifica stato DOPO
SELECT 'DOPO' AS fase,
    (SELECT COUNT(*) FROM checklist_sections WHERE standard_id = 2) AS sections_count,
    (SELECT COUNT(*) FROM checklist_sections WHERE standard_id = 2 AND is_active = 1) AS sections_active,
    (SELECT COUNT(*) FROM checklist_questions WHERE standard_id = 2) AS total_questions,
    (SELECT COUNT(*) FROM checklist_questions WHERE standard_id = 2 AND is_active = 1) AS active_questions;
GO

-- 6. Mostra riepilogo domande inserite (da usare per aggiornare clauseRef nel template Word)
SELECT
    cs.section_code,
    cs.section_title,
    cs.display_order AS sez_order,
    cq.question_id,
    cq.display_order AS q_order,
    cq.question_text
FROM checklist_questions cq
JOIN checklist_sections cs
    ON cs.section_code = cq.section_code
    AND cs.standard_id = cq.standard_id
WHERE cq.standard_id = 2
  AND cq.is_active   = 1
ORDER BY cs.display_order, cq.display_order;
GO

PRINT '✅ Migration 023 completata: 29 domande ISO 14001:2015 in 7 sezioni (clausole 4→10)';
PRINT '   → 46 domande legislative (iso14001_s4/s5) in soft-delete (audit esistenti preservati)';
PRINT '   → Aggiornare clauseRef nel template Word dopo aver verificato i question_id assegnati';
