-- ================================================================
-- RESET TEST DATA - Sistema Gestione ISO 9001
-- Data: 8 Febbraio 2026
-- Descrizione: Rimuove dati test/corrotti mantenendo schema + master data
-- ================================================================

-- ============================================================
-- IMPORTANTE: Verifica database selezionato prima di eseguire!
-- In SSMS: Dropdown database deve mostrare SGQ_ISO9001
-- ============================================================

USE SGQ_ISO9001;
GO

-- Verifica database corrente
IF DB_NAME() <> 'SGQ_ISO9001'
BEGIN
    RAISERROR('❌ ERRORE: Database context errato! Seleziona SGQ_ISO9001 nel dropdown SSMS.', 16, 1);
    RETURN;
END

PRINT '✅ Database context: ' + DB_NAME();
GO

-- ============================================================
-- STEP 1: BACKUP AUTOMATICO (FACOLTATIVO - Decommentare se serve)
-- ============================================================
/*
BACKUP DATABASE SGQ_ISO9001 
TO DISK = 'C:\Backup\SGQ_ISO9001_pre_reset_20260208.bak'
WITH INIT, COMPRESSION, DESCRIPTION = 'Backup pre-reset dati test';
GO
*/

-- ============================================================
-- STEP 2: PREVIEW DATI DA ELIMINARE (Esegui PRIMA per verifica)
-- ============================================================

PRINT '📊 PREVIEW DATI DA ELIMINARE:'
PRINT '============================================';

-- Audit test/corrotti da eliminare
SELECT 
    'AUDIT DA ELIMINARE' AS Tipo,
    audit_id,
    audit_number,
    client_name,
    status,
    audit_date
FROM audits
WHERE 
    client_name LIKE '%Test%' 
    OR client_name LIKE '%Template%'
    OR client_name LIKE '%Acme%'
    OR audit_number LIKE '%test%'
    OR audit_number = 'AUD-001-2025'; -- Mock data iniziale

PRINT '--------------------------------------------';

-- Conteggi dipendenti
SELECT 
    'AUDIT_RESPONSES' AS Tabella,
    COUNT(*) AS Records_To_Delete
FROM audit_responses ar
INNER JOIN audits a ON ar.audit_id = a.audit_id
WHERE 
    a.client_name LIKE '%Test%' 
    OR a.client_name LIKE '%Template%'
    OR a.client_name LIKE '%Acme%';

SELECT 
    'NON_CONFORMITIES' AS Tabella,
    COUNT(*) AS Records_To_Delete
FROM non_conformities nc
INNER JOIN audits a ON nc.audit_id = a.audit_id
WHERE 
    a.client_name LIKE '%Test%' 
    OR a.client_name LIKE '%Template%'
    OR a.client_name LIKE '%Acme%';

-- Attachments legati a NC
SELECT 
    'ATTACHMENTS_NC' AS Tabella,
    COUNT(*) AS Records_To_Delete
FROM attachments att
INNER JOIN non_conformities nc ON att.nc_id = nc.nc_id
INNER JOIN audits a ON nc.audit_id = a.audit_id
WHERE 
    a.client_name LIKE '%Test%' 
    OR a.client_name LIKE '%Template%'
    OR a.client_name LIKE '%Acme%';

-- Attachments legati direttamente ad audit
SELECT 
    'ATTACHMENTS_AUDIT' AS Tabella,
    COUNT(*) AS Records_To_Delete
FROM attachments att
INNER JOIN audits a ON att.audit_id = a.audit_id
WHERE 
    a.client_name LIKE '%Test%' 
    OR a.client_name LIKE '%Template%'
    OR a.client_name LIKE '%Acme%';

-- Audit history (tracciabilità modifiche)
SELECT 
    'AUDIT_HISTORY' AS Tabella,
    COUNT(*) AS Records_To_Delete
FROM audit_history ah
INNER JOIN audits a ON ah.audit_id = a.audit_id
WHERE 
    a.client_name LIKE '%Test%' 
    OR a.client_name LIKE '%Template%'
    OR a.client_name LIKE '%Acme%';

-- Sync metadata (metadati sincronizzazione offline)
-- Nota: sync_metadata usa entity_type + entity_id (generico)
SELECT 
    'SYNC_METADATA' AS Tabella,
    COUNT(*) AS Records_To_Delete
FROM sync_metadata sm
WHERE sm.entity_type = 'audit' 
AND sm.entity_id IN (
    SELECT audit_id FROM audits
    WHERE client_name LIKE '%Test%' 
        OR client_name LIKE '%Template%'
        OR client_name LIKE '%Acme%'
);

-- pending_issues table non esiste (feature non ancora implementata)
-- SELECT 'PENDING_ISSUES' AS Tabella, COUNT(*) AS Records_To_Delete
-- FROM pending_issues;

PRINT '============================================';
PRINT '⚠️ VERIFICA I DATI SOPRA PRIMA DI PROCEDERE!';
PRINT '============================================';

-- ============================================================
-- STEP 3: RESET DATI (Esegui SOLO dopo verifica Step 2 OK)
-- ============================================================

-- ATTENZIONE: Decommenta solo dopo aver verificato Step 2

