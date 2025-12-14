-- ============================================================================
-- SEED CHECKLIST ISO 9001:2015
-- ============================================================================
-- Popola le tabelle checklist_sections e checklist_questions con i requisiti
-- della norma UNI EN ISO 9001:2015
-- 
-- ISTRUZIONI ESECUZIONE:
-- 1. Aprire SSMS e connettersi al server www.fr-busato.it:11043
-- 2. Selezionare database: SGQ_ISO9001
-- 3. Eseguire questo script
-- 4. Verificare: SELECT COUNT(*) FROM checklist_sections (dovrebbe essere ~35)
-- 5. Verificare: SELECT COUNT(*) FROM checklist_questions (dovrebbe essere ~75)
-- ============================================================================

USE SGQ_ISO9001;
GO

-- ============================================================================
-- SEZIONI CHECKLIST ISO 9001:2015
-- ============================================================================

-- Sezione 4: Contesto dell'organizzazione
INSERT INTO checklist_sections (section_code, section_title, parent_section_code, display_order, is_active, standard_id)
VALUES 
('4', 'Contesto dell''organizzazione', NULL, 1, 1, 1),
('4.1', 'Comprendere l''organizzazione e il suo contesto', '4', 1, 1, 1),
('4.2', 'Comprendere le esigenze e le aspettative delle parti interessate', '4', 2, 1, 1),
('4.3', 'Determinare il campo di applicazione del sistema di gestione per la qualità', '4', 3, 1, 1),
('4.4', 'Sistema di gestione per la qualità e relativi processi', '4', 4, 1, 1);

-- Sezione 5: Leadership
INSERT INTO checklist_sections (section_code, section_title, parent_section_code, display_order, is_active, standard_id)
VALUES 
('5', 'Leadership', NULL, 2, 1, 1),
('5.1', 'Leadership e impegno', '5', 1, 1, 1),
('5.2', 'Politica', '5', 2, 1, 1),
('5.3', 'Ruoli, responsabilità e autorità nell''organizzazione', '5', 3, 1, 1);

-- Sezione 6: Pianificazione
INSERT INTO checklist_sections (section_code, section_title, parent_section_code, display_order, is_active, standard_id)
VALUES 
('6', 'Pianificazione', NULL, 3, 1, 1),
('6.1', 'Azioni per affrontare rischi e opportunità', '6', 1, 1, 1),
('6.2', 'Obiettivi per la qualità e pianificazione per il loro raggiungimento', '6', 2, 1, 1),
('6.3', 'Pianificazione delle modifiche', '6', 3, 1, 1);

-- Sezione 7: Supporto
INSERT INTO checklist_sections (section_code, section_title, parent_section_code, display_order, is_active, standard_id)
VALUES 
('7', 'Supporto', NULL, 4, 1, 1),
('7.1', 'Risorse', '7', 1, 1, 1),
('7.1.1', 'Generalità', '7.1', 1, 1, 1),
('7.1.2', 'Persone', '7.1', 2, 1, 1),
('7.1.3', 'Infrastrutture', '7.1', 3, 1, 1),
('7.1.4', 'Ambiente per il funzionamento dei processi', '7.1', 4, 1, 1),
('7.1.5', 'Risorse per il monitoraggio e la misurazione', '7.1', 5, 1, 1),
('7.1.6', 'Conoscenza organizzativa', '7.1', 6, 1, 1),
('7.2', 'Competenza', '7', 2, 1, 1),
('7.3', 'Consapevolezza', '7', 3, 1, 1),
('7.4', 'Comunicazione', '7', 4, 1, 1),
('7.5', 'Informazioni documentate', '7', 5, 1, 1);

-- Sezione 8: Attività operative
INSERT INTO checklist_sections (section_code, section_title, parent_section_code, display_order, is_active, standard_id)
VALUES 
('8', 'Attività operative', NULL, 5, 1, 1),
('8.1', 'Pianificazione e controllo operativi', '8', 1, 1, 1),
('8.2', 'Requisiti per i prodotti e servizi', '8', 2, 1, 1),
('8.3', 'Progettazione e sviluppo di prodotti e servizi', '8', 3, 1, 1),
('8.4', 'Controllo dei processi, prodotti e servizi forniti dall''esterno', '8', 4, 1, 1),
('8.5', 'Produzione ed erogazione dei servizi', '8', 5, 1, 1),
('8.6', 'Rilascio di prodotti e servizi', '8', 6, 1, 1),
('8.7', 'Controllo degli output non conformi', '8', 7, 1, 1);

