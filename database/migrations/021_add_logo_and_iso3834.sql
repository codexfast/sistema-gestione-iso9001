-- ============================================================
-- Migration 021: Logo azienda + Standard ISO 3834-2
-- Data: 2026-03-01
-- ============================================================

-- ============================================================
-- PARTE 1: Aggiunta campo logo_url alla tabella companies
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'companies' AND COLUMN_NAME = 'logo_url'
)
BEGIN
    ALTER TABLE companies ADD logo_url NVARCHAR(500) NULL;
    PRINT 'Colonna logo_url aggiunta a companies';
END
ELSE
    PRINT 'Colonna logo_url gia presente';

-- ============================================================
-- PARTE 2: Nuovo standard ISO 3834-2
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM standards WHERE standard_code = 'ISO_3834_2')
BEGIN
    INSERT INTO standards (standard_code, standard_name, standard_full_name, version, category, is_active, description, created_at)
    VALUES (
        'ISO_3834_2',
        'ISO 3834-2:2021',
        'Requisiti di qualita per la saldatura per fusione - Parte 2: Requisiti completi',
        '2021',
        'welding',
        1,
        'Requisiti di qualita per la saldatura per fusione dei materiali metallici - Parte 2: Requisiti di qualita completi',
        GETDATE()
    );
    PRINT 'Standard ISO 3834-2 inserito';
END
ELSE
    PRINT 'Standard ISO 3834-2 gia presente';

DECLARE @std_id INT = (SELECT standard_id FROM standards WHERE standard_code = 'ISO_3834_2');
PRINT 'ISO 3834-2 standard_id = ' + CAST(@std_id AS NVARCHAR);

-- ============================================================
-- PARTE 3: Sezioni ISO 3834-2
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM checklist_sections WHERE standard_id = @std_id AND section_code = '3834_s1')
BEGIN
    INSERT INTO checklist_sections (standard_id, section_code, section_title, parent_section_code, display_order, is_active, created_at)
    VALUES (@std_id, '3834_s1', N'GESTIONE QUALITA''', NULL, 1, 1, GETDATE());
    PRINT 'Sezione 3834_s1 inserita';
END

IF NOT EXISTS (SELECT 1 FROM checklist_sections WHERE standard_id = @std_id AND section_code = '3834_s2')
BEGIN
    INSERT INTO checklist_sections (standard_id, section_code, section_title, parent_section_code, display_order, is_active, created_at)
    VALUES (@std_id, '3834_s2', N'CONTROLLO DOCUMENTALE', NULL, 2, 1, GETDATE());
    PRINT 'Sezione 3834_s2 inserita';
END

IF NOT EXISTS (SELECT 1 FROM checklist_sections WHERE standard_id = @std_id AND section_code = '3834_s3')
BEGIN
    INSERT INTO checklist_sections (standard_id, section_code, section_title, parent_section_code, display_order, is_active, created_at)
    VALUES (@std_id, '3834_s3', N'ISPEZIONE IN CAMPO', NULL, 3, 1, GETDATE());
    PRINT 'Sezione 3834_s3 inserita';
END

IF NOT EXISTS (SELECT 1 FROM checklist_sections WHERE standard_id = @std_id AND section_code = '3834_s4')
BEGIN
    INSERT INTO checklist_sections (standard_id, section_code, section_title, parent_section_code, display_order, is_active, created_at)
    VALUES (@std_id, '3834_s4', N'CONTROLLI POST-SALDATURA', NULL, 4, 1, GETDATE());
    PRINT 'Sezione 3834_s4 inserita';
END

