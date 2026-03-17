-- =============================================
-- LoginApp Database Setup Script
-- Pokreni u SQL Server Management Studio ili sqlcmd
-- =============================================

USE master;
GO

-- Kreira bazu ako ne postoji
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'LoginAppDb')
BEGIN
    CREATE DATABASE LoginAppDb;
END
GO

USE LoginAppDb;
GO

-- Kreira tabelu Users
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[Users] (
        [Id]           INT            IDENTITY(1,1) NOT NULL,
        [Username]     NVARCHAR(50)   NOT NULL,
        [Email]        NVARCHAR(100)  NOT NULL,
        [PasswordHash] NVARCHAR(MAX)  NOT NULL,
        [FullName]     NVARCHAR(100)  NOT NULL DEFAULT '',
        [Role]         NVARCHAR(20)   NOT NULL DEFAULT 'User',
        [CreatedAt]    DATETIME2(7)   NOT NULL DEFAULT GETUTCDATE(),
        [IsActive]     BIT            NOT NULL DEFAULT 1,
        
        CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED ([Id] ASC)
    );

    CREATE UNIQUE INDEX [IX_Users_Username] ON [dbo].[Users] ([Username]);
    CREATE UNIQUE INDEX [IX_Users_Email]    ON [dbo].[Users] ([Email]);
END
GO

-- Seed admin korisnik (lozinka: Admin123!)
-- BCrypt hash za "Admin123!"
IF NOT EXISTS (SELECT 1 FROM [dbo].[Users] WHERE [Username] = 'admin')
BEGIN
    INSERT INTO [dbo].[Users] ([Username], [Email], [PasswordHash], [FullName], [Role], [CreatedAt], [IsActive])
    VALUES (
        'admin',
        'admin@loginapp.com',
        '$2a$11$8K1p/a0dclxeb58Ex6RVFuJwPV3xFOtBqT6oNkgS5yZtf4VwEVe.K',
        'Administrator',
        'Admin',
        '2024-01-01 00:00:00',
        1
    );
END
GO

-- Dodaj test korisnike
IF NOT EXISTS (SELECT 1 FROM [dbo].[Users] WHERE [Username] = 'marko')
BEGIN
    INSERT INTO [dbo].[Users] ([Username], [Email], [PasswordHash], [FullName], [Role], [CreatedAt], [IsActive])
    VALUES 
    ('marko', 'marko@example.com', '$2a$11$8K1p/a0dclxeb58Ex6RVFuJwPV3xFOtBqT6oNkgS5yZtf4VwEVe.K', 'Marko Marković', 'User', GETUTCDATE(), 1),
    ('ana',   'ana@example.com',   '$2a$11$8K1p/a0dclxeb58Ex6RVFuJwPV3xFOtBqT6oNkgS5yZtf4VwEVe.K', 'Ana Anić',       'User', GETUTCDATE(), 1);
END
GO

PRINT 'Baza uspešno kreirana! Podrazumevana lozinka za sve korisnike: Admin123!';
GO
