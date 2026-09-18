import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient.js';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const triggerHaptic = () => {
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
};

export function useAccounts() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['accounts'], queryFn: () => apiClient.get('/accounts') });

  const create = useMutation({
    mutationFn: (data) => apiClient.post('/accounts', data),
    onSuccess: () => {
      triggerHaptic();
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