-- Sezione 9: Valutazione delle prestazioni
INSERT INTO checklist_sections (section_code, section_title, parent_section_code, display_order, is_active, standard_id)
VALUES 
('9', 'Valutazione delle prestazioni', NULL, 6, 1, 1),
('9.1', 'Monitoraggio, misurazione, analisi e valutazione', '9', 1, 1, 1),
('9.2', 'Audit interno', '9', 2, 1, 1),
('9.3', 'Riesame di direzione', '9', 3, 1, 1);

-- Sezione 10: Miglioramento
INSERT INTO checklist_sections (section_code, section_title, parent_section_code, display_order, is_active, standard_id)
VALUES 
('10', 'Miglioramento', NULL, 7, 1, 1),
('10.1', 'Generalità', '10', 1, 1, 1),
('10.2', 'Non conformità e azioni correttive', '10', 2, 1, 1),
('10.3', 'Miglioramento continuo', '10', 3, 1, 1);

-- ============================================================================
-- DOMANDE CHECKLIST ISO 9001:2015
-- ============================================================================

-- Domande Sezione 4.1
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('L''organizzazione ha determinato i fattori interni ed esterni rilevanti per il proprio scopo e indirizzo strategico?', 'conformity', '4.1', 1, 1),
('L''organizzazione effettua il monitoraggio e il riesame delle informazioni relative a tali fattori interni ed esterni?', 'conformity', '4.1', 2, 1);

-- Domande Sezione 4.2
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('L''organizzazione ha determinato le parti interessate rilevanti per il SGQ e i loro requisiti?', 'conformity', '4.2', 1, 1),
('L''organizzazione effettua il monitoraggio e il riesame delle informazioni relative alle parti interessate e ai loro requisiti?', 'conformity', '4.2', 2, 1);

-- Domande Sezione 4.3
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('L''organizzazione ha determinato i confini e l''applicabilità del SGQ per stabilire il campo di applicazione?', 'conformity', '4.3', 1, 1),
('Il campo di applicazione è disponibile e mantenuto come informazione documentata?', 'conformity', '4.3', 2, 1),
('Se requisiti della norma non sono applicabili, l''organizzazione ha dimostrato che ciò non influisce sulla conformità di prodotti/servizi?', 'conformity', '4.3', 3, 1);

-- Domande Sezione 4.4
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('L''organizzazione ha stabilito, attuato, mantenuto e migliorato continuamente il SGQ compresi i processi necessari e le loro interazioni?', 'conformity', '4.4', 1, 1),
('L''organizzazione ha determinato input, output, criteri e metodi per i processi del SGQ?', 'conformity', '4.4', 2, 1),
('L''organizzazione ha assegnato responsabilità e autorità per i processi e ha determinato le risorse necessarie?', 'conformity', '4.4', 3, 1);

-- Domande Sezione 5.1
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('L''alta direzione dimostra leadership e impegno per il SGQ assumendosi la responsabilità dell''efficacia del sistema?', 'conformity', '5.1', 1, 1),
('L''alta direzione assicura che la politica e gli obiettivi per la qualità siano stabiliti e compatibili con il contesto e l''indirizzo strategico?', 'conformity', '5.1', 2, 1),
('L''alta direzione promuove l''utilizzo dell''approccio per processi e del risk-based thinking?', 'conformity', '5.1', 3, 1);

-- Domande Sezione 5.2
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('L''alta direzione ha stabilito, attuato e mantenuto una politica per la qualità appropriata allo scopo dell''organizzazione?', 'conformity', '5.2', 1, 1),
('La politica per la qualità è disponibile come informazione documentata e comunicata all''interno dell''organizzazione?', 'conformity', '5.2', 2, 1);

-- Domande Sezione 5.3
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('L''alta direzione ha assicurato che responsabilità e autorità per i ruoli pertinenti siano assegnate, comunicate e comprese?', 'conformity', '5.3', 1, 1),
('È stato assegnato un responsabile per assicurare che il SGQ sia conforme ai requisiti della norma e che ne sia riferito all''alta direzione?', 'conformity', '5.3', 2, 1);

