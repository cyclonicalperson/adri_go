-- Seed data for EventHub sample content

USE event_demo_db;

INSERT INTO admins (id, username, password)
VALUES
    (1, 'admin', 'admin');

INSERT INTO events (
    id,
    title,
    description,
    event_date,
    event_time,
    location,
    max_participants,
    is_registration_open,
    created_at
)
VALUES
    (
        1,
        'Design Meetup',
        'An evening gathering for designers, creatives, and curious builders to exchange ideas, hear short talks, and meet new people.',
        '2026-04-12',
        '18:30:00',
        'Belgrade',
        50,
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        2,
        'Product Workshop',
        'A practical workshop focused on prioritization, customer insight, and better product decisions through hands-on exercises.',
        '2026-04-25',
        '13:30:00',
        'Novi Sad',
        30,
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        3,
        'Startup Networking Night',
        'A relaxed evening for founders, operators, and early-stage teams to make introductions, swap stories, and build new connections.',
        '2026-05-08',
        '18:00:00',
        'Nis',
        40,
        FALSE,
        CURRENT_TIMESTAMP
    ),
    (
        4,
        'Marketing Masterclass',
        'A focused session on storytelling, campaign planning, and simple ways to make your message stand out.',
        '2026-05-21',
        '09:30:00',
        'Kragujevac',
        3,
        TRUE,
        CURRENT_TIMESTAMP
    );

INSERT INTO registrations (event_id, full_name, email, registration_date)
VALUES
    (1, 'Milica Petrovic', 'milica.petrovic@example.com', CURRENT_TIMESTAMP),
    (1, 'Marko Jovanovic', 'marko.jovanovic@example.com', CURRENT_TIMESTAMP),
    (2, 'Jelena Nikolic', 'jelena.nikolic@example.com', CURRENT_TIMESTAMP),
    (2, 'Stefan Pavlovic', 'stefan.pavlovic@example.com', CURRENT_TIMESTAMP),
    (3, 'Ivana Simic', 'ivana.simic@example.com', CURRENT_TIMESTAMP),
    (3, 'Petar Kostic', 'petar.kostic@example.com', CURRENT_TIMESTAMP),
    (4, 'Nikola Ilic', 'nikola.ilic@example.com', CURRENT_TIMESTAMP),
    (4, 'Ana Ristic', 'ana.ristic@example.com', CURRENT_TIMESTAMP),
    (4, 'Luka Savic', 'luka.savic@example.com', CURRENT_TIMESTAMP);
