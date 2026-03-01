-- Migration 012: ISO 14001 – Checklist legislativa Ambiente & Sicurezza
-- Data: 2026-03-01
-- 2 sezioni, 46 domande (display_order 2–47).
-- section_code univoci (iso14001_s4, iso14001_s5) per evitare conflitti con ISO 9001.
-- Idempotente: usa MERGE sulle sezioni e WHERE NOT EXISTS sulle domande.

USE SGQ_ISO9001;
GO

-- 0. Verifica stato PRIMA
SELECT 'PRIMA' AS fase,
    (SELECT COUNT(*) FROM checklist_questions WHERE standard_id = 2) AS total_questions,
    (SELECT COUNT(*) FROM checklist_questions WHERE standard_id = 2 AND is_active = 1) AS active_questions;
GO

-- 1. Upsert sezioni ISO 14001
MERGE checklist_sections AS target
USING (VALUES
    ('iso14001_s4', '4 – AMBIENTE E SICUREZZA', 2, 1),
    ('iso14001_s5', '5. AMBIENTE',               2, 2)
) AS source(section_code, section_title, standard_id, display_order)
ON target.section_code = source.section_code
WHEN MATCHED THEN
    UPDATE SET
        section_title  = source.section_title,
        standard_id    = source.standard_id,
        display_order  = source.display_order
WHEN NOT MATCHED THEN
    INSERT (section_code, section_title, standard_id, display_order)
    VALUES (source.section_code, source.section_title, source.standard_id, source.display_order);
GO

-- 2. Inserisci le 46 domande (idempotente: salta se già esistente come attiva)
DECLARE @questions14001 TABLE (
    section_code  NVARCHAR(50),
    question_text NVARCHAR(MAX),
    display_order INT
);