-- Domande Sezione 6.1
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('L''organizzazione ha determinato i rischi e le opportunità che devono essere affrontati per dare assicurazione che il SGQ consegua i risultati attesi?', 'conformity', '6.1', 1, 1),
('L''organizzazione ha pianificato le azioni per affrontare tali rischi e opportunità e ha integrato tali azioni nei processi del SGQ?', 'conformity', '6.1', 2, 1),
('L''organizzazione valuta l''efficacia di tali azioni?', 'conformity', '6.1', 3, 1);

-- Domande Sezione 6.2
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('L''organizzazione ha stabilito obiettivi per la qualità alle funzioni, livelli e processi pertinenti?', 'conformity', '6.2', 1, 1),
('Gli obiettivi per la qualità sono misurabili, monitorati, comunicati e aggiornati?', 'conformity', '6.2', 2, 1),
('L''organizzazione ha pianificato come saranno conseguiti gli obiettivi (cosa, risorse, responsabili, tempi, risultati)?', 'conformity', '6.2', 3, 1);

-- Domande Sezione 6.3
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('Quando l''organizzazione determina la necessità di modifiche al SGQ, le modifiche sono effettuate in modo pianificato?', 'conformity', '6.3', 1, 1);

-- Domande Sezione 7.1.2
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('L''organizzazione ha determinato e fornito le persone necessarie per l''efficace attuazione del SGQ e per il funzionamento dei processi?', 'conformity', '7.1.2', 1, 1);

-- Domande Sezione 7.1.3
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('L''organizzazione ha determinato, fornito e mantenuto le infrastrutture necessarie per il funzionamento dei processi?', 'conformity', '7.1.3', 1, 1);

-- Domande Sezione 7.1.4
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('L''organizzazione ha determinato, fornito e mantenuto l''ambiente necessario per il funzionamento dei processi e per conseguire la conformità di prodotti e servizi?', 'conformity', '7.1.4', 1, 1);

-- Domande Sezione 7.1.5
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('L''organizzazione ha determinato e fornito le risorse necessarie per il monitoraggio e la misurazione per verificare la conformità?', 'conformity', '7.1.5', 1, 1),
('Le risorse per il monitoraggio e la misurazione sono idonee e mantenute per assicurare risultati validi?', 'conformity', '7.1.5', 2, 1),
('Sono conservate informazioni documentate come evidenza dell''idoneità allo scopo delle risorse di monitoraggio e misurazione?', 'conformity', '7.1.5', 3, 1);

-- Domande Sezione 7.1.6
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('L''organizzazione ha determinato la conoscenza necessaria per il funzionamento dei processi e per conseguire la conformità?', 'conformity', '7.1.6', 1, 1),
('Tale conoscenza è mantenuta e resa disponibile nella misura necessaria?', 'conformity', '7.1.6', 2, 1);

-- Domande Sezione 7.2
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('L''organizzazione ha determinato la competenza necessaria delle persone che svolgono attività che influenzano le prestazioni del SGQ?', 'conformity', '7.2', 1, 1),
('L''organizzazione assicura che tali persone siano competenti sulla base di appropriati istruzione, formazione o esperienza?', 'conformity', '7.2', 2, 1),
('Sono conservate informazioni documentate come evidenza della competenza?', 'conformity', '7.2', 3, 1);

-- Domande Sezione 7.3
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('Le persone che svolgono attività sotto il controllo dell''organizzazione sono consapevoli della politica per la qualità, degli obiettivi pertinenti e del loro contributo all''efficacia del SGQ?', 'conformity', '7.3', 1, 1);

-- Domande Sezione 7.4
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('L''organizzazione ha determinato le comunicazioni interne ed esterne pertinenti per il SGQ (cosa, quando, con chi, come e chi comunica)?', 'conformity', '7.4', 1, 1);

-- Domande Sezione 7.5
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('Il SGQ include le informazioni documentate richieste dalla norma e quelle determinate dall''organizzazione come necessarie per l''efficacia del sistema?', 'conformity', '7.5', 1, 1),
('Le informazioni documentate sono controllate per assicurarne disponibilità, idoneità e protezione adeguata?', 'conformity', '7.5', 2, 1);

