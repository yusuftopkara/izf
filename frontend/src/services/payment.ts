import { useState, useCallback } from 'react';
import { api } from './api';

export interface PaymentInitData {
  event_id: string;
  buyer_email: string;
  buyer_name: string;
  buyer_phone?: string;
  discount_code?: string;
  quantity?: number;
}

export interface PaymentInitResult {
  pending_id: string;
  payment_url: string;
}

export function usePayment() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initPayment = useCallback(async (data: PaymentInitData): Promise<PaymentInitResult | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.initIyzicoPayment(data);
      return result;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ödeme başlatılamadı');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { initPayment, isLoading, error };
}