/*
BEGIN TRANSACTION;

PRINT '🗑️ Inizio eliminazione dati test...';

-- 1. Elimina attachments legati a NC da eliminare (FK nc_id)
DELETE att
FROM attachments att
INNER JOIN non_conformities nc ON att.nc_id = nc.nc_id
INNER JOIN audits a ON nc.audit_id = a.audit_id
WHERE 
    a.client_name LIKE '%Test%' 
    OR a.client_name LIKE '%Template%'
    OR a.client_name LIKE '%Acme%'
    OR a.audit_number LIKE '%test%'
    OR a.audit_number = 'AUD-001-2025';
PRINT '✅ Attachments NC eliminati';

-- 2. Elimina attachments legati direttamente ad audit (FK audit_id)
DELETE att
FROM attachments att
INNER JOIN audits a ON att.audit_id = a.audit_id
WHERE 
    a.client_name LIKE '%Test%' 
    OR a.client_name LIKE '%Template%'
    OR a.client_name LIKE '%Acme%'
    OR a.audit_number LIKE '%test%'
    OR a.audit_number = 'AUD-001-2025';
PRINT '✅ Attachments audit eliminati';

-- 3. Elimina non_conformities legati ad audit test
DELETE nc
FROM non_conformities nc
INNER JOIN audits a ON nc.audit_id = a.audit_id
WHERE 
    a.client_name LIKE '%Test%' 
    OR a.client_name LIKE '%Template%'
    OR a.client_name LIKE '%Acme%'
    OR a.audit_number LIKE '%test%'
    OR a.audit_number = 'AUD-001-2025';
PRINT '✅ Non conformità eliminate';

-- 4. Elimina audit_responses legati ad audit test
DELETE ar
FROM audit_responses ar
INNER JOIN audits a ON ar.audit_id = a.audit_id
WHERE 
    a.client_name LIKE '%Test%' 
    OR a.client_name LIKE '%Template%'
    OR a.client_name LIKE '%Acme%'
    OR a.audit_number LIKE '%test%'
    OR a.audit_number = 'AUD-001-2025';
PRINT '✅ Risposte audit eliminate';

-- 5. Elimina audit_history legati ad audit test (tracciabilità)
DELETE ah
FROM audit_history ah
INNER JOIN audits a ON ah.audit_id = a.audit_id
WHERE 
    a.client_name LIKE '%Test%' 
    OR a.client_name LIKE '%Template%'
    OR a.client_name LIKE '%Acme%'
    OR a.audit_number LIKE '%test%'
    OR a.audit_number = 'AUD-001-2025';
PRINT '✅ Audit history eliminato';

-- 6. Elimina sync_metadata legati ad audit test
-- Nota: sync_metadata usa entity_type + entity_id (design generico)
DELETE FROM sync_metadata
WHERE entity_type = 'audit' 
AND entity_id IN (
    SELECT audit_id FROM audits
    WHERE client_name LIKE '%Test%' 
        OR client_name LIKE '%Template%'
        OR client_name LIKE '%Acme%'
        OR audit_number LIKE '%test%'
        OR audit_number = 'AUD-001-2025'
);
PRINT '✅ Sync metadata eliminati';

-- 7. Elimina audit_standards legati ad audit test
DELETE ast
FROM audit_standards ast
INNER JOIN audits a ON ast.audit_id = a.audit_id
WHERE 
    a.client_name LIKE '%Test%' 
    OR a.client_name LIKE '%Template%'
    OR a.client_name LIKE '%Acme%'
    OR a.audit_number LIKE '%test%'
    OR a.audit_number = 'AUD-001-2025';
PRINT '✅ Audit-Standard associations eliminate';

-- 8. Elimina audit test
DELETE FROM audits
WHERE 
    client_name LIKE '%Test%' 
    OR client_name LIKE '%Template%'
    OR client_name LIKE '%Acme%'
    OR audit_number LIKE '%test%'
    OR audit_number = 'AUD-001-2025';
PRINT '✅ Audit test eliminati';

COMMIT TRANSACTION;

PRINT '============================================';
PRINT '✅ RESET COMPLETATO CON SUCCESSO!';
PRINT '============================================';
*/

-- ============================================================
-- STEP 4: VERIFICA STATO FINALE (Esegui dopo Step 3)
-- ============================================================

/*
PRINT '📊 STATO DATABASE DOPO RESET:';
PRINT '============================================';

SELECT 
    'audits' AS Tabella,
    COUNT(*) AS Records_Rimanenti
FROM audits;

SELECT 
    'audit_responses' AS Tabella,
    COUNT(*) AS Records_Rimanenti
FROM audit_responses;

SELECT 
    'non_conformities' AS Tabella,
    COUNT(*) AS Records_Rimanenti
FROM non_conformities;

SELECT 
    'attachments' AS Tabella,
    COUNT(*) AS Records_Rimanenti
FROM attachments;

SELECT 
    'audit_history' AS Tabella,
    COUNT(*) AS Records_Rimanenti
FROM audit_history;

SELECT 
    'sync_metadata' AS Tabella,
    COUNT(*) AS Records_Rimanenti
FROM sync_metadata;

SELECT 
    'audit_standards' AS Tabella,
    COUNT(*) AS Records_Rimanenti
FROM audit_standards;

PRINT '--------------------------------------------';

-- Mostra audit rimanenti (dovrebbero essere 0 o solo dati produzione validi)
SELECT 
    audit_id,
    audit_number,
    client_name,
    status,
    audit_date,
    created_at
FROM audits
ORDER BY created_at DESC;

PRINT '============================================';
PRINT '✅ Database pulito e pronto per test freschi';
PRINT '============================================';
*/

-- ============================================================
-- STEP 5: RESET IDENTITY SEEDS (OPZIONALE - solo se vuoi ripartire da ID=1)
-- ============================================================

/*
-- ATTENZIONE: Esegui solo se database completamente vuoto
DBCC CHECKIDENT ('audits', RESEED, 0);
DBCC CHECKIDENT ('non_conformities', RESEED, 0);
DBCC CHECKIDENT ('evidences', RESEED, 0);
DBCC CHECKIDENT ('pending_issues', RESEED, 0);
PRINT '✅ Identity seeds resettati';
*/

GO

-- ============================================================
-- FINE SCRIPT
-- ============================================================
