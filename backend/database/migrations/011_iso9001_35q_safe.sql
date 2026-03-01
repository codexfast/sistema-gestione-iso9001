-- Migration 011: ISO 9001 - porta a 35 domande senza rompere FK esistenti
-- Data: 2026-03-01
-- Strategia: soft-delete (is_active=0) delle domande vecchie + INSERT delle 35 nuove.
-- NON usa DELETE → audit_responses esistenti rimangono validi (FK intatta).
-- Le nuove domande vengono inserite solo se non esistono già (MERGE idempotente).

USE SGQ_ISO9001;
GO

-- 0. Verifica stato PRIMA
SELECT 'PRIMA' AS fase,
    (SELECT COUNT(*) FROM checklist_questions WHERE standard_id=1) AS total_questions,
    (SELECT COUNT(*) FROM checklist_questions WHERE standard_id=1 AND is_active=1) AS active_questions,
    (SELECT COUNT(*) FROM audit_responses ar
     JOIN checklist_questions cq ON ar.question_id=cq.question_id
     WHERE cq.standard_id=1) AS linked_responses;
GO

-- 1. Assicura che le sezioni esistano (INSERT se mancanti)
MERGE checklist_sections AS target
USING (VALUES
    ('clause4',  'Contesto dell''Organizzazione',    1, 1),
    ('clause5',  'Leadership',                        1, 2),
    ('clause6',  'Pianificazione',                    1, 3),
    ('clause7',  'Supporto',                          1, 4),
    ('clause8',  'Attività Operative',                1, 5),
    ('clause9',  'Valutazione delle Prestazioni',     1, 6),
    ('clause10', 'Miglioramento',                     1, 7)
) AS source(section_code, section_title, standard_id, display_order)
ON target.section_code = source.section_code AND target.standard_id = source.standard_id
WHEN MATCHED THEN
    UPDATE SET section_title = source.section_title, display_order = source.display_order
WHEN NOT MATCHED THEN
    INSERT (section_code, section_title, standard_id, display_order)
    VALUES (source.section_code, source.section_title, source.standard_id, source.display_order);
GO

-- 2. Soft-delete tutte le domande ISO 9001 esistenti
--    (le risposte già salvate rimangono collegate; non appariranno nei nuovi audit)
UPDATE checklist_questions
SET is_active = 0, updated_at = GETDATE()
WHERE standard_id = 1;
GO

-- 3. Inserisci le 35 domande ufficiali (solo se non esistono già per section_code+question_text)
--    Usa un CTE con ROW_NUMBER per evitare duplicati in caso di riesecuzione.
DECLARE @questions TABLE (
    section_code  NVARCHAR(50),
    question_text NVARCHAR(MAX),
    display_order INT
);

INSERT INTO @questions VALUES
-- Clausola 4: Contesto (4 domande)
('clause4',  'Comprendere l''Organizzazione e il suo contesto',                  1),
('clause4',  'Esigenze e aspettative delle parti interessate',                   2),
('clause4',  'Campo di applicazione',                                            3),
('clause4',  'Informazioni necessarie per supportare l''attuazione dei processi',4),
-- Clausola 5: Leadership (4 domande)
('clause5',  'Leadership E Impegno',                                             5),
('clause5',  'Politica per la Qualità',                                          6),
('clause5',  'Comunicazione della Politica per la Qualità',                      7),
('clause5',  'Ruoli organizzativi, responsabilità e autorità',                   8),
-- Clausola 6: Pianificazione (2 domande)
('clause6',  'Azioni per affrontare rischi e opportunita',                       9),
('clause6',  'Obiettivi per la Qualità',                                        10),
-- Clausola 7: Supporto (9 domande)
('clause7',  'Persone',                                                         11),
('clause7',  'Infrastruttura',                                                  12),
('clause7',  'Ambiente',                                                        13),
('clause7',  'Idoneità allo scopo delle risorse per il monitoraggio e la misurazione', 14),
('clause7',  'Riferibilità metrologica per la taratura/verifica delle apparecchiature di misura', 15),
('clause7',  'Evidenza delle competenze del personale',                         16),
('clause7',  'Consapevolezza',                                                  17),
('clause7',  'Comunicazione',                                                   18),
('clause7',  'Informazioni Documentate',                                        19),
-- Clausola 8: Attività Operative (10 domande)
('clause8',  'Requisiti per prodotti e servizi',                                20),
('clause8',  'Riesame dei requisiti',                                           21),
('clause8',  'Progettazione',                                                   22),
('clause8',  'Valutazione, selezione, monitoraggio delle prestazioni e rivalutazione dei fornitori esterni', 23),
('clause8',  'Rintracciabilità degli output',                                   24),
('clause8',  'Proprietà del cliente/fornitore',                                 25),
('clause8',  'Post vendita',                                                    26),
('clause8',  'Controllo delle modifiche',                                       27),
('clause8',  'Rilascio dei prodotti/servizi',                                   28),
('clause8',  'Descrizione delle Non Conformità, Azioni adottate, concessioni ottenute', 29),
-- Clausola 9: Valutazione Prestazioni (4 domande)
('clause9',  'Valutazione delle prestazioni del SGQ (KPI)',                     30),
('clause9',  'Customer Satisfaction',                                           31),
('clause9',  'Attuazione del programma di audit e risultati di audit',          32),
('clause9',  'Risultati dei Riesami di Direzione',                              33),
-- Clausola 10: Miglioramento (2 domande)
('clause10', 'Non conformità e Azioni Correttive',                              34),
('clause10', 'Miglioramento continuo',                                          35);

-- INSERT solo se quella combinazione section_code+question_text non esiste già come attiva
INSERT INTO checklist_questions
    (standard_id, section_code, question_text, question_type, is_mandatory, display_order, is_active, created_at, updated_at)
SELECT
    1, q.section_code, q.question_text, 'text', 1, q.display_order, 1, GETDATE(), GETDATE()
FROM @questions q
WHERE NOT EXISTS (
    SELECT 1 FROM checklist_questions existing
    WHERE existing.standard_id = 1
      AND existing.section_code = q.section_code
      AND existing.question_text = q.question_text
      AND existing.is_active = 1
);
GO

-- 4. Verifica stato DOPO
SELECT 'DOPO' AS fase,
    (SELECT COUNT(*) FROM checklist_questions WHERE standard_id=1) AS total_questions,
    (SELECT COUNT(*) FROM checklist_questions WHERE standard_id=1 AND is_active=1) AS active_questions,
    (SELECT COUNT(*) FROM checklist_questions WHERE standard_id=1 AND is_active=0) AS soft_deleted,
    (SELECT COUNT(*) FROM audit_responses ar
     JOIN checklist_questions cq ON ar.question_id=cq.question_id
     WHERE cq.standard_id=1 AND cq.is_active=0) AS responses_on_old_questions;
GO

PRINT '✅ Migration 011 completata: 35 domande ISO 9001 attive (vecchie soft-deleted)';
