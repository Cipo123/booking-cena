/** Converte una stringa in uno slug URL-safe (es. "Cena da Marco" → "cena-da-marco") */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // rimuovi diacritici
    .replace(/[^a-z0-9\s-]/g, '')      // solo alfanumerici, spazi e trattini
    .trim()
    .replace(/\s+/g, '-')              // spazi → trattini
    .replace(/-+/g, '-')               // trattini multipli → uno solo
    .substring(0, 60);
}
