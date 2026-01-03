-- =====================================================
-- MIGRATION 002: Fix audit_uuid da UNIQUEIDENTIFIER a NVARCHAR
-- Data: 2025-12-22
-- Motivo: Frontend usa ID custom (es: "audit-001-acme-2025")
--         invece di GUID SQL Server, causando errori di conversione
-- =====================================================

USE SGQ_ISO9001;
GO

-- Step 1: Drop DEFAULT constraint (NEWID())
DECLARE @default_constraint NVARCHAR(200);
SELECT @default_constraint = name
FROM sys.default_constraints
WHERE parent_object_id = OBJECT_ID('audits')
AND parent_column_id = (SELECT column_id FROM sys.columns WHERE object_id = OBJECT_ID('audits') AND name = 'audit_uuid');

IF @default_constraint IS NOT NULL
BEGIN
    EXEC('ALTER TABLE audits DROP CONSTRAINT ' + @default_constraint);
    PRINT '✅ DEFAULT constraint rimosso: ' + @default_constraint;
END
GO

-- Step 2: Drop UNIQUE constraint (cerca nome dinamicamente)
DECLARE @unique_constraint NVARCHAR(200);
SELECT @unique_constraint = kc.name
FROM sys.key_constraints kc
INNER JOIN sys.index_columns ic ON kc.parent_object_id = ic.object_id AND kc.unique_index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE kc.parent_object_id = OBJECT_ID('audits')
AND c.name = 'audit_uuid'
AND kc.type = 'UQ';

IF @unique_constraint IS NOT NULL
BEGIN
    EXEC('ALTER TABLE audits DROP CONSTRAINT ' + @unique_constraint);
    PRINT '✅ UNIQUE constraint rimosso: ' + @unique_constraint;
END
GO

-- Step 3: Drop index su audit_uuid
IF EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'idx_audits_uuid' 
    AND object_id = OBJECT_ID('audits')
)
BEGIN
    DROP INDEX idx_audits_uuid ON audits;
    PRINT '✅ Index idx_audits_uuid rimosso';
END
GO

-- Step 4: Altera tipo colonna da UNIQUEIDENTIFIER a NVARCHAR(100)
ALTER TABLE audits
ALTER COLUMN audit_uuid NVARCHAR(100) NOT NULL;
GO

PRINT '✅ Colonna audit_uuid convertita da UNIQUEIDENTIFIER a NVARCHAR(100)';
GO

-- Step 5: Ricrea UNIQUE constraint (NON default, audit_uuid sarà generato da frontend)
ALTER TABLE audits
ADD CONSTRAINT UQ_audits_audit_uuid UNIQUE (audit_uuid);
GO

PRINT '✅ Constraint UNIQUE su audit_uuid ricreato';
GO

-- Step 6: Ricrea index ottimizzato per stringhe
CREATE NONCLUSTERED INDEX idx_audits_uuid
ON audits(audit_uuid)
INCLUDE (audit_id, status, updated_at);
GO

PRINT '✅ Index idx_audits_uuid ricreato con INCLUDE per performance';
GO

-- Step 7: Verifica risultato
SELECT 
    c.name AS column_name,
    t.name AS data_type,
    c.max_length,
    c.is_nullable
FROM sys.columns c
INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID('audits')
AND c.name = 'audit_uuid';
GO

PRINT '✅ Migration 002 completata con successo!';
GO
