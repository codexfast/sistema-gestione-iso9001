-- =============================================================================
-- Query di Verifica Post-Migrazione
-- =============================================================================

USE [SGQ_ISO9001];
GO

PRINT '🔍 VERIFICA CONFIGURAZIONE MULTI-STANDARD';
PRINT '';

-- 1. Standard disponibili
PRINT '1️⃣ STANDARD DISPONIBILI:';
SELECT 
    standard_id AS ID,
    standard_code AS Codice,
    standard_name AS Nome,
    category AS Categoria,
    is_active AS Attivo
FROM standards
ORDER BY standard_id;

PRINT '';

-- 2. Sezioni per standard
PRINT '2️⃣ SEZIONI PER STANDARD:';
SELECT 
    s.standard_name AS Standard,
    COUNT(cs.section_id) AS [Num Sezioni],
    MIN(cs.section_code) AS [Prima Sezione],
    MAX(cs.section_code) AS [Ultima Sezione]
FROM standards s
LEFT JOIN checklist_sections cs ON s.standard_id = cs.standard_id
GROUP BY s.standard_id, s.standard_name
ORDER BY s.standard_id;

PRINT '';

-- 3. Vincoli di integrità
PRINT '3️⃣ VINCOLI FOREIGN KEY COMPOSITE:';
SELECT 
    fk.name AS [Nome FK],
    OBJECT_NAME(fk.parent_object_id) AS [Tabella],
    STRING_AGG(CAST(c.name AS NVARCHAR(MAX)), ' + ') AS [Colonne]
FROM sys.foreign_keys fk
INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
INNER JOIN sys.columns c ON fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id
WHERE fk.name LIKE '%composite%'
GROUP BY fk.name, fk.parent_object_id
ORDER BY OBJECT_NAME(fk.parent_object_id);

PRINT '';

-- 4. Test query filtro per standard
PRINT '4️⃣ TEST QUERY - Sezioni ISO 9001:';
SELECT TOP 5
    section_code AS Codice,
    section_title AS Titolo,
    s.standard_name AS Standard
FROM checklist_sections cs
INNER JOIN standards s ON cs.standard_id = s.standard_id
WHERE s.standard_code = 'ISO_9001_2015'
ORDER BY cs.display_order;

PRINT '';

-- 5. Stato audit
PRINT '5️⃣ AUDIT ESISTENTI:';
SELECT 
    a.audit_number AS [Numero Audit],
    a.client_name AS Cliente,
    COALESCE(s.standard_name, 'Multi-Standard') AS Standard,
    a.status AS Stato
FROM audits a
LEFT JOIN standards s ON a.standard_id = s.standard_id
WHERE a.is_deleted = 0;

PRINT '';
PRINT '========================================';
PRINT '✅ VERIFICA COMPLETATA';
PRINT '========================================';
PRINT '';
PRINT '📖 ESEMPI QUERY UTILI:';
PRINT '';
PRINT '-- Filtra sezioni per ISO 14001';
PRINT 'SELECT * FROM checklist_sections';
PRINT 'WHERE standard_id = (SELECT standard_id FROM standards WHERE standard_code = ''ISO_14001_2015'');';
PRINT '';
PRINT '-- Crea audit ISO 9001';
PRINT 'INSERT INTO audits (audit_number, client_name, standard_id, ...)';
PRINT 'VALUES (''AUD-001'', ''Cliente Test'', 1, ...);';
PRINT '';
PRINT '-- Dashboard audit per standard';
PRINT 'SELECT * FROM vw_audit_dashboard WHERE standard_code = ''ISO_9001_2015'';';
PRINT '';

GO