-- Domande Sezione 8.1
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('L''organizzazione ha pianificato, attuato e controllato i processi necessari per soddisfare i requisiti per la fornitura di prodotti e servizi?', 'conformity', '8.1', 1, 1),
('L''organizzazione ha attuato azioni per affrontare i rischi e le opportunità e valutato se è necessario controllare le modifiche non intenzionali?', 'conformity', '8.1', 2, 1);

-- Domande Sezione 8.2
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('L''organizzazione ha determinato, riesaminato e confermato i requisiti per prodotti e servizi offerti ai clienti?', 'conformity', '8.2', 1, 1),
('L''organizzazione assicura la propria capacità di soddisfare i requisiti prima di impegnarsi a fornire prodotti e servizi?', 'conformity', '8.2', 2, 1),
('L''organizzazione comunica efficacemente con i clienti riguardo a informazioni, contratti, ordini, feedback e reclami?', 'conformity', '8.2', 3, 1);

-- Domande Sezione 8.3 (opzionale se non applicabile)
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('L''organizzazione ha stabilito, attuato e mantenuto un processo di progettazione e sviluppo appropriato per assicurare la successiva fornitura di prodotti e servizi?', 'conformity', '8.3', 1, 1),
('Se applicabile, l''organizzazione controlla il processo di progettazione attraverso pianificazione, input, controlli, output, modifiche?', 'conformity', '8.3', 2, 1);

-- Domande Sezione 8.4
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('L''organizzazione assicura che i processi, prodotti e servizi forniti dall''esterno siano conformi ai requisiti?', 'conformity', '8.4', 1, 1),
('L''organizzazione ha determinato i controlli da applicare ai fornitori esterni e agli output da loro forniti?', 'conformity', '8.4', 2, 1),
('L''organizzazione comunica ai fornitori esterni i requisiti relativi a processi, prodotti, servizi, approvazioni e competenze?', 'conformity', '8.4', 3, 1);

-- Domande Sezione 8.5
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('L''organizzazione ha attuato la produzione ed erogazione dei servizi in condizioni controllate?', 'conformity', '8.5', 1, 1),
('Se applicabile, l''organizzazione ha attuato attività di validazione e rivalidazione della capacità dei processi di conseguire i risultati pianificati?', 'conformity', '8.5', 2, 1),
('L''organizzazione identifica gli output mediante mezzi idonei lungo tutte le fasi di produzione quando necessario per assicurare la conformità?', 'conformity', '8.5', 3, 1),
('L''organizzazione ha cura della proprietà del cliente o dei fornitori esterni mentre è sotto il controllo dell''organizzazione?', 'conformity', '8.5', 4, 1);

-- Domande Sezione 8.6
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('L''organizzazione ha attuato disposizioni pianificate nelle fasi appropriate per verificare che i requisiti per prodotti e servizi siano stati soddisfatti?', 'conformity', '8.6', 1, 1),
('Il rilascio di prodotti e servizi al cliente avviene solo dopo il soddisfacimento delle disposizioni pianificate, salvo approvazione da parte di autorità pertinente o cliente?', 'conformity', '8.6', 2, 1),
('Sono conservate informazioni documentate come evidenza della conformità ai criteri di accettazione e rintracciabilità alle persone autorizzate al rilascio?', 'conformity', '8.6', 3, 1);

-- Domande Sezione 8.7
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('L''organizzazione assicura che gli output non conformi siano identificati e controllati per prevenire il loro uso o consegna non intenzionale?', 'conformity', '8.7', 1, 1),
('L''organizzazione intraprende azioni appropriate basate sulla natura della non conformità (correzione, segregazione, restituzione, sospensione, informazione cliente)?', 'conformity', '8.7', 2, 1),
('Sono conservate informazioni documentate che descrivono la non conformità, le azioni intraprese, le eventuali concessioni ottenute e l''autorità decisionale?', 'conformity', '8.7', 3, 1);

-- Domande Sezione 9.1
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('L''organizzazione ha determinato cosa necessita di essere monitorato e misurato, i metodi, i tempi e le analisi e valutazioni dei risultati?', 'conformity', '9.1', 1, 1),
('L''organizzazione valuta le prestazioni e l''efficacia del SGQ?', 'conformity', '9.1', 2, 1),
('L''organizzazione monitora la percezione del cliente del grado in cui le sue esigenze e aspettative sono state soddisfatte?', 'conformity', '9.1', 3, 1),
('Sono conservate informazioni documentate come evidenza dei risultati?', 'conformity', '9.1', 4, 1);