-- ============================================================
-- PARTE 4: Domande ISO 3834-2 (22 domande)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM checklist_questions WHERE standard_id = @std_id)
BEGIN

    -- SEZIONE 1: GESTIONE QUALITA' (6 domande)
    INSERT INTO checklist_questions (standard_id, section_code, question_text, question_type, display_order, is_mandatory, is_active, created_at, updated_at)
    VALUES
    (@std_id, '3834_s1', N'Il fornitore e in possesso di certificazione UNI EN ISO 9001?',                                                                                         'text', 10,  1, 1, GETDATE(), GETDATE()),
    (@std_id, '3834_s1', N'Qualora il fornitore sia certificato ISO 3834, si effettua un corretto riesame dei requisiti contrattuali?',                                             'text', 20,  1, 1, GETDATE(), GETDATE()),
    (@std_id, '3834_s1', N'Vengono subappaltate alcune attivita (saldatura, ispezione, controlli non distruttivi, trattamenti termici)?',                                           'text', 30,  1, 1, GETDATE(), GETDATE()),
    (@std_id, '3834_s1', N'E stato stabilito un criterio di accettabilita per il prodotto saldato tra le parti?',                                                                  'text', 40,  1, 1, GETDATE(), GETDATE()),
    (@std_id, '3834_s1', N'Il fornitore ha preparato il PPAP (o documentazione equivalente) in accordo alle specifiche del committente?',                                          'text', 50,  1, 1, GETDATE(), GETDATE()),
    (@std_id, '3834_s1', N'Come vengono gestite le eventuali non conformita?',                                                                                                     'text', 60,  1, 1, GETDATE(), GETDATE()),

    -- SEZIONE 2: CONTROLLO DOCUMENTALE (6 domande)
    (@std_id, '3834_s2', N'La rintracciabilita del materiale e garantita? I certificati vengono gestiti secondo EN ISO 10204?',                                                    'text', 70,  1, 1, GETDATE(), GETDATE()),
    (@std_id, '3834_s2', N'E presente un coordinatore di saldatura qualificato (IWE/IWT/IWS/IWP)?',                                                                               'text', 80,  1, 1, GETDATE(), GETDATE()),
    (@std_id, '3834_s2', N'I saldatori e gli operatori di saldatura (WQ) sono qualificati per le attivita richieste?',                                                             'text', 90,  1, 1, GETDATE(), GETDATE()),
    (@std_id, '3834_s2', N'I procedimenti di saldatura (WPQR) sono correttamente qualificati secondo la norma applicabile?',                                                       'text', 100, 1, 1, GETDATE(), GETDATE()),
    (@std_id, '3834_s2', N'Sono presenti specifiche di procedimento di saldatura (WPS) applicabili ai componenti in lavorazione?',                                                 'text', 110, 1, 1, GETDATE(), GETDATE()),
    (@std_id, '3834_s2', N'Il personale addetto alle prove non distruttive (CND/NDT) e qualificato secondo EN ISO 9712 o equivalente?',                                            'text', 120, 1, 1, GETDATE(), GETDATE()),

    -- SEZIONE 3: ISPEZIONE IN CAMPO (7 domande)
    (@std_id, '3834_s3', N'Il fornitore possiede attrezzature adeguate per la saldatura? Sono manutenute e i parametri di voltaggio/corrente controllati periodicamente?',         'text', 130, 1, 1, GETDATE(), GETDATE()),
    (@std_id, '3834_s3', N'Sono disponibili i disegni tecnici e le specifiche nelle aree di saldatura?',                                                                           'text', 140, 1, 1, GETDATE(), GETDATE()),
    (@std_id, '3834_s3', N'Viene effettuato il controllo della pulizia del pezzo prima della saldatura?',                                                                          'text', 150, 1, 1, GETDATE(), GETDATE()),
    (@std_id, '3834_s3', N'Le maschere di saldatura sono monitorate dimensionalmente e validate per i componenti in produzione?',                                                   'text', 160, 1, 1, GETDATE(), GETDATE()),
    (@std_id, '3834_s3', N'La puntatura del pezzo e gestita con personale dedicato e qualificato? Esistono istruzioni operative specifiche?',                                       'text', 170, 1, 1, GETDATE(), GETDATE()),
    (@std_id, '3834_s3', N'Le eventuali riparazioni vengono registrate? Esistono WPS dedicate alle riparazioni?',                                                                  'text', 180, 1, 1, GETDATE(), GETDATE()),
    (@std_id, '3834_s3', N'Le condizioni di stoccaggio del Materiale Base, Materiale di Apporto e Gas risultano adeguate?',                                                        'text', 190, 1, 1, GETDATE(), GETDATE()),

    -- SEZIONE 4: CONTROLLI POST-SALDATURA (3 domande)
    (@std_id, '3834_s4', N'Sono eseguiti e registrati Controlli Non Distruttivi (CND/NDT)? Quali tipologie e con quale estensione?',                                               'text', 200, 1, 1, GETDATE(), GETDATE()),
    (@std_id, '3834_s4', N'Si eseguono controlli dimensionali del prodotto saldato in accordo ai disegni contrattuali? E disponibile il relativo rapporto dimensionale?',          'text', 210, 1, 1, GETDATE(), GETDATE()),
    (@std_id, '3834_s4', N'E prevista e correttamente eseguita la marcatura del prodotto saldato finito?',                                                                         'text', 220, 1, 1, GETDATE(), GETDATE());

    PRINT 'Domande ISO 3834-2 inserite (22 totali)';
END
ELSE
    PRINT 'Domande ISO 3834-2 gia presenti, nessuna modifica';

-- ============================================================
-- VERIFICA FINALE
-- ============================================================
SELECT
    s.standard_code,
    cs.section_code,
    cs.section_title,
    COUNT(q.question_id) AS domande
FROM standards s
JOIN checklist_sections cs ON cs.standard_id = s.standard_id
LEFT JOIN checklist_questions q ON q.section_code = cs.section_code AND q.standard_id = s.standard_id AND q.is_active = 1
WHERE s.standard_code = 'ISO_3834_2'
GROUP BY s.standard_code, cs.section_code, cs.section_title, cs.display_order
ORDER BY cs.display_order;
