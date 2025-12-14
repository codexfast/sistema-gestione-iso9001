-- =====================================================
-- Seed: Checklist Questions ISO 9001:2015
-- Eseguire in SSMS dopo aver verificato che le sezioni esistano
-- =====================================================

USE SGQ_ISO9001;
GO

-- Verifica/inserisci standard ISO 9001
IF NOT EXISTS (SELECT 1 FROM standards WHERE standard_code = 'ISO9001')
BEGIN
    INSERT INTO standards (standard_code, standard_name, standard_full_name, version, category, is_active, display_order)
    VALUES ('ISO9001', 'ISO 9001', 'UNI EN ISO 9001:2015 - Sistemi di gestione per la qualità', '2015', 'quality', 1, 1);
    PRINT '✅ Standard ISO 9001 inserito';
END
GO

-- Ottieni ID standard
DECLARE @std_id INT;
SELECT @std_id = standard_id FROM standards WHERE standard_code = 'ISO9001';

-- Verifica/inserisci sezioni per lo standard
IF NOT EXISTS (SELECT 1 FROM checklist_sections WHERE standard_id = @std_id)
BEGIN
    INSERT INTO checklist_sections (standard_id, section_code, section_title, parent_section_code, display_order, is_active)
    VALUES
    (@std_id, '4', 'Contesto dell''organizzazione', NULL, 1, 1),
    (@std_id, '4.1', 'Comprendere l''organizzazione e il suo contesto', '4', 2, 1),
    (@std_id, '4.2', 'Comprendere le esigenze delle parti interessate', '4', 3, 1),
    (@std_id, '4.3', 'Determinare il campo di applicazione del SGQ', '4', 4, 1),
    (@std_id, '4.4', 'Sistema di gestione per la qualità', '4', 5, 1),
    (@std_id, '5', 'Leadership', NULL, 10, 1),
    (@std_id, '5.1', 'Leadership e impegno', '5', 11, 1),
    (@std_id, '5.2', 'Politica', '5', 12, 1),
    (@std_id, '5.3', 'Ruoli, responsabilità e autorità', '5', 13, 1),
    (@std_id, '6', 'Pianificazione', NULL, 20, 1),
    (@std_id, '6.1', 'Azioni per affrontare rischi e opportunità', '6', 21, 1),
    (@std_id, '6.2', 'Obiettivi per la qualità', '6', 22, 1),
    (@std_id, '6.3', 'Pianificazione delle modifiche', '6', 23, 1),
    (@std_id, '7', 'Supporto', NULL, 30, 1),
    (@std_id, '7.1', 'Risorse', '7', 31, 1),
    (@std_id, '7.2', 'Competenza', '7', 32, 1),
    (@std_id, '7.3', 'Consapevolezza', '7', 33, 1),
    (@std_id, '7.4', 'Comunicazione', '7', 34, 1),
    (@std_id, '7.5', 'Informazioni documentate', '7', 35, 1),
    (@std_id, '8', 'Attività operative', NULL, 40, 1),
    (@std_id, '8.1', 'Pianificazione e controllo operativi', '8', 41, 1),
    (@std_id, '8.2', 'Requisiti per i prodotti e servizi', '8', 42, 1),
    (@std_id, '8.3', 'Progettazione e sviluppo', '8', 43, 1),
    (@std_id, '8.4', 'Controllo processi forniti dall''esterno', '8', 44, 1),
    (@std_id, '8.5', 'Produzione ed erogazione servizi', '8', 45, 1),
    (@std_id, '8.6', 'Rilascio prodotti e servizi', '8', 46, 1),
    (@std_id, '8.7', 'Controllo output non conformi', '8', 47, 1),
    (@std_id, '9', 'Valutazione delle prestazioni', NULL, 50, 1),
    (@std_id, '9.1', 'Monitoraggio, misurazione, analisi', '9', 51, 1),
    (@std_id, '9.2', 'Audit interno', '9', 52, 1),
    (@std_id, '9.3', 'Riesame di direzione', '9', 53, 1),
    (@std_id, '10', 'Miglioramento', NULL, 60, 1),
    (@std_id, '10.1', 'Generalità', '10', 61, 1),
    (@std_id, '10.2', 'Non conformità e azioni correttive', '10', 62, 1),
    (@std_id, '10.3', 'Miglioramento continuo', '10', 63, 1);
    PRINT '✅ Sezioni ISO 9001 inserite';
END
GO

-- Inserisci domande checklist
DECLARE @std_id INT;
SELECT @std_id = standard_id FROM standards WHERE standard_code = 'ISO9001';

