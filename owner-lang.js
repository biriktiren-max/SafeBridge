window.SB_OWNER = "0x68E0c1948900699E23a5490fcE4e376EDe21588D";

window.SB_isOwnerAccount = function (addr) {
  return String(addr || "").toLowerCase() === window.SB_OWNER.toLowerCase();
};

window.SB_visibleLangs = function (allLangs, addr) {
  const list = allLangs || [];
  if (window.SB_isOwnerAccount(addr)) return list;
  return list.filter(function (lang) { return lang.id !== "tr"; });
};

window.SB_safeLang = function (lang, addr) {
  if (lang === "tr" && !window.SB_isOwnerAccount(addr)) return "en";
  return lang || "en";
};

window.SB_readLang = function () {
  try {
    return localStorage.getItem("safebridge-lang") || localStorage.getItem("sb_lang") || "";
  } catch (e) {
    return "";
  }
};

window.SB_rememberLang = function (lang) {
  if (!lang || lang === "tr") return;
  try {
    localStorage.setItem("safebridge-lang", lang);
    localStorage.setItem("sb_lang", lang);
  } catch (e) {}
};

window.SB_detectLang = function (saved) {
  const value = String(saved || "").trim();
  if (value && value !== "tr") return value;
  const list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"];
  const known = { en: "en", ru: "ru", zh: "zh", es: "es", ja: "ja", ko: "ko", ar: "ar" };
  for (let i = 0; i < list.length; i++) {
    const base = String(list[i] || "").toLowerCase().split("-")[0];
    if (known[base]) return known[base];
  }
  return "en";
};
