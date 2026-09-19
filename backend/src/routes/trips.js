import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/trips
router.get('/', async (req, res) => {
    const { data, error } = await supabase
        .from('trips')
        .select('*, trip_participants(person_id)')
        .eq('user_id', req.userId)
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    
    // Format for frontend
    const formattedData = data.map(t => ({
        ...t,
        participants: t.trip_participants || []
    }));
    
    res.json(formattedData);
});

// POST /api/trips
router.post('/', async (req, res) => {
    const { name, type, is_international, destination, budget, ticket_price_onward, ticket_price_return, start_date, end_date, participants } = req.body;

    const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
            user_id: req.userId,
            name,
            type,
            is_international: is_international || false,
            destination,
            budget: budget || 0,
            ticket_price_onward: ticket_price_onward || null,
            ticket_price_return: ticket_price_return || null,
            start_date,
            end_date,
            status: 'planned'
        })
        .select()
        .single();

    if (tripError) return res.status(500).json({ error: tripError.message });

    // Helper to get or create person
    async function getOrCreatePerson(userId, name) {
        let { data } = await supabase.from('people').select('id').eq('user_id', userId).eq('name', name).single();
        if (!data) {
            const { data: newPerson } = await supabase.from('people').insert({ user_id: userId, name }).select('id').single();
            return newPerson.id;
        }
        return data.id;
    }

    // Add owner participant
    const ownerName = type === 'solo' ? 'Me' : 'Me';
    const meId = await getOrCreatePerson(req.userId, ownerName);
    let partsToInsert = [{ trip_id: trip.id, person_id: meId, is_owner: true }];
    
    if (type === 'group' && Array.isArray(participants)) {
        for (const p of participants) {
            let pid = p.person_id;
            if (!pid && p.name) pid = await getOrCreatePerson(req.userId, p.name);
            if (pid) {
                partsToInsert.push({ trip_id: trip.id, person_id: pid, is_owner: false });
            }
        }
    }

    const { error: partsError } = await supabase
        .from('trip_participants')
        .insert(partsToInsert);

    if (partsError) return res.status(500).json({ error: partsError.message });

    res.status(201).json(trip);
});

// GET /api/trips/:id
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .eq('user_id', req.userId)
        .single();

    if (tripError) return res.status(404).json({ error: 'Trip not found' });

    const { data: participants, error: partsError } = await supabase
        .from('trip_participants')
        .select('*, people(name)')
        .eq('trip_id', id);

    if (partsError) return res.status(500).json({ error: partsError.message });

    // Flatten people name into participant object for frontend compatibility if needed
    const formattedParticipants = participants?.map(p => ({
        ...p,
        name: p.people?.name || 'Unknown'
    })) || [];

    res.json({ ...trip, participants: formattedParticipants });
});

