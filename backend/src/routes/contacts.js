import { Router } from 'express';
import multer from 'multer';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { parseVCF, parseCSV } from '../services/contactsImporter.js';

const router = Router();
router.use(authenticate);

// Get all contacts
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('user_id', req.userId)
    .order('name', { ascending: true });

  if (error) throw error;
  res.json(data);
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/people/import
router.post('/import', upload.single('contacts'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const text    = req.file.buffer.toString('utf-8');
  const mime    = req.file.originalname.toLowerCase();
  const records = mime.endsWith('.vcf') ? parseVCF(text) : parseCSV(text);

  let created = 0, updated = 0, skipped = 0;

  for (const record of records) {
    if (!record.name) { skipped++; continue; }

    const { data: existing } = await supabase
      .from('people')
      .select('id, phone, email, birthday')
      .eq('user_id', req.userId)
      .ilike('name', record.name)
      .single();

    if (existing) {
      const patch = {};
      if (record.phone    && !existing.phone)    patch.phone    = record.phone;
      if (record.email    && !existing.email)    patch.email    = record.email;
      if (record.birthday && !existing.birthday) patch.birthday = record.birthday;

      if (Object.keys(patch).length > 0) {
        await supabase.from('people').update(patch).eq('id', existing.id);
        updated++;
      } else {
        skipped++;
      }
    } else {
      await supabase.from('people').insert({
        user_id:  req.userId,
        name:     record.name,
        phone:    record.phone    || null,
        email:    record.email    || null,
        birthday: record.birthday || null,
      });
      created++;
    }
  }

  await supabase.from('contacts_import_log').insert({
    user_id: req.userId,
    total:   records.length,
    created, updated, skipped,
  });

  res.json({ total: records.length, created, updated, skipped });
});

// Create a contact
router.post('/', async (req, res) => {
  const { name, avatar, email, phone, birthday } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const { data, error } = await supabase
    .from('people')
    .insert([{ 
      user_id: req.userId, 
      name, 
      avatar,
      email: email || null,
      phone: phone || null,
      birthday: birthday || null,
    }])
    .select()
    .single();

  if (error) throw error;
  res.status(201).json(data);
});

// Update a contact
router.put('/:id', async (req, res) => {
  const { name, avatar, email, phone, birthday } = req.body;
  const { data, error } = await supabase
    .from('people')
    .update({ 
      name, 
      avatar,
      email: email || null,
      phone: phone || null,
      birthday: birthday || null,
    })
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .select()
    .single();

  if (error) throw error;
  res.json(data);
});

// Delete a contact
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('people')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId);

  if (error) throw error;
  res.status(204).send();
});

// Get contact history
router.get('/:id/history', async (req, res) => {
  const { id } = req.params;

  // Verify contact ownership
  const { data: contact } = await supabase
    .from('people').select('id, name').eq('id', id).eq('user_id', req.userId).single();
  if (!contact) return res.status(404).json({ error: 'Contact not found' });

  const [ledgerItems, tripParticipations] = await Promise.all([
    // People Ledger entries
    supabase.from('people_ledger')
      .select('*')
      .eq('person_id', id)
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false }),

    // Trips they participated in
    supabase.from('trip_participants')
      .select('*, trips(id, name, start_date, end_date, status, destination)')
      .eq('person_id', id)
  ]);

  // For each trip, get their payment share and what they owe/are owed
  const tripIds = (tripParticipations.data || []).map(tp => tp.trips?.id).filter(Boolean);
  const tripSettlements = tripIds.length ? await supabase
    .from('trip_settlements')
    .select('*')
    .in('trip_id', tripIds)
    .eq('participant_id', id) : { data: [] };

  res.json({
    contact,
    ledger: ledgerItems.data || [],
    trips: tripParticipations.data || [],
    settlements: tripSettlements.data || [],
    summary: {
      total_lent:     (ledgerItems.data || []).filter(l => l.direction === 'lent').reduce((s,l) => s + Number(l.amount), 0),
      total_borrowed: (ledgerItems.data || []).filter(l => l.direction === 'borrowed').reduce((s,l) => s + Number(l.amount), 0),
      total_trips:    tripIds.length,
    }
  });
});

export default router;
