import es from "../i18n/es.json";
import en from "../i18n/en.json";

const translations = { es, en };

export function getInitialLang() {
  if (typeof window === "undefined") return "es";
  const pathSeg = window.location.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  if (pathSeg === "en" || pathSeg === "es") return pathSeg;
  const queryLang = new URLSearchParams(window.location.search).get("lang")?.toLowerCase();
  if (queryLang === "en" || queryLang === "es") return queryLang;
  return localStorage.getItem("baidata_erp_lang") || "es";
}

export function useTranslation(lang = "es") {
  const currentLang = translations[lang] || translations.es;

  const t = (key) => {
    const keys = key.split(".");
    let result = currentLang;
    for (const k of keys) {
      if (result?.[k] === undefined) return key;
      result = result[k];
    }
    return result;
  };

  return { t };
}