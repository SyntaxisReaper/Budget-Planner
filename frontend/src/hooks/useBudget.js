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
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
    }
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }) => apiClient.put(`/debts/${id}`, data),
    onSuccess: () => {
      triggerHaptic();
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
    }
  });

  const remove = useMutation({
    mutationFn: (id) => apiClient.delete(`/debts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
    },
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
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
    }
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }) => apiClient.put(`/subscriptions/${id}`, data),
    onSuccess: () => {
      triggerHaptic();
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
    }
  });

  const remove = useMutation({
    mutationFn: (id) => apiClient.delete(`/subscriptions/${id}`),
    onSuccess: () => {
      triggerHaptic();
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contacts'] }); queryClient.invalidateQueries({ queryKey: ['calendarEvents'] }); },
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }) => apiClient.put(`/people/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contacts'] }); queryClient.invalidateQueries({ queryKey: ['calendarEvents'] }); },
  });

  const remove = useMutation({
    mutationFn: (id) => apiClient.delete(`/people/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contacts'] }); queryClient.invalidateQueries({ queryKey: ['calendarEvents'] }); },
  });

  return { query, create, update, remove };
}

export function useTasks() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['tasks'], queryFn: () => apiClient.get('/tasks') });

  const create = useMutation({
    mutationFn: (data) => apiClient.post('/tasks', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); queryClient.invalidateQueries({ queryKey: ['calendarEvents'] }); },
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }) => apiClient.put(`/tasks/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); queryClient.invalidateQueries({ queryKey: ['calendarEvents'] }); },
  });

  const remove = useMutation({
    mutationFn: (id) => apiClient.delete(`/tasks/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); queryClient.invalidateQueries({ queryKey: ['calendarEvents'] }); },
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
    mutationFn: ({ id, ...data }) => apiClient.put(`/notes/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });

  const remove = useMutation({
    mutationFn: (id) => apiClient.delete(`/notes/${id}`),
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
    mutationFn: (id) => apiClient.delete(`/links/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['links'] }),
  });

  return { query, create, remove };
}



export function useCalendarEvents() {
  const query = useQuery({
    queryKey: ['calendarEvents'],
    queryFn: async () => {
      const results = await Promise.allSettled([
        apiClient.get('/debts'),
        apiClient.get('/subscriptions'),
        apiClient.get('/trips'),
        apiClient.get('/tasks'),
        apiClient.get('/people')
      ]);

      const [debtsRes, subsRes, tripsRes, tasksRes, contactsRes] = results;

      const events = [];

      // Add tasks
      if (tasksRes.status === 'fulfilled') {
        (tasksRes.value?.data || []).forEach(t => {
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
      }

      // Add trips
      if (tripsRes.status === 'fulfilled') {
        (tripsRes.value?.data || []).forEach(t => {
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
      }

      // Add subscriptions (using next_date)
      if (subsRes.status === 'fulfilled') {
        (subsRes.value?.data || []).forEach(s => {
          if (s.next_date) {
            events.push({
              id: `sub-${s.id}`,
              type: 'subscription',
              title: s.name,
              date: s.next_date,
              amount: s.amount,
              originalId: s.id
            });
          }
        });
      }

      // Add debts (using debt_date and remaining_balance)
      if (debtsRes.status === 'fulfilled') {
        (debtsRes.value?.data || []).forEach(d => {
          if (d.debt_date) {
            events.push({
              id: `debt-${d.id}`,
              type: 'debt',
              title: d.name,
              date: d.debt_date,
              amount: d.remaining_balance || d.principal,
              originalId: d.id
            });
          }
        });
      }

      // Add birthdays
      if (contactsRes.status === 'fulfilled') {
        const today = new Date();
        const currentYear = today.getFullYear();
        
        (contactsRes.value?.data || []).forEach(c => {
          if (c.birthday) {
            // Fix birthday math: construct local date string directly
            const [y, m, d] = c.birthday.split('T')[0].split('-');
            const bdayMonth = parseInt(m, 10);
            const bdayDate = parseInt(d, 10);
            
            // Generate date string for this year
            let projectedYear = currentYear;
            const thisYearDate = new Date(currentYear, bdayMonth - 1, bdayDate);
            
            // If birthday has passed this year, project to next year
            if (thisYearDate < today && !(thisYearDate.getMonth() === today.getMonth() && thisYearDate.getDate() === today.getDate())) {
               projectedYear = currentYear + 1;
            }
            
            // Pad month and day
            const paddedMonth = String(bdayMonth).padStart(2, '0');
            const paddedDay = String(bdayDate).padStart(2, '0');
            const projectedDateStr = `${projectedYear}-${paddedMonth}-${paddedDay}`;

            events.push({
              id: `bday-${c.id}`,
              type: 'birthday',
              title: `Birthday: ${c.name}`,
              date: projectedDateStr,
              originalId: c.id
            });
          }
        });
      }

      // Sort chronological
      events.sort((a, b) => new Date(a.date) - new Date(b.date));
      return events;
    }
  });

  return { query };
}

export function useProjects() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['projects'], queryFn: () => apiClient.get('/projects') });

  const create = useMutation({
    mutationFn: (data) => apiClient.post('/projects', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }) => apiClient.put(`/projects/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const remove = useMutation({
    mutationFn: (id) => apiClient.delete(`/projects/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  return { query, create, update, remove };
}

export function useTaskComments(taskId) {
  const queryClient = useQueryClient();
  const query = useQuery({ 
    queryKey: ['task_comments', taskId], 
    queryFn: () => apiClient.get(`/task_comments/${taskId}`),
    enabled: !!taskId
  });

  const create = useMutation({
    mutationFn: ({ taskId, text }) => apiClient.post(`/task_comments/${taskId}`, { text }),
    onSuccess: (_, variables) => queryClient.invalidateQueries({ queryKey: ['task_comments', variables.taskId] }),
  });

  const remove = useMutation({
    mutationFn: (id) => apiClient.delete(`/task_comments/${id}`),
    onSuccess: () => {
      // Need to invalidate everything for task_comments if we don't know the taskId
      queryClient.invalidateQueries({ queryKey: ['task_comments'] });
    },
  });

  return { query, create, remove };
}
