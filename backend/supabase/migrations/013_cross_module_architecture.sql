-- 013_cross_module_architecture.sql

-- 1. Create people table
CREATE TABLE people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create links table
CREATE TABLE links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    from_type TEXT NOT NULL,
    from_id UUID NOT NULL,
    to_type TEXT NOT NULL,
    to_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
    due_date DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create notes table
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Alter existing tables to add person_id
ALTER TABLE people_ledger ADD COLUMN person_id UUID REFERENCES people(id) ON DELETE RESTRICT;
ALTER TABLE trip_participants ADD COLUMN person_id UUID REFERENCES people(id) ON DELETE RESTRICT;

-- 6. Migrate Data
DO $$
DECLARE
    r RECORD;
    new_person_id UUID;
BEGIN
    -- For people_ledger
    FOR r IN SELECT id, user_id, person_name FROM people_ledger WHERE person_id IS NULL
    LOOP
        -- Find or create person
        SELECT id INTO new_person_id FROM people WHERE user_id = r.user_id AND name = r.person_name LIMIT 1;
        IF new_person_id IS NULL THEN
            INSERT INTO people (user_id, name) VALUES (r.user_id, r.person_name) RETURNING id INTO new_person_id;
        END IF;
        -- Link
        UPDATE people_ledger SET person_id = new_person_id WHERE id = r.id;
    END LOOP;

    -- For trip_participants (need to get user_id from trips table)
    FOR r IN SELECT tp.id, tp.name, t.user_id FROM trip_participants tp JOIN trips t ON tp.trip_id = t.id WHERE tp.person_id IS NULL
    LOOP
        -- Find or create person
        SELECT id INTO new_person_id FROM people WHERE user_id = r.user_id AND name = r.name LIMIT 1;
        IF new_person_id IS NULL THEN
            INSERT INTO people (user_id, name) VALUES (r.user_id, r.name) RETURNING id INTO new_person_id;
        END IF;
        -- Link
        UPDATE trip_participants SET person_id = new_person_id WHERE id = r.id;
    END LOOP;
END $$;

-- 7. Make person_id NOT NULL and Drop old columns
ALTER TABLE people_ledger ALTER COLUMN person_id SET NOT NULL;
ALTER TABLE people_ledger DROP COLUMN person_name;

ALTER TABLE trip_participants ALTER COLUMN person_id SET NOT NULL;
ALTER TABLE trip_participants DROP COLUMN name;

-- 8. Enable RLS and Policies
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their people" ON people FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their links" ON links FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their tasks" ON tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their notes" ON notes FOR ALL USING (auth.uid() = user_id);