INSERT INTO @questions14001 VALUES
-- Sezione iso14001_s4: 4 – AMBIENTE E SICUREZZA (13 domande, display_order 2–14)
('iso14001_s4', 'EDILIZIA/AGIBILITA''',                                                                      2),
('iso14001_s4', 'INDUSTRIE INSALUBRI',                                                                        3),
('iso14001_s4', 'IMPIANTI TERMICI',                                                                           4),
('iso14001_s4', 'INCIDENTI RILEVANTI',                                                                        5),
('iso14001_s4', 'PREVENZIONE INCENDI / RISCHIO INCENDI',                                                      6),
('iso14001_s4', 'PIANO DI EMERGENZA',                                                                         7),
('iso14001_s4', 'ADDETTI ALLE EMERGENZE',                                                                     8),
('iso14001_s4', 'GAS TOSSICI',                                                                                9),
('iso14001_s4', 'AMIANTO E RELATIVI RISCHI',                                                                 10),
('iso14001_s4', 'TRASPORTO MATERIALI PERICOLOSI (ADR / RID)',                                                11),
('iso14001_s4', 'SOSTANZE E PREPARATI PERICOLOSI / RISCHIO CHIMICO PER LA SALUTE E LA SICUREZZA',           12),
('iso14001_s4', 'PCB / PCT',                                                                                 13),
('iso14001_s4', 'RADIAZIONI IONIZZANTI E RELATIVI RISCHI',                                                   14),
-- Sezione iso14001_s5: 5. AMBIENTE (33 domande, display_order 15–47)
('iso14001_s5', 'VALUTAZIONE IMPATTO AMBIENTALE (VIA) e VALUTAZIONE AMBIENTALE STRATEGICA (VAS)',            15),
('iso14001_s5', 'AUTORIZZAZIONE INTEGRATA AMBIENTALE (AIA) e IPPC',                                         16),
('iso14001_s5', 'AUTORIZZAZIONE UNICA AMBIENTALE (AUA)',                                                     17),
('iso14001_s5', 'APPROVVIGIONAMENTO IDRICO',                                                                 18),
('iso14001_s5', 'SCARICHI IDRICI',                                                                           19),
('iso14001_s5', 'QUALITA'' DELL''ARIA',                                                                      20),
('iso14001_s5', 'EMISSIONI IN ATMOSFERA',                                                                    21),
('iso14001_s5', 'EMISSIONI ODORIGENE',                                                                       22),
('iso14001_s5', 'RIFIUTI',                                                                                   23),
('iso14001_s5', 'GESTIONE IMBALLAGGI (CONAI E CONSORZI DI FILIERA)',                                         24),
('iso14001_s5', 'DISCARICHE E IMPIANTI DI INCENERIMENTO',                                                    25),
('iso14001_s5', 'TERRE E ROCCE DA SCAVO',                                                                    26),
('iso14001_s5', 'BONIFICA SITI CONTAMINATI',                                                                 27),
('iso14001_s5', 'CONTAMINAZIONE SUOLO E SOTTOSUOLO (Serbatoi Interrati)',                                    28),
('iso14001_s5', 'GAS AD EFFETTO SERRA E LESIVI DELL''OZONO',                                                 29),
('iso14001_s5', 'INQUINAMENTO ACUSTICO',                                                                     30),
('iso14001_s5', 'GESTIONE ENERGETICA ED ENERGY MANAGER',                                                     31),
('iso14001_s5', 'MOBILITY MANAGER',                                                                          32),
('iso14001_s5', 'INQUINAMENTO ELETTROMAGNETICO',                                                             33),
('iso14001_s5', 'INQUINAMENTO LUMINOSO',                                                                     34),
('iso14001_s5', 'SOSTENIBILITA'' / CORPORATE SUSTAINABILITY REPORTING DIRECTIVE (CSRD)',                     35),
('iso14001_s5', 'MEDI IMPIANTI DI COMBUSTIONE',                                                              36),
('iso14001_s5', 'GRANDI IMPIANTI DI COMBUSTIONE',                                                            37),
('iso14001_s5', 'ATTIVITA'' DI GESTIONE DEI RIFIUTI ED IMPIANTI DI RECUPERO (art. 208 e segg. D.Lgs. 152/06)', 38),
('iso14001_s5', 'OLI USATI',                                                                                 39),
('iso14001_s5', 'RIFIUTI SANITARI/ORIGINE ANIMALE, SOTTOPRODOTTI DI ORIGINE ANIMALE',                       40),
('iso14001_s5', 'UTILIZZO FANGHI IN AGRICOLTURA',                                                            41),
('iso14001_s5', 'SOTTOPRODOTTI',                                                                             42),
('iso14001_s5', 'ATTIVITA'' DI AUTOSMALTIMENTO DI RIFIUTI PERICOLOSI',                                       43),
('iso14001_s5', 'RISPARMIO ED EFFICIENZA ENERGETICA',                                                        44),
('iso14001_s5', 'EUDR, European Union Deforestation Regulation',                                             45),
('iso14001_s5', 'PPWR (Packaging and Packaging Waste Regulation)',                                           46),
('iso14001_s5', 'Prescrizioni AIA, AUA',                                                                     47);

-- INSERT solo se la combinazione section_code+question_text non esiste già come attiva
INSERT INTO checklist_questions
    (standard_id, section_code, question_text, question_type, is_mandatory, display_order, is_active, created_at, updated_at)
SELECT
    2, q.section_code, q.question_text, 'text', 1, q.display_order, 1, GETDATE(), GETDATE()
FROM @questions14001 q
WHERE NOT EXISTS (
    SELECT 1 FROM checklist_questions existing
    WHERE existing.standard_id    = 2
      AND existing.section_code   = q.section_code
      AND existing.question_text  = q.question_text
      AND existing.is_active      = 1
);
GO

-- 3. Verifica stato DOPO
SELECT 'DOPO' AS fase,
    (SELECT COUNT(*) FROM checklist_questions WHERE standard_id = 2) AS total_questions,
    (SELECT COUNT(*) FROM checklist_questions WHERE standard_id = 2 AND is_active = 1) AS active_questions;
GO

-- 4. Mostra question_id assegnati (serve per aggiornare checklistTemplates.js)
SELECT
    cq.question_id,
    cs.section_code,
    cs.section_title,
    cq.display_order,
    cq.question_text
FROM checklist_questions cq
JOIN checklist_sections cs ON cs.section_code = cq.section_code
WHERE cq.standard_id = 2 AND cq.is_active = 1
ORDER BY cq.display_order;
GO

PRINT '✅ Migration 012 completata: 46 domande ISO 14001 attive (2 sezioni)';
PRINT '   → Aggiornare checklistTemplates.js con i question_id assegnati (Step 4 sopra)';
