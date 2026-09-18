-- 012_travel_finance.sql

-- 1. Create `trips` table
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('solo', 'group')),
    is_international BOOLEAN DEFAULT false,
    destination TEXT,
    budget NUMERIC(12,2) DEFAULT 0,
    ticket_price_onward NUMERIC(12,2),
    ticket_price_return NUMERIC(12,2),
    start_date DATE,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create `trip_participants` table
CREATE TABLE trip_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    is_owner BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create `trip_transactions` table
CREATE TABLE trip_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
    paid_by_participant_id UUID REFERENCES trip_participants(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    description TEXT,
    occurred_at TIMESTAMPTZ DEFAULT now(),
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    linked_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create `trip_settlements` table
CREATE TABLE trip_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
    participant_id UUID REFERENCES trip_participants(id) ON DELETE CASCADE NOT NULL,
    paid NUMERIC(12,2) DEFAULT 0,
    fair_share NUMERIC(12,2) DEFAULT 0,
    balance NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Alter existing `transactions` table to add cross-reference
ALTER TABLE transactions 
ADD COLUMN trip_id UUID REFERENCES trips(id) ON DELETE SET NULL;

-- 6. Enable RLS
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_settlements ENABLE ROW LEVEL SECURITY;

-- 7. Policies for `trips`
CREATE POLICY "Users can view their own trips" ON trips
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own trips" ON trips
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own trips" ON trips
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own trips" ON trips
    FOR DELETE USING (auth.uid() = user_id);

-- 8. Policies for `trip_participants`
CREATE POLICY "Users can manage participants of their own trips" ON trip_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM trips 
            WHERE trips.id = trip_participants.trip_id 
            AND trips.user_id = auth.uid()
        )
    );

-- 9. Policies for `trip_transactions`
CREATE POLICY "Users can manage transactions of their own trips" ON trip_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM trips 
            WHERE trips.id = trip_transactions.trip_id 
            AND trips.user_id = auth.uid()
        )
    );

-- 10. Policies for `trip_settlements`
CREATE POLICY "Users can manage settlements of their own trips" ON trip_settlements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM trips 
            WHERE trips.id = trip_settlements.trip_id 
            AND trips.user_id = auth.uid()
        )
    );
