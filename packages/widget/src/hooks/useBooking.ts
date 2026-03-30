import { useState, useCallback } from 'react';
import type { Service, Employee } from '@bookify/shared';

export interface CustomerData {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

export interface BookingState {
  step: number;
  selectedService: Service | null;
  selectedEmployee: Employee | null;
  noEmployeePreference: boolean;
  selectedDate: string | null;
  selectedTime: string | null;
  selectedEmployeeId: string | null; // resolved employee from slot
  customerData: CustomerData;
}

const initialCustomerData: CustomerData = {
  name: '',
  email: '',
  phone: '',
  notes: '',
};

export function useBooking() {
  const [state, setState] = useState<BookingState>({
    step: 1,
    selectedService: null,
    selectedEmployee: null,
    noEmployeePreference: false,
    selectedDate: null,
    selectedTime: null,
    selectedEmployeeId: null,
    customerData: { ...initialCustomerData },
  });

  const setStep = useCallback((step: number) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const goBack = useCallback(() => {
    setState((prev) => ({ ...prev, step: Math.max(1, prev.step - 1) }));
  }, []);

  const selectService = useCallback((service: Service) => {
    setState((prev) => ({
      ...prev,
      selectedService: service,
      selectedEmployee: null,
      noEmployeePreference: false,
      selectedDate: null,
      selectedTime: null,
      selectedEmployeeId: null,
      step: 2,
    }));
  }, []);

  const selectEmployee = useCallback((employee: Employee | null) => {
    setState((prev) => ({
      ...prev,
      selectedEmployee: employee,
      noEmployeePreference: employee === null,
      selectedDate: null,
      selectedTime: null,
      selectedEmployeeId: null,
      step: 3,
    }));
  }, []);

  const skipEmployeeStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedEmployee: null,
      noEmployeePreference: false,
      step: 3,
    }));
  }, []);

  const selectDateTime = useCallback(
    (date: string, time: string, employeeId?: string) => {
      setState((prev) => ({
        ...prev,
        selectedDate: date,
        selectedTime: time,
        selectedEmployeeId: employeeId || prev.selectedEmployee?.id || null,
        step: 4,
      }));
    },
    []
  );

  const setCustomerData = useCallback((data: CustomerData) => {
    setState((prev) => ({
      ...prev,
      customerData: data,
      step: 5,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      step: 1,
      selectedService: null,
      selectedEmployee: null,
      noEmployeePreference: false,
      selectedDate: null,
      selectedTime: null,
      selectedEmployeeId: null,
      customerData: { ...initialCustomerData },
    });
  }, []);

  return {
    ...state,
    setStep,
    goBack,
    selectService,
    selectEmployee,
    skipEmployeeStep,
    selectDateTime,
    setCustomerData,
    reset,
  };
}
