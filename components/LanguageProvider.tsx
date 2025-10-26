import React, { createContext, useState, useContext, ReactNode } from 'react';
import { translations, TranslationKey } from '../translations';

type Language = 'en' | 'ta';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, vars?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: TranslationKey, vars?: { [key: string]: string | number }): string => {
    let text = (translations[language] && translations[language][key]) || translations['en'][key];
    if (vars) {
        Object.keys(vars).forEach(varKey => {
            const regex = new RegExp(`{${varKey}}`, 'g');
            text = text.replace(regex, String(vars[varKey]));
        });
    }
    return text || key;
  };
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};