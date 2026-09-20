import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient.js';

const triggerHaptic = () => {};

export function useAccounts() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['accounts'], queryFn: () => apiClient.get('/accounts') });

  const create = useMutation({
    mutationFn: (data) => apiClient.post('/accounts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }) => apiClient.put(`/accounts/${id}`, data),
    onSuccess: () => {
      triggerHaptic();
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  const remove = useMutation({
    mutationFn: (id) => apiClient.delete(`/accounts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });

  const transfer = useMutation({
    mutationFn: ({ from_account_id, ...data }) => apiClient.post(`/accounts/${from_account_id}/transfer`, data),
    onSuccess: () => {
      triggerHaptic();
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return { query, create, update, remove, transfer };
}

export function useBudget(month) {
  const queryClient = useQueryClient();
  const monthKey = month || new Date().toISOString().substring(0, 7);

  const budgetQuery = useQuery({
    queryKey: ['budget', monthKey],
    queryFn: () => apiClient.get(`/budget/${monthKey}`).catch(() => null),
    retry: false,
  });

  const allocateMutation = useMutation({
    mutationFn: ({ target_type, target_id, allocated_amount }) =>
      apiClient.put(`/budget/${monthKey}/allocations/${target_type}/${target_id}`, { allocated_amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const removeAllocation = useMutation({
    mutationFn: ({ target_type, target_id }) =>
      apiClient.delete(`/budget/${monthKey}/allocations/${target_type}/${target_id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return { budgetQuery, allocateMutation, removeAllocation };
}

export function useIncome() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['income'], queryFn: () => apiClient.get('/income') });

  const create = useMutation({
    mutationFn: (data) => apiClient.post('/income', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['income'] }),
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }) => apiClient.put(`/income/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['income'] }),
  });

  const remove = useMutation({
    mutationFn: (id) => apiClient.delete(`/income/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['income'] }),
  });

  return { query, create, update, remove };
}

export function useItems() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['items'], queryFn: () => apiClient.get('/items') });

  const create = useMutation({
    mutationFn: (data) => apiClient.post('/items', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['items'] }),
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }) => apiClient.put(`/items/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['items'] }),
  });

  const remove = useMutation({
    mutationFn: (id) => apiClient.delete(`/items/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['items'] }),
  });

  return { query, create, update, remove };
}

export function useDebts() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['debts'], queryFn: () => apiClient.get('/debts') });

  const create = useMutation({
    mutationFn: (data) => apiClient.post('/debts', data),
    onSuccess: () => {
      triggerHaptic();
      queryClient.invalidateQueries({ queryKey: ['debts'] });
    }
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }) => apiClient.put(`/debts/${id}`, data),
    onSuccess: () => {
      triggerHaptic();
      queryClient.invalidateQueries({ queryKey: ['debts'] });
    }
  });

  const remove = useMutation({
    mutationFn: (id) => apiClient.delete(`/debts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['debts'] }),
  });

  return { query, create, update, remove };
}

export function useGoals() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['goals'], queryFn: () => apiClient.get('/goals') });

  const create = useMutation({
    mutationFn: (data) => apiClient.post('/goals', data),
    onSuccess: () => {
      triggerHaptic();
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }) => apiClient.put(`/goals/${id}`, data),
    onSuccess: () => {
      triggerHaptic();
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  });

  const remove = useMutation({
    mutationFn: (id) => apiClient.delete(`/goals/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });

  return { query, create, update, remove };
}

export function useTransactions(filters = {}) {
  const queryClient = useQueryClient();
  
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') queryParams.append(k, v);
  });
  
  const queryStr = queryParams.toString();
  const endpoint = `/transactions${queryStr ? '?' + queryStr : ''}`;

  const query = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => apiClient.get(endpoint),
  });

  const create = useMutation({
    mutationFn: (data) => apiClient.post('/transactions', data),
    onSuccess: () => {
      triggerHaptic();
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id) => apiClient.delete(`/transactions/${id}`),
    onSuccess: () => {
      triggerHaptic();
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  });

  return { query, create, remove };
}

export function useCategorizationTrainingData() {
  return useQuery({
    queryKey: ['transactions_learning'],
    queryFn: () => apiClient.get('/transactions?type=expense'),
    staleTime: 1000 * 60 * 5 // Cache for 5 mins
  });
}

export function useDashboard(month) {
  const monthKey = month || new Date().toISOString().substring(0, 7);
  const summary = useQuery({
    queryKey: ['dashboard', monthKey],
    queryFn: () => apiClient.get(`/dashboard/summary?month=${monthKey}`),
  });
  return { summary };
}

export function useAnalytics(month) {
  const monthKey = month || new Date().toISOString().substring(0, 7);
  const trends = useQuery({
    queryKey: ['analytics', monthKey],
    queryFn: () => apiClient.get(`/analytics/trends?month=${monthKey}`),
  });
  return { trends };
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => apiClient.get('/settings').catch(() => null),
  });
}

