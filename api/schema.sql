-- Existing tables assumed, adding/modifying for moderation
ALTER TABLE user_maps ADD COLUMN status VARCHAR(20) DEFAULT 'draft'; -- draft, proposed, in_review, published, rejected
ALTER TABLE user_maps ADD COLUMN rejection_reason TEXT;
ALTER TABLE user_maps ADD COLUMN moderator_id INTEGER;
ALTER TABLE user_maps ADD COLUMN report_count INTEGER DEFAULT 0;
ALTER TABLE user_maps ADD COLUMN last_reviewed_at TIMESTAMP;

CREATE TABLE map_reports (
    id SERIAL PRIMARY KEY,
    map_id INTEGER REFERENCES user_maps(id),
    reporter_id INTEGER,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE moderators (
    user_id INTEGER PRIMARY KEY,
    level INTEGER DEFAULT 1 -- Can be used for different tiers of moderators
);