// PUT /api/trips/:id
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
        .from('trips')
        .update(updates)
        .eq('id', id)
        .eq('user_id', req.userId)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// DELETE /api/trips/:id
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', id)
        .eq('user_id', req.userId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// POST /api/trips/:id/participants
router.post('/:id/participants', async (req, res) => {
    const { id } = req.params;
    const { person_id } = req.body;

    // Verify trip ownership
    const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('id')
        .eq('id', id)
        .eq('user_id', req.userId)
        .single();

    if (tripError || !trip) return res.status(404).json({ error: 'Trip not found' });

    const { data, error } = await supabase
        .from('trip_participants')
        .insert({ trip_id: id, person_id, is_owner: false })
        .select('*, people(name)')
        .single();

    if (error) return res.status(500).json({ error: error.message });
    
    // Format for frontend
    res.status(201).json({
        ...data,
        name: data.people?.name || 'Unknown'
    });
});

// DELETE /api/trips/:id/participants/:participantId
router.delete('/:id/participants/:participantId', async (req, res) => {
    const { id, participantId } = req.params;

    // Verify trip ownership
    const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('id')
        .eq('id', id)
        .eq('user_id', req.userId)
        .single();

    if (tripError || !trip) return res.status(404).json({ error: 'Trip not found' });

    const { error } = await supabase
        .from('trip_participants')
        .delete()
        .eq('id', participantId)
        .eq('trip_id', id)
        .eq('is_owner', false); // Can't delete owner

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// GET /api/trips/:id/transactions
router.get('/:id/transactions', async (req, res) => {
    const { id } = req.params;

    // Verify trip ownership
    const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('id')
        .eq('id', id)
        .eq('user_id', req.userId)
        .single();

    if (tripError || !trip) return res.status(404).json({ error: 'Trip not found' });

    const { data, error } = await supabase
        .from('trip_transactions')
        .select('*, trip_participants(name)')
        .eq('trip_id', id)
        .order('occurred_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST /api/trips/:id/transactions
router.post('/:id/transactions', async (req, res) => {
    const { id } = req.params;
    const { paid_by_participant_id, amount, description, occurred_at, account_id } = req.body;

    // Verify trip ownership
    const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('id, name')
        .eq('id', id)
        .eq('user_id', req.userId)
        .single();

    if (tripError || !trip) return res.status(404).json({ error: 'Trip not found' });

    let linked_transaction_id = null;

    // Dual-write: If an account_id is provided, it implies the user paid from their real account.
    if (account_id) {
        // Need to create a transaction in the main `transactions` table.
        const { data: personalTx, error: pTxError } = await supabase
            .from('transactions')
            .insert({
                user_id: req.userId,
                account_id,
                amount,
                type: 'expense',
                description: `[Trip: ${trip.name}] ${description}`,
                date: occurred_at || new Date().toISOString(),
                trip_id: id // New field
            })
            .select('id')
            .single();

        if (pTxError) return res.status(500).json({ error: pTxError.message });
        linked_transaction_id = personalTx.id;
    }

    const { data, error } = await supabase
        .from('trip_transactions')
        .insert({
            trip_id: id,
            paid_by_participant_id,
            amount,
            description,
            occurred_at: occurred_at || new Date().toISOString(),
            account_id: account_id || null,
            linked_transaction_id
        })
        .select()
        .single();

    if (error) {
        // Rollback personal tx if this fails?
        if (linked_transaction_id) {
            await supabase.from('transactions').delete().eq('id', linked_transaction_id);
        }
        return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data);
});

// DELETE /api/trips/:id/transactions/:txId
router.delete('/:id/transactions/:txId', async (req, res) => {
    const { id, txId } = req.params;

    // Verify trip ownership
    const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('id')
        .eq('id', id)
        .eq('user_id', req.userId)
        .single();

    if (tripError || !trip) return res.status(404).json({ error: 'Trip not found' });

    // Find the tx to see if it has a linked_transaction_id
    const { data: tx, error: txError } = await supabase
        .from('trip_transactions')
        .select('linked_transaction_id')
        .eq('id', txId)
        .eq('trip_id', id)
        .single();

    if (txError || !tx) return res.status(404).json({ error: 'Transaction not found' });

    const { error: delError } = await supabase
        .from('trip_transactions')
        .delete()
        .eq('id', txId)
        .eq('trip_id', id);

    if (delError) return res.status(500).json({ error: delError.message });

    // Also delete the linked transaction
    if (tx.linked_transaction_id) {
        await supabase
            .from('transactions')
            .delete()
            .eq('id', tx.linked_transaction_id)
            .eq('user_id', req.userId); // Ensure ownership
    }

    res.json({ success: true });
});

async function getSettlementData(id) {
    // 1. Fetch participants
    const { data: participantsRaw, error: pError } = await supabase
        .from('trip_participants')
        .select('id, people(name)')
        .eq('trip_id', id);

    if (pError) throw new Error(pError.message);
    
    const participants = participantsRaw.map(p => ({
        id: p.id,
        name: p.people?.name || 'Unknown'
    }));

    // 2. Fetch all transactions
    const { data: transactions, error: tError } = await supabase
        .from('trip_transactions')
        .select('paid_by_participant_id, amount')
        .eq('trip_id', id);

    if (tError) throw new Error(tError.message);

    const participantCount = participants.length;
    if (participantCount === 0) return { total_spend: 0, balances: [], payments: [] };

    let totalSpend = 0;
    const paidByPart = {};
    participants.forEach(p => paidByPart[p.id] = 0);

    transactions.forEach(tx => {
        totalSpend += Number(tx.amount);
        if (paidByPart[tx.paid_by_participant_id] !== undefined) {
            paidByPart[tx.paid_by_participant_id] += Number(tx.amount);
        }
    });

    const fairShare = totalSpend / participantCount;

    const balances = participants.map(p => {
        const paid = paidByPart[p.id];
        const balance = paid - fairShare;
        return {
            participant_id: p.id,
            name: p.name,
            paid: parseFloat(paid.toFixed(2)),
            fair_share: parseFloat(fairShare.toFixed(2)),
            balance: parseFloat(balance.toFixed(2))
        };
    });

    // Debt Simplification algorithm
    let debtors = balances.filter(b => b.balance < -0.01).map(b => ({ ...b })).sort((a, b) => a.balance - b.balance); // most negative first
    let creditors = balances.filter(b => b.balance > 0.01).map(b => ({ ...b })).sort((a, b) => b.balance - a.balance); // most positive first

    const payments = [];

    let d = 0;
    let c = 0;

    while (d < debtors.length && c < creditors.length) {
        const debtor = debtors[d];
        const creditor = creditors[c];

        const amountToPay = Math.min(Math.abs(debtor.balance), creditor.balance);

        if (amountToPay > 0.01) {
            payments.push({
                from: debtor.name,
                to: creditor.name,
                amount: parseFloat(amountToPay.toFixed(2))
            });
        }

        debtor.balance += amountToPay;
        creditor.balance -= amountToPay;

        if (Math.abs(debtor.balance) < 0.01) d++;
        if (creditor.balance < 0.01) c++;
    }

    return {
        total_spend: parseFloat(totalSpend.toFixed(2)),
        balances,
        payments
    };
}

// GET /api/trips/:id/settlement
router.get('/:id/settlement', async (req, res) => {
    const { id } = req.params;

    try {
        const data = await getSettlementData(id);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/trips/:id/complete
router.post('/:id/complete', async (req, res) => {
    const { id } = req.params;

    try {
        // Calculate live settlement first
        const { balances } = await getSettlementData(id);

        // Begin saving snapshot
        const settlementsToInsert = balances.map(b => ({
            trip_id: id,
            participant_id: b.participant_id,
            paid: b.paid,
            fair_share: b.fair_share,
            balance: b.balance
        }));

        if (settlementsToInsert.length > 0) {
            const { error: sError } = await supabase
                .from('trip_settlements')
                .insert(settlementsToInsert);

            if (sError) return res.status(500).json({ error: sError.message });
        }

        // Mark trip as completed
        const { data: trip, error: uError } = await supabase
            .from('trips')
            .update({ status: 'completed' })
            .eq('id', id)
            .eq('user_id', req.userId)
            .select()
            .single();

        if (uError) return res.status(500).json({ error: uError.message });

        res.json(trip);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