-- Domande Sezione 9.2
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('L''organizzazione conduce audit interni a intervalli pianificati per fornire informazioni sul SGQ?', 'conformity', '9.2', 1, 1),
('L''organizzazione ha pianificato, stabilito, attuato e mantenuto un programma di audit considerando importanza processi, modifiche e risultati di audit precedenti?', 'conformity', '9.2', 2, 1),
('L''organizzazione assicura obiettività e imparzialità del processo di audit e riporta i risultati alla direzione pertinente?', 'conformity', '9.2', 3, 1),
('Sono conservate informazioni documentate come evidenza dell''attuazione del programma di audit e dei risultati?', 'conformity', '9.2', 4, 1);

-- Domande Sezione 9.3
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('L''alta direzione riesamina il SGQ dell''organizzazione a intervalli pianificati per assicurarne continua idoneità, adeguatezza, efficacia e allineamento strategico?', 'conformity', '9.3', 1, 1),
('Il riesame considera risultati di audit, feedback clienti, prestazioni processi, conformità prodotti/servizi, non conformità, azioni correttive, risultati monitoraggi precedenti, modifiche, opportunità di miglioramento?', 'conformity', '9.3', 2, 1),
('Gli output del riesame includono decisioni relative a opportunità di miglioramento, modifiche al SGQ e necessità di risorse?', 'conformity', '9.3', 3, 1),
('Sono conservate informazioni documentate come evidenza dei risultati dei riesami?', 'conformity', '9.3', 4, 1);

-- Domande Sezione 10.2
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('Quando si verifica una non conformità, l''organizzazione reagisce, controlla, corregge e affronta le conseguenze?', 'conformity', '10.2', 1, 1),
('L''organizzazione valuta la necessità di azioni per eliminare le cause delle non conformità mediante riesame, analisi cause e determinazione di non conformità simili?', 'conformity', '10.2', 2, 1),
('L''organizzazione attua le azioni necessarie e riesamina l''efficacia di qualsiasi azione correttiva intrapresa?', 'conformity', '10.2', 3, 1),
('L''organizzazione aggiorna rischi e opportunità e apporta modifiche al SGQ se necessario?', 'conformity', '10.2', 4, 1),
('Sono conservate informazioni documentate come evidenza della natura delle non conformità, delle azioni intraprese e dei risultati delle azioni correttive?', 'conformity', '10.2', 5, 1);

-- Domande Sezione 10.3
INSERT INTO checklist_questions (question_text, question_type, section_code, display_order, standard_id)
VALUES 
('L''organizzazione migliora continuamente l''idoneità, l''adeguatezza e l''efficacia del SGQ?', 'conformity', '10.3', 1, 1),
('L''organizzazione considera i risultati di analisi e valutazione e gli output del riesame di direzione per determinare opportunità di miglioramento?', 'conformity', '10.3', 2, 1);

GO

-- ============================================================================
-- VERIFICA INSERIMENTO
-- ============================================================================
PRINT '============================================================================';
PRINT 'VERIFICA INSERIMENTO DATI';
PRINT '============================================================================';
PRINT '';

DECLARE @sectionCount INT, @questionCount INT;

SELECT @sectionCount = COUNT(*) FROM checklist_sections WHERE standard_id = 1;
SELECT @questionCount = COUNT(*) FROM checklist_questions WHERE standard_id = 1;

PRINT 'Sezioni inserite: ' + CAST(@sectionCount AS VARCHAR(10)) + ' (atteso: ~42)';
PRINT 'Domande inserite: ' + CAST(@questionCount AS VARCHAR(10)) + ' (atteso: ~77)';
PRINT '';

IF @sectionCount > 0 AND @questionCount > 0
BEGIN
    PRINT '✓ Seed completato con successo!';
    PRINT '';
    PRINT 'Test suggerito:';
    PRINT 'SELECT section_code, section_title FROM checklist_sections WHERE standard_id = 1 ORDER BY display_order;';
    PRINT 'SELECT question_id, section_code, LEFT(question_text, 50) + ''...'' AS question FROM checklist_questions WHERE standard_id = 1 ORDER BY section_code, display_order;';
END
ELSE
BEGIN
    PRINT '✗ Errore: dati non inseriti correttamente';
END

PRINT '============================================================================';
