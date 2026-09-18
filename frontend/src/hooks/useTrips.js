import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient.js';

export function useTrips() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['trips'],
    queryFn: async () => {
      const res = await apiClient.get('/trips');
      return res.data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newTrip) => {
      const res = await apiClient.post('/trips', newTrip);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (tripId) => {
      const res = await apiClient.delete(`/trips/${tripId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    }
  });

  return {
    query,
    createMutation,
    deleteMutation
  };
}

export function useTrip(id) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['trips', id],
    queryFn: async () => {
      const res = await apiClient.get(`/trips/${id}`);
      return res.data;
    },
    enabled: !!id
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/trips/${id}/complete`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trips', id] });
    }
  });

  return { query, completeMutation };
}

export function useTripTransactions(tripId) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['trips', tripId, 'transactions'],
    queryFn: async () => {
      const res = await apiClient.get(`/trips/${tripId}/transactions`);
      return res.data;
    },
    enabled: !!tripId
  });

  const addMutation = useMutation({
    mutationFn: async (txData) => {
      const res = await apiClient.post(`/trips/${tripId}/transactions`, txData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'transactions'] });
      queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'settlement'] });
      // Invalidate personal transactions/accounts if dual-write occurred, we do it safely:
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (txId) => {
      const res = await apiClient.delete(`/trips/${tripId}/transactions/${txId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'transactions'] });
      queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'settlement'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  return { query, addMutation, deleteMutation };
}

export function useTripSettlement(tripId) {
  const query = useQuery({
    queryKey: ['trips', tripId, 'settlement'],
    queryFn: async () => {
      const res = await apiClient.get(`/trips/${tripId}/settlement`);
      return res.data;
    },
    enabled: !!tripId,
    refetchInterval: false
  });

  return { query };
}
