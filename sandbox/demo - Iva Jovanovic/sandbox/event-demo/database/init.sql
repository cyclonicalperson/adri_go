-- EventHub demo application database schema
-- Target: MySQL 8.x

CREATE DATABASE IF NOT EXISTS event_demo_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE event_demo_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS registrations;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS admins;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE admins (
    id INT NOT NULL AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_admins_username UNIQUE (username)
) ENGINE=InnoDB;

CREATE TABLE events (
    id INT NOT NULL AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    location VARCHAR(200) NOT NULL,
    max_participants INT NOT NULL,
    is_registration_open BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT chk_events_max_participants CHECK (max_participants > 0),
    INDEX idx_events_event_date (event_date)
) ENGINE=InnoDB;

CREATE TABLE registrations (
    id INT NOT NULL AUTO_INCREMENT,
    event_id INT NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    registration_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_registrations_events
        FOREIGN KEY (event_id) REFERENCES events(id)
        ON DELETE CASCADE,
    CONSTRAINT uq_registrations_event_email UNIQUE (event_id, email),
    INDEX idx_registrations_event_id (event_id),
    INDEX idx_registrations_registration_date (registration_date)
) ENGINE=InnoDB;