export function useSubscriptions() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['subscriptions'], queryFn: () => apiClient.get('/subscriptions') });

  const create = useMutation({
    mutationFn: (data) => apiClient.post('/subscriptions', data),
    onSuccess: () => {
      triggerHaptic();
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    }
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }) => apiClient.put(`/subscriptions/${id}`, data),
    onSuccess: () => {
      triggerHaptic();
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    }
  });

  const remove = useMutation({
    mutationFn: (id) => apiClient.delete(`/subscriptions/${id}`),
    onSuccess: () => {
      triggerHaptic();
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    }
  });

  const processAll = useMutation({
    mutationFn: () => apiClient.post('/subscriptions/process'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  return { query, create, update, remove, processAll };
}

export function usePeopleLedger() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['peopleLedger'], queryFn: () => apiClient.get('/people-ledger') });

  const create = useMutation({
    mutationFn: (data) => apiClient.post('/people-ledger', data),
    onSuccess: () => {
      triggerHaptic();
      queryClient.invalidateQueries({ queryKey: ['peopleLedger'] });
    }
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }) => apiClient.put(`/people-ledger/${id}`, data),
    onSuccess: () => {
      triggerHaptic();
      queryClient.invalidateQueries({ queryKey: ['peopleLedger'] });
    }
  });

  const remove = useMutation({
    mutationFn: (id) => apiClient.delete(`/people-ledger/${id}`),
    onSuccess: () => {
      triggerHaptic();
      queryClient.invalidateQueries({ queryKey: ['peopleLedger'] });
    }
  });

  return { query, create, update, remove };
}

export function useContacts() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['contacts'], queryFn: () => apiClient.get('/people') });

  const create = useMutation({
    mutationFn: (data) => apiClient.post('/people', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts'] }),
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }) => apiClient.put(`/people/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts'] }),
  });

  const remove = useMutation({
    mutationFn: (id) => apiClient.delete(`/people/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts'] }),
  });

  return { query, create, update, remove };
}

export function useTasks() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['tasks'], queryFn: () => apiClient.get('/tasks') });

  const create = useMutation({
    mutationFn: (data) => apiClient.post('/tasks', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }) => apiClient.put(/tasks/, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const remove = useMutation({
    mutationFn: (id) => apiClient.delete(/tasks/),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  return { query, create, update, remove };
}

export function useNotes() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['notes'], queryFn: () => apiClient.get('/notes') });

  const create = useMutation({
    mutationFn: (data) => apiClient.post('/notes', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }) => apiClient.put(/notes/, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });

  const remove = useMutation({
    mutationFn: (id) => apiClient.delete(/notes/),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });

  return { query, create, update, remove };
}

export function useLinks(params = {}) {
  const queryClient = useQueryClient();
  const query = useQuery({ 
    queryKey: ['links', params], 
    queryFn: () => apiClient.get('/links', { params }) 
  });

  const create = useMutation({
    mutationFn: (data) => apiClient.post('/links', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['links'] }),
  });

  const remove = useMutation({
    mutationFn: (id) => apiClient.delete(/links/),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['links'] }),
  });

  return { query, create, remove };
}


export function useCalendarEvents() {
  const query = useQuery({
    queryKey: ['calendarEvents'],
    queryFn: async () => {
      const [debts, subs, trips, tasks, contacts] = await Promise.all([
        apiClient.get('/debts'),
        apiClient.get('/subscriptions'),
        apiClient.get('/trips'),
        apiClient.get('/tasks'),
        apiClient.get('/people')
      ]);

      const events = [];

      // Add tasks
      (tasks?.data || []).forEach(t => {
        if (t.due_date) {
          events.push({
            id: `task-${t.id}`,
            type: 'task',
            title: t.title,
            date: t.due_date,
            status: t.status,
            originalId: t.id
          });
        }
      });

      // Add trips
      (trips?.data || []).forEach(t => {
        if (t.start_date) {
          events.push({
            id: `trip-${t.id}-start`,
            type: 'trip',
            title: `Trip: ${t.name}`,
            date: t.start_date,
            originalId: t.id
          });
        }
      });

      // Add subscriptions (these usually repeat, for now we just show next billing date if present)
      (subs?.data || []).forEach(s => {
        if (s.next_billing_date) {
          events.push({
            id: `sub-${s.id}`,
            type: 'subscription',
            title: s.name,
            date: s.next_billing_date,
            amount: s.amount,
            originalId: s.id
          });
        }
      });

      // Add debts due dates
      (debts?.data || []).forEach(d => {
        if (d.due_date) {
          events.push({
            id: `debt-${d.id}`,
            type: 'debt',
            title: d.name,
            date: d.due_date,
            amount: d.amount,
            originalId: d.id
          });
        }
      });

      // Add birthdays — project to the NEXT upcoming occurrence regardless of birth year
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      (contacts?.data || []).forEach(c => {
        if (c.birthday) {
          const bday = new Date(c.birthday);
          // Build this year's occurrence
          let nextBday = new Date(today.getFullYear(), bday.getUTCMonth(), bday.getUTCDate());
          // If it has already passed this year, push to next year
          if (nextBday < today) {
            nextBday = new Date(today.getFullYear() + 1, bday.getUTCMonth(), bday.getUTCDate());
          }
          const age = nextBday.getFullYear() - bday.getUTCFullYear();
          events.push({
            id: `birthday-${c.id}`,
            type: 'birthday',
            title: `🎂 ${c.name}'s Birthday (turns ${age})`,
            date: nextBday.toISOString().split('T')[0],
            originalId: c.id
          });
        }
      });

      // Sort chronological
      events.sort((a, b) => new Date(a.date) - new Date(b.date));
      return events;
    }
  });

  return { query };
}
