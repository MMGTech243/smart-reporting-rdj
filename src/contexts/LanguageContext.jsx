import { createContext, useContext, useState } from 'react';
import fr from '../i18n/fr';
import en from '../i18n/en';

const DICTS = { fr, en };

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() =>
    localStorage.getItem('rdj_lang') ?? 'fr'
  );

  const setLang = (l) => {
    localStorage.setItem('rdj_lang', l);
    setLangState(l);
  };

  const t = (key) => DICTS[lang]?.[key] ?? DICTS.fr[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
