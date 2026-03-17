CREATE DATABASE IF NOT EXISTS taskmanager_demo;
USE taskmanager_demo;

CREATE TABLE IF NOT EXISTS tasks (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(120) NOT NULL,
    description VARCHAR(500) NULL,
    status VARCHAR(20) NOT NULL,
    created_at_utc DATETIME NOT NULL,
    due_date_utc DATETIME NULL
);

INSERT INTO tasks (title, description, status, created_at_utc, due_date_utc)
VALUES
('Napraviti backend', 'Podesiti API, EF Core i MySQL konekciju.', 'InProgress', UTC_TIMESTAMP(), NULL),
('Napraviti Angular frontend', 'Lista zadataka, forma i filter po statusu.', 'Todo', UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL 3 DAY)),
('Povezati MCP server', 'Dodati alat koji vraća sažetak i statistiku zadataka.', 'Done', UTC_TIMESTAMP(), NULL);
