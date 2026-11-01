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
