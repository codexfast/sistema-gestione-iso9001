-- Migration 027: pessimistic lock per audit (multi-utente / multi-device)
-- Un solo lock attivo per audit_id; token opaco salvato come hash SHA-256.

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'audit_locks')
BEGIN
    CREATE TABLE audit_locks (
        lock_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        audit_id INT NOT NULL,
        user_id INT NOT NULL,
        lock_token_hash VARCHAR(64) NOT NULL,
        locked_at DATETIME2 NOT NULL CONSTRAINT DF_audit_locks_locked_at DEFAULT SYSUTCDATETIME(),
        expires_at DATETIME2 NOT NULL,
        CONSTRAINT UQ_audit_locks_audit_id UNIQUE (audit_id),
        CONSTRAINT FK_audit_locks_audit FOREIGN KEY (audit_id) REFERENCES audits(audit_id) ON DELETE CASCADE,
        CONSTRAINT FK_audit_locks_user FOREIGN KEY (user_id) REFERENCES users(user_id)
    );

    CREATE INDEX IX_audit_locks_expires_at ON audit_locks(expires_at);
END
