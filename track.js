(function (w) {
  function track(name) {
    if (!name || !/^[a-z0-9-]+$/i.test(name)) return;
    try {
      var url = new URL("e/" + name + ".html", w.location.href);
      url.searchParams.set("t", String(Date.now()));
      var img = new Image(1, 1);
      img.referrerPolicy = "no-referrer-when-downgrade";
      img.src = url.toString();
    } catch (_) {}
    try {
      var key = "sb_events";
      var prev = JSON.parse(w.localStorage.getItem(key) || "[]");
      if (!Array.isArray(prev)) prev = [];
      prev.push({ name: name, t: Date.now(), path: w.location.pathname });
      w.localStorage.setItem(key, JSON.stringify(prev.slice(-120)));
    } catch (_) {}
  }

  w.SB = w.SB || {};
  w.SB.track = track;
})(window);
