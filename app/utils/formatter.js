export const cleanText = (text) => text?.replace(/\s+/g, " ").trim() || "";

export const safeTime = (t) => {
  if (!t || t.trim() === "" || t.includes("TBD")) return "";
  if (/^\d{1,2}:\d{2}$/.test(t.trim())) return cleanText(t);
  return "";
};
