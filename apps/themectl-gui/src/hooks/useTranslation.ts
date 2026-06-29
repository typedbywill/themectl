import { useThemeUIStore } from "../stores/themeStore";
import { translations } from "../i18n/translations";

export const useTranslation = () => {
  const language = useThemeUIStore((state) => state.language) || "en";
  const setLanguage = useThemeUIStore((state) => state.setLanguage);

  const t = (key: string, replacements?: Record<string, string | number>) => {
    const keys = key.split(".");
    let current: any = translations[language];
    
    for (const k of keys) {
      if (current && current[k] !== undefined) {
        current = current[k];
      } else {
        // Fallback to English if translation is missing in current language
        let fallback: any = translations["en"];
        for (const fk of keys) {
          if (fallback && fallback[fk] !== undefined) {
            fallback = fallback[fk];
          } else {
            return key; // return key if not found in fallback either
          }
        }
        current = fallback;
        break;
      }
    }

    if (typeof current === "string" && replacements) {
      let result = current;
      for (const [placeholder, val] of Object.entries(replacements)) {
        result = result.replace(`{${placeholder}}`, String(val));
      }
      return result;
    }

    return typeof current === "string" ? current : key;
  };

  return { t, language, setLanguage };
};