IF NOT EXISTS (SELECT 1 FROM checklist_questions WHERE standard_id = @std_id)
BEGIN
    INSERT INTO checklist_questions (standard_id, section_code, question_text, question_type, display_order, is_mandatory, is_active)
    VALUES
    -- Sezione 4.1
    (@std_id, '4.1', 'L''organizzazione ha determinato i fattori esterni rilevanti per le sue finalità e il suo indirizzo strategico?', 'conformity', 1, 1, 1),
    (@std_id, '4.1', 'L''organizzazione ha determinato i fattori interni rilevanti per le sue finalità e il suo indirizzo strategico?', 'conformity', 2, 1, 1),
    (@std_id, '4.1', 'L''organizzazione monitora e riesamina le informazioni relative a tali fattori esterni e interni?', 'conformity', 3, 1, 1),
    
    -- Sezione 4.2
    (@std_id, '4.2', 'L''organizzazione ha determinato le parti interessate rilevanti per il SGQ?', 'conformity', 1, 1, 1),
    (@std_id, '4.2', 'L''organizzazione ha determinato i requisiti di tali parti interessate rilevanti per il SGQ?', 'conformity', 2, 1, 1),
    (@std_id, '4.2', 'L''organizzazione monitora e riesamina le informazioni relative alle parti interessate e ai loro requisiti?', 'conformity', 3, 1, 1),
    
    -- Sezione 4.3
    (@std_id, '4.3', 'L''organizzazione ha determinato i confini e l''applicabilità del SGQ per stabilirne il campo di applicazione?', 'conformity', 1, 1, 1),
    (@std_id, '4.3', 'Il campo di applicazione indica i tipi di prodotti e servizi coperti?', 'conformity', 2, 1, 1),
    (@std_id, '4.3', 'L''organizzazione ha giustificato eventuali requisiti non applicabili?', 'conformity', 3, 1, 1),
    (@std_id, '4.3', 'Il campo di applicazione del SGQ è disponibile e mantenuto come informazione documentata?', 'conformity', 4, 1, 1),
    
    -- Sezione 4.4
    (@std_id, '4.4', 'L''organizzazione ha stabilito, attuato, mantenuto e migliorato continuamente il SGQ?', 'conformity', 1, 1, 1),
    (@std_id, '4.4', 'L''organizzazione ha determinato i processi necessari per il SGQ e la loro applicazione?', 'conformity', 2, 1, 1),
    (@std_id, '4.4', 'Sono stati determinati input e output attesi da questi processi?', 'conformity', 3, 1, 1),
    (@std_id, '4.4', 'Sono state determinate le sequenze e le interazioni di questi processi?', 'conformity', 4, 1, 1),
    (@std_id, '4.4', 'Sono stati determinati criteri e metodi per assicurare l''efficace funzionamento e controllo dei processi?', 'conformity', 5, 1, 1),
    
    -- Sezione 5.1
    (@std_id, '5.1', 'L''alta direzione dimostra leadership e impegno nei confronti del SGQ?', 'conformity', 1, 1, 1),
    (@std_id, '5.1', 'L''alta direzione assicura che politica e obiettivi siano stabiliti e compatibili con il contesto?', 'conformity', 2, 1, 1),
    (@std_id, '5.1', 'L''alta direzione assicura l''integrazione dei requisiti del SGQ nei processi di business?', 'conformity', 3, 1, 1),
    (@std_id, '5.1', 'L''alta direzione promuove l''utilizzo dell''approccio per processi e del risk-based thinking?', 'conformity', 4, 1, 1),
    (@std_id, '5.1', 'L''alta direzione dimostra leadership e impegno riguardo all''orientamento al cliente?', 'conformity', 5, 1, 1),
    
    -- Sezione 5.2
    (@std_id, '5.2', 'L''alta direzione ha stabilito, attuato e mantenuto una politica per la qualità?', 'conformity', 1, 1, 1),
    (@std_id, '5.2', 'La politica è appropriata alle finalità e al contesto dell''organizzazione?', 'conformity', 2, 1, 1),
    (@std_id, '5.2', 'La politica include l''impegno a soddisfare i requisiti applicabili?', 'conformity', 3, 1, 1),
    (@std_id, '5.2', 'La politica include l''impegno al miglioramento continuo del SGQ?', 'conformity', 4, 1, 1),
    (@std_id, '5.2', 'La politica è disponibile come informazione documentata, comunicata e compresa?', 'conformity', 5, 1, 1),
    
    -- Sezione 5.3
    (@std_id, '5.3', 'L''alta direzione ha assegnato responsabilità e autorità per assicurare la conformità del SGQ alla ISO 9001?', 'conformity', 1, 1, 1),
    (@std_id, '5.3', 'Sono assegnate responsabilità per assicurare che i processi producano gli output attesi?', 'conformity', 2, 1, 1),
    (@std_id, '5.3', 'È assegnata la responsabilità di riferire sulle prestazioni del SGQ e opportunità di miglioramento?', 'conformity', 3, 1, 1),
    
    -- Sezione 6.1
    (@std_id, '6.1', 'L''organizzazione ha determinato rischi e opportunità da affrontare per dare assicurazione che il SGQ possa conseguire i risultati attesi?', 'conformity', 1, 1, 1),
    (@std_id, '6.1', 'L''organizzazione ha pianificato azioni per affrontare questi rischi e opportunità?', 'conformity', 2, 1, 1),
    (@std_id, '6.1', 'L''organizzazione ha pianificato come integrare e attuare le azioni nei propri processi del SGQ?', 'conformity', 3, 1, 1),
    (@std_id, '6.1', 'L''organizzazione valuta l''efficacia di queste azioni?', 'conformity', 4, 1, 1),
    
    -- Sezione 6.2
    (@std_id, '6.2', 'L''organizzazione ha stabilito obiettivi per la qualità pertinenti alle funzioni, livelli e processi?', 'conformity', 1, 1, 1),
    (@std_id, '6.2', 'Gli obiettivi per la qualità sono coerenti con la politica, misurabili e tengono conto dei requisiti applicabili?', 'conformity', 2, 1, 1),
    (@std_id, '6.2', 'Gli obiettivi sono monitorati, comunicati e aggiornati?', 'conformity', 3, 1, 1),
    (@std_id, '6.2', 'L''organizzazione mantiene informazioni documentate sugli obiettivi per la qualità?', 'conformity', 4, 1, 1),
    
    -- Sezione 7.1
    (@std_id, '7.1', 'L''organizzazione ha determinato e reso disponibili le risorse necessarie per il SGQ?', 'conformity', 1, 1, 1),
    (@std_id, '7.1', 'L''organizzazione ha determinato e reso disponibili le persone necessarie?', 'conformity', 2, 1, 1),
    (@std_id, '7.1', 'L''organizzazione ha determinato, reso disponibile e mantenuto l''infrastruttura necessaria?', 'conformity', 3, 1, 1),
    (@std_id, '7.1', 'L''organizzazione ha determinato, reso disponibile e mantenuto l''ambiente per il funzionamento dei processi?', 'conformity', 4, 1, 1),
    (@std_id, '7.1', 'L''organizzazione ha determinato le risorse di monitoraggio e misurazione necessarie?', 'conformity', 5, 1, 1),
    
    -- Sezione 7.2
    (@std_id, '7.2', 'L''organizzazione ha determinato le competenze necessarie per le persone che svolgono attività che influenzano le prestazioni del SGQ?', 'conformity', 1, 1, 1),
    (@std_id, '7.2', 'L''organizzazione assicura che tali persone siano competenti sulla base di istruzione, formazione o esperienza?', 'conformity', 2, 1, 1),
    (@std_id, '7.2', 'L''organizzazione intraprende azioni per acquisire le competenze necessarie e ne valuta l''efficacia?', 'conformity', 3, 1, 1),
    (@std_id, '7.2', 'L''organizzazione conserva informazioni documentate quale evidenza delle competenze?', 'conformity', 4, 1, 1),
    
    -- Sezione 7.5
    (@std_id, '7.5', 'Il SGQ include le informazioni documentate richieste dalla ISO 9001?', 'conformity', 1, 1, 1),
    (@std_id, '7.5', 'Il SGQ include le informazioni documentate ritenute necessarie dall''organizzazione?', 'conformity', 2, 1, 1),
    (@std_id, '7.5', 'Le informazioni documentate hanno identificazione, formato e supporto appropriati?', 'conformity', 3, 1, 1),
    (@std_id, '7.5', 'Le informazioni documentate sono soggette a riesame e approvazione?', 'conformity', 4, 1, 1),
    (@std_id, '7.5', 'Le informazioni documentate sono controllate per disponibilità, protezione e distribuzione?', 'conformity', 5, 1, 1),
    
    -- Sezione 8.1
    (@std_id, '8.1', 'L''organizzazione pianifica, attua e tiene sotto controllo i processi necessari a soddisfare i requisiti?', 'conformity', 1, 1, 1),
    (@std_id, '8.1', 'Sono stati determinati i requisiti per i prodotti e servizi?', 'conformity', 2, 1, 1),
    (@std_id, '8.1', 'Sono stati stabiliti criteri per i processi e per l''accettazione dei prodotti e servizi?', 'conformity', 3, 1, 1),
    
    -- Sezione 9.1
    (@std_id, '9.1', 'L''organizzazione ha determinato cosa monitorare e misurare?', 'conformity', 1, 1, 1),
    (@std_id, '9.1', 'L''organizzazione ha determinato metodi per monitoraggio, misurazione, analisi e valutazione?', 'conformity', 2, 1, 1),
    (@std_id, '9.1', 'L''organizzazione ha determinato quando eseguire monitoraggio e misurazione?', 'conformity', 3, 1, 1),
    (@std_id, '9.1', 'L''organizzazione analizza e valuta i dati e le informazioni risultanti dal monitoraggio?', 'conformity', 4, 1, 1),
    (@std_id, '9.1', 'L''organizzazione monitora la percezione del cliente sul grado di soddisfazione dei requisiti?', 'conformity', 5, 1, 1),
    
    -- Sezione 9.2
    (@std_id, '9.2', 'L''organizzazione conduce audit interni a intervalli pianificati?', 'conformity', 1, 1, 1),
    (@std_id, '9.2', 'Gli audit verificano la conformità ai requisiti dell''organizzazione e della ISO 9001?', 'conformity', 2, 1, 1),
    (@std_id, '9.2', 'L''organizzazione pianifica, stabilisce, attua e mantiene un programma di audit?', 'conformity', 3, 1, 1),
    (@std_id, '9.2', 'I risultati degli audit sono riportati alla direzione pertinente?', 'conformity', 4, 1, 1),
    (@std_id, '9.2', 'Sono conservate informazioni documentate del programma e dei risultati degli audit?', 'conformity', 5, 1, 1),
    
    -- Sezione 9.3
    (@std_id, '9.3', 'L''alta direzione riesamina il SGQ a intervalli pianificati?', 'conformity', 1, 1, 1),
    (@std_id, '9.3', 'Il riesame considera lo stato delle azioni dai precedenti riesami?', 'conformity', 2, 1, 1),
    (@std_id, '9.3', 'Il riesame considera i cambiamenti nei fattori esterni e interni pertinenti?', 'conformity', 3, 1, 1),
    (@std_id, '9.3', 'Gli output del riesame includono decisioni e azioni relative a opportunità di miglioramento?', 'conformity', 4, 1, 1),
    (@std_id, '9.3', 'L''organizzazione conserva informazioni documentate come evidenza dei risultati dei riesami?', 'conformity', 5, 1, 1),
    
    -- Sezione 10.2
    (@std_id, '10.2', 'Quando si verifica una non conformità, l''organizzazione reagisce e intraprende azioni per tenerla sotto controllo e correggerla?', 'conformity', 1, 1, 1),
    (@std_id, '10.2', 'L''organizzazione valuta la necessità di azioni per eliminare le cause della non conformità?', 'conformity', 2, 1, 1),
    (@std_id, '10.2', 'L''organizzazione attua le azioni necessarie?', 'conformity', 3, 1, 1),
    (@std_id, '10.2', 'L''organizzazione riesamina l''efficacia delle azioni correttive intraprese?', 'conformity', 4, 1, 1),
    (@std_id, '10.2', 'L''organizzazione conserva informazioni documentate sulle non conformità e azioni correttive?', 'conformity', 5, 1, 1),
    
    -- Sezione 10.3
    (@std_id, '10.3', 'L''organizzazione migliora continuamente l''idoneità, adeguatezza ed efficacia del SGQ?', 'conformity', 1, 1, 1),
    (@std_id, '10.3', 'L''organizzazione considera i risultati dell''analisi e valutazione e gli output del riesame di direzione per determinare opportunità di miglioramento?', 'conformity', 2, 1, 1);
    
    PRINT '✅ Domande checklist ISO 9001 inserite';
END
GO

-- Conta risultati
SELECT 'Sezioni' AS Tipo, COUNT(*) AS Conteggio FROM checklist_sections WHERE standard_id = (SELECT standard_id FROM standards WHERE standard_code = 'ISO9001')
UNION ALL
SELECT 'Domande' AS Tipo, COUNT(*) AS Conteggio FROM checklist_questions WHERE standard_id = (SELECT standard_id FROM standards WHERE standard_code = 'ISO9001');
GO

PRINT '✅ Seed completato!';
GO
