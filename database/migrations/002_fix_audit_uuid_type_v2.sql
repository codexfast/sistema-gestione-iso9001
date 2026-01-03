-- =====================================================
-- MIGRATION 002 v2: Fix audit_uuid DEFINITIVO
-- Trova e droppa TUTTI i constraint prima di ALTER
-- =====================================================

USE SGQ_ISO9001;
GO

-- Step 1: Trova e droppa TUTTI i constraint su audit_uuid
DECLARE @sql NVARCHAR(MAX) = '';

-- DEFAULT constraints
SELECT @sql = @sql + 'ALTER TABLE audits DROP CONSTRAINT ' + dc.name + '; '
FROM sys.default_constraints dc
INNER JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
WHERE c.object_id = OBJECT_ID('audits') AND c.name = 'audit_uuid';

-- UNIQUE constraints (tutti i nomi possibili)
SELECT @sql = @sql + 'ALTER TABLE audits DROP CONSTRAINT ' + kc.name + '; '
FROM sys.key_constraints kc
WHERE kc.parent_object_id = OBJECT_ID('audits')
AND kc.type = 'UQ'
AND EXISTS (
    SELECT 1 FROM sys.index_columns ic
    INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
    WHERE ic.object_id = OBJECT_ID('audits')
    AND ic.index_id = kc.unique_index_id
    AND c.name = 'audit_uuid'
);

-- INDEXES (tutti)
SELECT @sql = @sql + 'DROP INDEX ' + i.name + ' ON audits; '
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE i.object_id = OBJECT_ID('audits')
AND c.name = 'audit_uuid'
AND i.is_primary_key = 0
AND i.is_unique_constraint = 0;

-- Esegui tutti i DROP
IF LEN(@sql) > 0
BEGIN
    PRINT 'Eseguo: ' + @sql;
    EXEC sp_executesql @sql;
    PRINT '✅ Tutti i constraint e index su audit_uuid rimossi';
END
ELSE
BEGIN
    PRINT '⚠️ Nessun constraint trovato (già rimossi?)';
END
GO

-- Step 2: ALTER COLUMN (finalmente libero)
ALTER TABLE audits
ALTER COLUMN audit_uuid NVARCHAR(100) NOT NULL;
GO

PRINT '✅ Colonna audit_uuid convertita a NVARCHAR(100)';
GO

-- Step 3: Ricrea solo UNIQUE constraint (no default - UUID generato da frontend)
ALTER TABLE audits
ADD CONSTRAINT UQ_audits_audit_uuid UNIQUE (audit_uuid);
GO

PRINT '✅ UNIQUE constraint ricreato';
GO

-- Step 4: Ricrea index ottimizzato
CREATE NONCLUSTERED INDEX idx_audits_uuid
ON audits(audit_uuid)
INCLUDE (audit_id, status, updated_at);
GO

PRINT '✅ Index ricreato con INCLUDE';
GO

-- Step 5: Verifica finale
SELECT 
    c.name AS colonna,
    t.name AS tipo,
    c.max_length AS lunghezza,
    CASE WHEN c.is_nullable = 0 THEN 'NOT NULL' ELSE 'NULL' END AS nullable,
    dc.name AS default_constraint,
    (SELECT STRING_AGG(kc.name, ', ') 
     FROM sys.key_constraints kc
     INNER JOIN sys.index_columns ic ON kc.unique_index_id = ic.index_id AND kc.parent_object_id = ic.object_id
     WHERE ic.object_id = c.object_id AND ic.column_id = c.column_id
    ) AS unique_constraints,
    (SELECT STRING_AGG(i.name, ', ')
     FROM sys.indexes i
     INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
     WHERE ic.object_id = c.object_id AND ic.column_id = c.column_id
    ) AS indexes
FROM sys.columns c
INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
LEFT JOIN sys.default_constraints dc ON c.default_object_id = dc.object_id
WHERE c.object_id = OBJECT_ID('audits')
AND c.name = 'audit_uuid';
GO

PRINT '';
PRINT '✅✅✅ MIGRATION 002 v2 COMPLETATA! ✅✅✅';
GO
