-- Migration: User Map Moderation System (Issue #25)
-- Implements: draft -> proposed -> in_review -> published | rejected

CREATE TYPE user_map_state AS ENUM (
    'draft',
    'proposed',
    'in_review',
    'published',
    'rejected',
    'archived'
);

CREATE TABLE user_maps (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name              VARCHAR(64) NOT NULL,
    map_num           INTEGER UNIQUE,
    map_data          JSONB NOT NULL DEFAULT '{}',
    state             user_map_state NOT NULL DEFAULT 'draft',
    rejection_reason  TEXT,
    npc_count         INTEGER NOT NULL DEFAULT 0,
    obj_count         INTEGER NOT NULL DEFAULT 0,
    allow_combat      BOOLEAN NOT NULL DEFAULT FALSE,
    allow_exp         BOOLEAN NOT NULL DEFAULT FALSE,
    proposed_at       TIMESTAMPTZ,
    published_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT user_maps_name_length CHECK (char_length(name) >= 3),
    CONSTRAINT user_maps_num_range CHECK (map_num IS NULL OR (map_num >= 100000 AND map_num <= 999999))
);

CREATE INDEX idx_user_maps_owner ON user_maps(owner_account_id);
CREATE INDEX idx_user_maps_num ON user_maps(map_num);
CREATE INDEX idx_user_maps_state ON user_maps(state);
CREATE INDEX idx_user_maps_published ON user_maps(published_at DESC) WHERE state = 'published';

CREATE TABLE user_map_reports (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    map_id               UUID NOT NULL REFERENCES user_maps(id) ON DELETE CASCADE,
    reporter_account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    reason               TEXT NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT user_map_reports_unique UNIQUE (map_id, reporter_account_id)
);

CREATE TABLE user_map_reviews (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    map_id               UUID NOT NULL REFERENCES user_maps(id) ON DELETE CASCADE,
    reviewer_account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    action               VARCHAR(16) NOT NULL CHECK (action IN ('approved','rejected','queued','unpublished')),
    notes                TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_map_quotas (
    account_id          UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    max_maps            INTEGER NOT NULL DEFAULT 5,
    max_npcs_per_map    INTEGER NOT NULL DEFAULT 20,
    max_objs_per_map    INTEGER NOT NULL DEFAULT 50,
    max_storage_bytes   INTEGER NOT NULL DEFAULT 5242880,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
