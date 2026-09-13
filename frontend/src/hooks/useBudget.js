import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient.js';

export function useBudget(month) {
  const queryClient = useQueryClient();
  const monthKey = month || new Date().toISOString().substring(0, 7);

  const budgetQuery = useQuery({
    queryKey: ['budget', monthKey],
    queryFn: () => apiClient.get(`/budget/${monthKey}`).catch(() => null),
    retry: false,
  });

  const allocateMutation = useMutation({
    mutationFn: ({ month: m, leftover_preference }) =>
      apiClient.post('/budget/allocate', { month: m || monthKey, leftover_preference }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget'] });
    },
  });

  return { budgetQuery, allocateMutation };
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['debts'] }),
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }) => apiClient.put(`/debts/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['debts'] }),
  });

  const remove = useMutation({
    mutationFn: (id) => apiClient.delete(`/debts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['debts'] }),
  });

  const logPayment = useMutation({
    mutationFn: ({ id, ...data }) => apiClient.post(`/debts/${id}/payments`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['debts'] }),
  });

  return { query, create, update, remove, logPayment };
}

export function useGoals() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['goals'], queryFn: () => apiClient.get('/goals') });

  const create = useMutation({
    mutationFn: (data) => apiClient.post('/goals', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }) => apiClient.put(`/goals/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });

  const remove = useMutation({
    mutationFn: (id) => apiClient.delete(`/goals/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });

  return { query, create, update, remove };
}

export function useTransactions(month) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['transactions', month],
    queryFn: () => apiClient.get(`/transactions${month ? `?month=${month}` : ''}`),
  });

  const create = useMutation({
    mutationFn: (data) => apiClient.post('/transactions', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });

  return { query, create };
}

export function useAnalytics(month) {
  const monthKey = month || new Date().toISOString().substring(0, 7);
  const summary = useQuery({
    queryKey: ['analytics', monthKey],
    queryFn: () => apiClient.get(`/analytics/summary?month=${monthKey}`),
  });
  const debtProjection = useQuery({
    queryKey: ['analytics', 'debt-projection'],
    queryFn: () => apiClient.get('/analytics/debt-projection'),
  });
  return { summary, debtProjection };
}
