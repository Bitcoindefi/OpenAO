-- Add Map State Enum
DO $$ BEGIN
    CREATE TYPE map_state AS ENUM ('draft', 'proposed', 'published', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- User Maps Table
CREATE TABLE IF NOT EXISTS user_maps (
    id INTEGER PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    state map_state DEFAULT 'draft',
    npc_count INTEGER DEFAULT 0,
    obj_count INTEGER DEFAULT 0,
    total_size_kb INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_owner FOREIGN KEY (owner_id) REFERENCES accounts(id) ON DELETE CASCADE,
    CONSTRAINT user_map_range CHECK (id >= 40000 AND id <= 49999)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_maps_owner ON user_maps(owner_id);
CREATE INDEX IF NOT EXISTS idx_user_maps_state ON user_maps(state);
