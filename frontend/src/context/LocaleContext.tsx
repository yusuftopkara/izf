import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tr from '../../locales/tr';
import en from '../../locales/en';

export type Locale = 'tr' | 'en';

const translations = { tr, en };

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('tr');

  useEffect(() => {
    AsyncStorage.getItem('izf-locale').then((saved) => {
      if (saved === 'tr' || saved === 'en') {
        setLocaleState(saved);
      }
    });
  }, []);

  const setLocale = async (newLocale: Locale) => {
    setLocaleState(newLocale);
    await AsyncStorage.setItem('izf-locale', newLocale);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translations[locale];
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) return key;
    }
    if (typeof value !== 'string') return key;
    if (params) {
      return value.replace(/\{(\w+)\}/g, (_, paramKey) => String(params[paramKey] ?? `{${paramKey}}`));
    }
    return value;
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used within LocaleProvider');
  return context;
}
