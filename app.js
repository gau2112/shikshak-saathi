/* शिक्षक साथी · phone app (no backend). Progress is kept on this phone (localStorage). */
(function () {
  "use strict";
  var app = document.getElementById("app");
  var BOOK = null, CH = {};
  /* which class: 6 (data/, progress "ss6.v1", unchanged since v1) or 7 (data/c7/, progress "ss7.v1") */
  var qc = (location.search.match(/[?&]c=(6|7)\b/) || [])[1], CLS = 6;
  try { if (qc) localStorage.setItem("ss.cls", qc); CLS = +localStorage.getItem("ss.cls") === 7 ? 7 : 6; } catch (e) {}
  if (qc) CLS = +qc;
  var KEY = CLS === 7 ? "ss7.v1" : "ss6.v1", DATA = CLS === 7 ? "data/c7/" : "data/";
  var st = load();
  if (!st.name) { try { var o = JSON.parse(localStorage.getItem(CLS === 7 ? "ss6.v1" : "ss7.v1")) || {}; if (o.name) st.name = o.name; } catch (e) {} }
  function setClass(k) { try { localStorage.setItem("ss.cls", String(k)); } catch (e) {} location.hash = "#/"; location.reload(); }
  function lab(c) { return c.label != null ? c.label : c.no; }

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  st.done = st.done || {}; st.xp = st.xp || 0; st.best = st.best || {};
  function addXP(n, key) { if (key && st.done[key]) return; if (key) st.done[key] = 1; st.xp += n; save(); }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function nl(s) { return esc(s).replace(/\n/g, "<br>"); }
  function $(sel, root) { return (root || app).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || app).querySelectorAll(sel)); }
  function go(h) { location.hash = h; }

  /* ---------------- read aloud (Hindi voice on the phone) ---------------- */
  var voice = null, speaking = false;
  function pickVoice() {
    if (!("speechSynthesis" in window)) return;
    var vs = speechSynthesis.getVoices();
    voice = vs.filter(function (v) { return /^hi/i.test(v.lang); })[0] || null;
  }
  if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function stopSpeak() { if ("speechSynthesis" in window) speechSynthesis.cancel(); speaking = false; var b = $(".say"); if (b) b.classList.remove("on"); }
  function speak(text) {
    if (!("speechSynthesis" in window)) { alert("इस फ़ोन में सुनाने की सुविधा नहीं है।"); return; }
    if (speaking) { stopSpeak(); return; }
    var clean = String(text).replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, " ").replace(/[‘’“”]/g, "");
    var u = new SpeechSynthesisUtterance(clean);
    u.lang = "hi-IN"; if (voice) u.voice = voice; u.rate = 0.9;
    u.onend = u.onerror = function () { speaking = false; var b = $(".say"); if (b) b.classList.remove("on"); };
    speaking = true; var b = $(".say"); if (b) b.classList.add("on");
    speechSynthesis.speak(u);
    if (!voice && !st.voiceTold) { st.voiceTold = 1; save(); toast("हिंदी आवाज़ न आए तो: फ़ोन की Settings → Text-to-speech → Google → हिंदी डाउनलोड करें"); }
  }
  function toast(t) {
    var d = document.createElement("div");
    d.style.cssText = "position:fixed;left:12px;right:12px;bottom:96px;z-index:9;background:#1b2a3a;color:#fff;padding:12px 14px;border-radius:14px;font-size:16px;max-width:496px;margin:0 auto";
    d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 5200);
  }

  /* ---------------- data ---------------- */
  function getJSON(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }
  function book() { return BOOK ? Promise.resolve(BOOK) : getJSON(DATA + "book.json").then(function (b) { BOOK = b; return b; }); }
  function chapter(n) { return CH[n] ? Promise.resolve(CH[n]) : getJSON(DATA + "ch" + (n < 10 ? "0" : "") + n + ".json").then(function (c) { CH[n] = c; return c; }); }
  function doneCount(n) { var d = 0; Object.keys(st.done).forEach(function (k) { if (k.indexOf(n + ":c") === 0) d++; }); return d; }
  function chProgress(c) { var d = 0; c.concepts.forEach(function (k) { if (st.done[c.no + ":" + k.id]) d++; }); return d; }

  /* ---------------- shell pieces ---------------- */
  function top(title, back) {
    return '<div class="top">' + (back ? '<button class="back" aria-label="पीछे" data-go="' + back + '">←</button>' : "") +
      "<h1>" + esc(title) + '</h1><span class="xp">⭐ ' + st.xp + "</span></div>";
  }
  function tabs(n, on) {
    var t = [["learn", "📖", "सीखें"], ["class", "🧑‍🏫", "कक्षा में"], ["play", "🎮", "खेलें"], ["practice", "📝", "अभ्यास"]];
    return '<nav class="tabs"><div class="in">' + t.map(function (x) {
      return '<button class="' + (x[0] === on ? "on" : "") + '" data-go="#/ch/' + n + "/" + x[0] + '"><b>' + x[1] + "</b>" + x[2] + "</button>";
    }).join("") + "</div></nav>";
  }
  app.addEventListener("click", function (e) {
    var g = e.target.closest("[data-go]"); if (g) { stopSpeak(); go(g.getAttribute("data-go")); }
  });

  /* ---------------- home ---------------- */
  function home() {
    book().then(function (b) {
      var hi = st.name ? "नमस्ते " + esc(st.name) + " जी! आज एक नई बात समझते हैं।" :
        'आपका नाम?<div class="namebox"><input id="nm" placeholder="जैसे: सुनीता" maxlength="30"><button id="nmok">ठीक</button></div>';
      var html = top("शिक्षक साथी") +
        '<div class="clspick">' + [6, 7].map(function (k) { return '<button data-cls="' + k + '" class="' + (k === CLS ? "on" : "") + '">कक्षा ' + k + "</button>"; }).join("") + "</div>" +
        '<div class="hero"><h2>कक्षा ' + CLS + ' · सामाजिक विज्ञान</h2><p>' + esc(b.title) + '</p><div class="hi">' + hi + "</div></div>" +
        '';
      (function () {
        var lastPart = null;
        b.chapters.forEach(function (c) {
          if (c.part && c.part !== lastPart) { lastPart = c.part; html += '<div class="sec-h">' + esc(c.part) + "</div>"; }
          if (c.live) {
            var d = doneCount(c.no), tot = c.concepts || 1;
            html += '<button class="chap" data-go="#/ch/' + c.no + '/learn"><div class="no">' + esc(lab(c)) + '</div><div style="flex:1"><div class="t">' + esc(c.title) +
              '</div><div class="s">' + esc(c.oneLine) + '</div><div class="bar"><i style="width:' + Math.round(100 * d / tot) + '%"></i></div></div></button>';
          } else {
            html += '<div class="chap off"><div class="no">' + esc(lab(c)) + '</div><div><div class="t">' + esc(c.title) + '</div><div class="s">जल्द आ रहा है</div></div></div>';
          }
        });
        html += '<div class="tip">📲 <b>ऐप की तरह रखिए:</b> Chrome में ऊपर ⋮ दबाइए → <b>“होम स्क्रीन में जोड़ें”</b>। एक बार खोलने के बाद यह बिना इंटरनेट भी चलेगा।</div>' +
          '<div class="tip">🔊 हर पन्ने पर नीचे 🔊 बटन है। दबाइए, फ़ोन पढ़कर सुनाएगा।</div>';
        app.innerHTML = html;
        $$("[data-cls]").forEach(function (x) { x.onclick = function () { var k = +x.getAttribute("data-cls"); if (k !== CLS) setClass(k); }; });
        var ok = $("#nmok");
        if (ok) ok.onclick = function () { var v = $("#nm").value.trim(); if (v) { st.name = v; save(); home(); } };
      })();
    });
  }

  /* ---------------- chapter: learn path ---------------- */
  function learn(n) {
    chapter(n).then(function (c) {
      var d = chProgress(c);
      var html = top("पाठ " + lab(c) + ": " + c.title, "#/") +
        '<div class="chead"><div class="one">' + esc(c.oneLine) + '</div><div class="small" style="margin-top:6px">✅ ' + d + " / " + c.concepts.length + " बातें समझ लीं</div></div>" +
        (c.map ? '<div class="mapcard"><div class="h">🗺️ पूरा पाठ एक नज़र में</div><div class="small">किसी डिब्बे को दबाइए, वही बात खुलेगी</div><div class="flbox">' +
          flowSVG(c.map, n, true) + '</div><a class="btn soft" href="#/ch/' + n + '/map">🔍 बड़ा करके देखिए</a></div>' : "") +
        '<div class="path">' +
        stone("#/ch/" + n + "/intro", "🎯", "यह पाठ क्यों?", "1 मिनट: पाठ एक नज़र में", st.done[n + ":intro"]) +
        stone("#/ch/" + n + "/story", "📖", c.story.title, "शुरुआत की कहानी", st.done[n + ":story"]);
      c.concepts.forEach(function (k, i) {
        html += stone("#/ch/" + n + "/c/" + k.id, k.emoji, (i + 1) + ". " + k.name, k.widget ? "खुद करके देखिए वाली गतिविधि के साथ" : "2-3 मिनट", st.done[n + ":" + k.id]);
      });
      html += stone("#/ch/" + n + "/quiz", "🏆", "अंतिम परीक्षा", c.finalQuiz.length + " सवाल, फिर बैज " + (c.badge.emoji || ""), st.best[n] != null, "big") +
        '</div><div class="pad"><div class="box gold"><div class="h">🧠 तीन बातें याद रखिए</div>' + c.remember.map(function (r, i) { return "<p>" + (i + 1) + ". " + esc(r) + "</p>"; }).join("") + "</div></div>";
      app.innerHTML = html + tabs(n, "learn");
    });
  }
  function pcard(k) {
    return '<div class="pcard"><div class="pe">' + k.emoji + '</div><div class="pk">' + (k.keys || []).map(function (w) { return "<span>" + esc(w) + "</span>"; }).join("") + "</div></div>";
  }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  /* data-driven activities from the chapter file: "sort" (right basket) and "order" (tap in order) */
  function dataWidget(w) {
    if (w.type === "sort") return {
      say: w.title + "। हर बात को सही टोकरी में डालिए।",
      html: "<h2>🧺 " + esc(w.title) + '</h2><div class="wg"><div class="small" style="text-align:center">यह बात किस टोकरी में जाएगी?</div><div class="sortcard" id="it"></div>' +
        '<div class="baskets">' + w.baskets.map(function (b, i) { return '<button data-b="' + i + '">' + esc(b) + "</button>"; }).join("") +
        '</div><div class="fb" id="fb"></div><div class="small" id="cnt" style="text-align:center"></div></div>',
      init: function (el, unlock) {
        var items = shuffle(w.items), i = 0, sc = 0, busy = false;
        function show() {
          el.querySelector("#it").textContent = items[i].t; el.querySelector("#cnt").textContent = (i + 1) + " / " + items.length; el.querySelector("#fb").textContent = "";
          $$(".baskets button", el).forEach(function (b) { b.className = ""; }); busy = false;
        }
        $$(".baskets button", el).forEach(function (b) {
          b.onclick = function () {
            if (busy) return; busy = true;
            var ok = +b.getAttribute("data-b") === items[i].b; if (ok) sc++;
            b.className = ok ? "right" : "wrong";
            if (!ok) el.querySelector('.baskets button[data-b="' + items[i].b + '"]').className = "right";
            el.querySelector("#fb").textContent = ok ? "✅ सही टोकरी!" : "❌ यह " + w.baskets[items[i].b] + " में जाएगी";
            setTimeout(function () {
              i++;
              if (i < items.length) show();
              else { el.querySelector("#it").textContent = "🎉 " + items.length + " में से " + sc + " सही!"; el.querySelector("#cnt").textContent = ""; unlock(); }
            }, 1100);
          };
        });
        show();
      }
    };
    if (w.type === "order") return {
      say: w.title + "। " + w.hint,
      html: "<h2>🔢 " + esc(w.title) + '</h2><div class="wg"><p class="small">' + esc(w.hint) + '</p><div class="placed" id="pl"></div><div class="pool" id="po"></div><div class="fb" id="fb"></div></div>',
      init: function (el, unlock) {
        var next = 0, miss = 0;
        el.querySelector("#po").innerHTML = shuffle(w.items).map(function (t) { return '<button data-t="' + esc(t) + '">' + esc(t) + "</button>"; }).join("");
        $$("#po button", el).forEach(function (b) {
          b.onclick = function () {
            if (b.getAttribute("data-t") === w.items[next]) {
              next++; b.classList.add("used");
              el.querySelector("#pl").insertAdjacentHTML("beforeend", "<div><b>" + next + ".</b> " + esc(w.items[next - 1]) + "</div>");
              el.querySelector("#fb").textContent = "✅";
              if (next === w.items.length) { el.querySelector("#fb").textContent = miss ? "🎉 पूरा! (" + miss + " बार चूके)" : "🎉 एक बार में बिल्कुल सही!"; unlock(); }
            } else {
              miss++; b.classList.add("shake"); el.querySelector("#fb").textContent = "❌ अभी यह नहीं। पहले कौन आएगा?";
              setTimeout(function () { b.classList.toggle("shake", false); }, 450);
            }
          };
        });
      }
    };
    return null;
  }

  function stone(href, em, t, s, done, cls) {
    return '<button class="stone ' + (done ? "done " : "") + (cls || "") + '" data-go="' + href + '"><span class="em">' + em + '</span><span><div class="t">' + esc(t) +
      '</div><div class="s">' + esc(s) + '</div></span><span class="ck">' + (done ? "✅" : "›") + "</span></button>";
  }

  /* ---------------- generic step player ---------------- */
  // screens: [{html, say, gate:bool, onShow(el, unlock)}]
  function player(title, back, screens, onEnd) {
    var i = Math.min(+(new URLSearchParams(location.search).get("step") || 0), screens.length - 1); // ?step=N for testing
    function draw() {
      stopSpeak();
      var s = screens[i];
      app.innerHTML = top(title, back) + '<div class="player"><div class="prog"><i style="width:' + Math.round(100 * (i + 1) / screens.length) + '%"></i></div>' +
        '<div class="screen">' + s.html + "</div></div>" +
        '<div class="nav"><div class="in"><button class="prev" aria-label="पीछे"' + (i ? "" : " disabled") + '>◀</button><button class="say" aria-label="सुनिए">🔊</button>' +
        '<button class="next">' + (i === screens.length - 1 ? "पूरा ✓" : "आगे ▶") + "</button></div></div>";
      var next = $(".next");
      if (s.gate) next.disabled = true;
      $(".prev").onclick = function () { if (i) { i--; draw(); } };
      $(".say").onclick = function () { speak(s.say || $(".screen").innerText); };
      next.onclick = function () { if (i < screens.length - 1) { i++; draw(); window.scrollTo(0, 0); } else { stopSpeak(); onEnd(); } };
      if (s.onShow) s.onShow($(".screen"), function () { next.disabled = false; });
      bindReveal($(".screen"));
    }
    var sx = null;
    app.ontouchstart = function (e) { sx = e.touches[0].clientX; };
    app.ontouchend = function (e) {
      if (sx == null || !$(".player")) return; var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (e.target.closest("input,.rose,.grid")) return;
      if (dx < -70 && !$(".next").disabled) $(".next").click(); else if (dx > 70) $(".prev").click();
    };
    draw();
  }
  function bindReveal(root) {
    $$("[data-reveal]", root).forEach(function (b) {
      b.onclick = function () { var t = root.querySelector("#" + b.getAttribute("data-reveal")); if (t) { t.hidden = false; b.remove(); } };
    });
  }
  function quizScreen(q, kicker, onAnswer) {
    var html = '<div class="kicker">' + kicker + "</div><h2>" + esc(q.q) + '</h2><div class="opts">' +
      q.options.map(function (o, j) { return '<button class="opt" data-j="' + j + '">' + esc(o) + "</button>"; }).join("") + '</div><div id="why"></div>';
    return {
      html: html, gate: true, say: q.q + "। " + q.options.join("। "),
      onShow: function (el, unlock) {
        $$(".opt", el).forEach(function (b) {
          b.onclick = function () {
            var j = +b.getAttribute("data-j"), right = j === q.answer;
            $$(".opt", el).forEach(function (x) { x.disabled = true; if (+x.getAttribute("data-j") === q.answer) x.classList.add("right"); });
            if (!right) b.classList.add("wrong");
            el.querySelector("#why").innerHTML = '<div class="box ' + (right ? "ok" : "bad") + '"><div class="h">' + (right ? "✅ सही!" : "❌ यह नहीं। सही उत्तर हरे रंग में है।") + "</div>" + nl(q.why) + "</div>";
            if (onAnswer) onAnswer(right);
            unlock();
          };
        });
      }
    };
  }

  /* ---------------- intro + story ---------------- */
  function intro(n) {
    chapter(n).then(function (c) {
      player("यह पाठ क्यों?", "#/ch/" + n + "/learn", [
        { html: '<div class="kicker">' + esc(c.book ? c.book + " · " : "") + 'पाठ ' + esc(lab(c)) + '</div><div class="big-em">🎯</div><h2>' + esc(c.title) + '</h2><p class="lead">' + esc(c.oneLine) + "</p>" },
        { html: '<div class="kicker">रोज़ की ज़िंदगी से</div><h2>यह पाठ क्यों पढ़ें?</h2><p class="lead">' + nl(c.why) + "</p>" },
        { html: '<div class="kicker">इस पाठ के बाद बच्चे…</div><h2>सीखने के लक्ष्य</h2>' + c.goals.map(function (g) { return '<div class="box">✔️ ' + esc(g) + "</div>"; }).join("") }
      ], function () { addXP(5, n + ":intro"); go("#/ch/" + n + "/learn"); });
    });
  }
  function story(n) {
    chapter(n).then(function (c) {
      var sc = c.story.paras.map(function (p, i) {
        return { html: (i ? "" : '<div class="kicker">कहानी</div><h2>' + esc(c.story.title) + "</h2>") + '<p class="lead">' + nl(p) + "</p>" };
      });
      player("कहानी", "#/ch/" + n + "/learn", sc, function () { addXP(5, n + ":story"); go("#/ch/" + n + "/learn"); });
    });
  }

  /* ---------------- one concept, step by step ---------------- */
  function concept(n, id) {
    chapter(n).then(function (c) {
      var idx = c.concepts.findIndex(function (k) { return k.id === id; }), k = c.concepts[idx];
      if (!k) return go("#/ch/" + n + "/learn");
      var sc = [];
      sc.push({ html: '<div class="kicker">बात ' + (idx + 1) + " / " + c.concepts.length + "</div><h2>" + k.emoji + " " + esc(k.name) + "</h2>" +
        (k.art ? '<div class="art">' + k.art + "</div>" : pcard(k)) + '<p class="lead">' + nl(k.simple) + "</p>", say: k.name + "। " + k.simple });
      (k.flows || []).forEach(function (it) { sc.push(flowScreen(it, n)); });
      var W = typeof k.widget === "string" ? WIDGETS[k.widget] : k.widget ? dataWidget(k.widget) : null;
      if (W) sc.push({ html: '<div class="kicker">खुद करके देखिए</div>' + W.html, say: W.say, onShow: W.init });
      if (k.like) sc.push({ html: '<div class="kicker">ऐसे समझिए</div><div class="box blue"><div class="h">🤝 जैसे…</div>' + nl(k.like) + "</div>" +
        (k.careful ? '<div class="box gold"><div class="h">⚠️ पर ध्यान दें</div>' + nl(k.careful) + "</div>" : "") +
        (k.life ? '<div class="box"><div class="h">🏡 रोज़ की ज़िंदगी से</div>' + nl(k.life) + "</div>" : ""), say: [k.like, k.careful, k.life].join("। ") });
      sc.push({ html: '<div class="kicker">थोड़ा और गहराई से</div><h2>आप पक्का समझ लीजिए</h2><p>' + nl(k.detail) + "</p>" +
        (k.book ? '<button class="reveal" data-reveal="bk">📗 किताब क्या कहती है? (दबाइए)</button><div id="bk" hidden class="box">' + nl(k.book) + "</div>" : ""), say: k.detail });
      if (k.myth && k.myth.galat) sc.push({ html: '<div class="kicker">आम गलतफ़हमी</div><div class="box bad"><div class="h">❌ बहुत लोग सोचते हैं</div>' + nl(k.myth.galat) + "</div>" +
        '<button class="reveal" data-reveal="mt">✅ असल में सही क्या है? (दबाइए)</button><div id="mt" hidden class="box ok"><div class="h">✅ सही बात</div>' + nl(k.myth.sahi) + "</div>",
        say: "बहुत लोग सोचते हैं: " + k.myth.galat + "। पर सही बात: " + k.myth.sahi });
      if (k.kidsAsk && k.kidsAsk.length) sc.push({ html: '<div class="kicker">बच्चे पूछें तो</div><h2>ऐसे जवाब दीजिए</h2>' + k.kidsAsk.map(function (x, j) {
        return '<div class="qa"><div class="box"><div class="q">🙋 ' + esc(x.q) + '</div></div><button class="reveal" data-reveal="ka' + j + '">जवाब देखिए</button><div id="ka' + j + '" hidden class="box ok">' + nl(x.a) + "</div></div>";
      }).join(""), say: k.kidsAsk.map(function (x) { return x.q + " " + x.a; }).join("। ") });
      if (k.trick) sc.push({ html: '<div class="kicker">याद रखने की ट्रिक</div><div class="big-em">💡</div><p class="lead"><b>' + nl(k.trick) + "</b></p>", say: k.trick });
      if (k.quiz && k.quiz.q) sc.push(quizScreen(k.quiz, "छोटी परीक्षा"));
      var nextK = c.concepts[idx + 1];
      sc.push({ html: '<div class="badge"><div class="em">🌟</div><h2>शाबाश! यह बात पक्की हुई</h2><p class="lead">+10 ⭐</p></div>' +
        '<a class="btn soft" href="#/ch/' + n + "/class/" + k.id + '">🧑‍🏫 कक्षा में यह कैसे पढ़ाएँ</a>' +
        (nextK ? '<a class="btn" href="#/ch/' + n + "/c/" + nextK.id + '">अगली बात: ' + esc(nextK.name) + " ▶</a>" : '<a class="btn" href="#/ch/' + n + '/quiz">🏆 अंतिम परीक्षा दीजिए</a>'),
        onShow: function () { addXP(10, n + ":" + k.id); } });
      player(k.emoji + " " + k.name, "#/ch/" + n + "/learn", sc, function () { go(nextK ? "#/ch/" + n + "/c/" + nextK.id : "#/ch/" + n + "/learn"); });
    });
  }

  /* ---------------- final quiz ---------------- */
  function finalQuiz(n) {
    chapter(n).then(function (c) {
      var score = 0, sc = c.finalQuiz.map(function (q, i) { return quizScreen(q, "सवाल " + (i + 1) + " / " + c.finalQuiz.length, function (ok) { if (ok) score++; }); });
      sc.push({ html: '<div id="res"></div>', onShow: function (el) {
        var pass = score >= Math.ceil(c.finalQuiz.length * 0.7);
        st.best[n] = Math.max(st.best[n] || 0, score); if (pass) addXP(50, n + ":badge"); save();
        el.querySelector("#res").innerHTML = '<div class="score">' + score + " / " + c.finalQuiz.length + "</div>" +
          (pass ? '<div class="badge"><div class="em">' + esc(c.badge.emoji) + '</div><h2>बैज मिला: ' + esc(c.badge.naam) + '</h2><p>' + esc(c.badge.vivran) + "</p></div>"
                : '<div class="box gold">7 या ज़्यादा सही होने पर बैज मिलेगा। जो सवाल गलत हुए, वे बातें दोबारा देख लीजिए, फिर परीक्षा दोबारा दीजिए।</div>') +
          '<a class="btn soft" href="#/ch/' + n + '/learn">पाठ पर वापस</a>';
      } });
      player("अंतिम परीक्षा", "#/ch/" + n + "/learn", sc, function () { go("#/ch/" + n + "/learn"); });
    });
  }

  /* ---------------- chapter flows: map, types, process (boxes in rows) and compare (table) ---------------- */
  function flowSVG(g, n, interactive) {
    var W = 360, ROWH = 80, TOP = 8, rows = {}, maxRow = 0;
    g.nodes.forEach(function (d) { (rows[d.row] = rows[d.row] || []).push(d); if (d.row > maxRow) maxRow = d.row; });
    var pos = {};
    g.nodes.forEach(function (d) {
      var cnt = rows[d.row].length, w = cnt === 1 ? 250 : cnt === 2 ? 150 : cnt === 3 ? 108 : 82, h = d.s ? 50 : 40;
      var fx = d.x == null ? 0.5 : d.x, room = Math.min(fx, 1 - fx) * 2 * W - 8;  // never wider than the space around it
      rows[d.row].forEach(function (o) { if (o !== d) room = Math.min(room, Math.abs((o.x == null ? 0.5 : o.x) - fx) * W - 8); });
      w = Math.max(70, Math.min(w, room));
      var cx = fx * W, cy = TOP + d.row * ROWH + 26;
      pos[d.id] = { x: cx - w / 2, y: cy - h / 2, w: w, h: h, cx: cx, cy: cy };
    });
    var H = TOP + (maxRow + 1) * ROWH, out = '<svg class="fl" viewBox="0 0 ' + W + " " + H + '" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><marker id="fa" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#adb5bd"/></marker></defs>';
    (g.edges || []).forEach(function (e) {
      var a = pos[e[0]], b = pos[e[1]]; if (!a || !b) return;
      var y1 = a.y + a.h, y2 = b.y - 2, mid = Math.max(y1 + 8, y2 - 14);
      out += '<path d="M' + a.cx + "," + y1 + " V" + mid + " H" + b.cx + " V" + y2 + '" fill="none" stroke="#adb5bd" stroke-width="2" marker-end="url(#fa)"/>';
    });
    g.nodes.forEach(function (d) {
      var p = pos[d.id], done = d.c && st.done[n + ":" + d.c];
      var fill = d.root ? "#e8590c" : d.group ? "#1b2a3a" : done ? "#e3f6e8" : "#fff";
      var stroke = d.root ? "#e8590c" : d.group ? "#1b2a3a" : done ? "#2b8a3e" : d.c ? "#f08c3a" : "#adb5bd";
      var ink = d.root || d.group ? "#fff" : "#1b2a3a", sub = d.root || d.group ? "#ffe8d6" : "#5b6b7b";
      var room = p.w - 12, tf = fitLabel(d.t, room), lines = tf.lines, fs = tf.size;
      var ss = d.s ? fitSize(d.s, room, 11, 8.5, false) : 0, lh = fs + 1.5;
      var H = p.h + (lines.length - 1) * 17, blockH = lines.length * lh + (d.s ? ss + 4 : 0);
      var ty = p.y + H / 2 - blockH / 2 + fs * 0.85;
      var g0 = d.c && interactive ? '<g class="fnode" data-go="#/ch/' + n + "/c/" + d.c + '">' : "<g>";
      out += g0 + '<rect x="' + p.x + '" y="' + p.y + '" width="' + p.w + '" height="' + H + '" rx="12" fill="' + fill + '" stroke="' + stroke +
        '" stroke-width="2"' + (d.note ? ' stroke-dasharray="5 4"' : "") + "/>";
      lines.forEach(function (l, i) { out += '<text x="' + p.cx + '" y="' + (ty + i * lh) + '" text-anchor="middle" font-size="' + fs + '" font-weight="700" fill="' + ink + '">' + esc(l) + "</text>"; });
      if (d.s) out += '<text x="' + p.cx + '" y="' + (ty + (lines.length - 1) * lh + ss + 4) + '" text-anchor="middle" font-size="' + ss + '" fill="' + sub + '">' + esc(d.s) + "</text>";
      if (done) out += '<text x="' + (p.x + p.w - 10) + '" y="' + (p.y + 13) + '" text-anchor="middle" font-size="11">✅</text>';
      out += "</g>";
    });
    return out + "</svg>";
  }
  /* Box text: measure the real Hindi width (canvas), shrink the font to fit; wrap to 2 lines only if one line would be too small. */
  var measureCtx = null;
  function textW(t, size, bold) {
    if (!measureCtx) { try { measureCtx = document.createElement("canvas").getContext("2d"); } catch (e) { measureCtx = false; } }
    if (!measureCtx) return t.length * size * 0.55;
    measureCtx.font = (bold ? "700 " : "400 ") + size + "px " + (getComputedStyle(document.body).fontFamily || "sans-serif");
    return measureCtx.measureText(t).width;
  }
  function fitSize(t, room, base, min, bold) {
    var w = textW(t, base, bold); if (w <= room) return base;
    return Math.max(min, Math.floor(base * room / w * 10) / 10);
  }
  function fitLabel(t, room) {
    var one = fitSize(t, room, 13.5, 11.5, true);
    if (textW(t, one, true) <= room || t.indexOf(" ") < 0) return { lines: [t], size: fitSize(t, room, 13.5, 9.5, true) };
    var words = t.split(" "), best = null;
    for (var i = 1; i < words.length; i++) {
      var a = words.slice(0, i).join(" "), b = words.slice(i).join(" "), m = Math.max(textW(a, 13.5, true), textW(b, 13.5, true));
      if (!best || m < best.m) best = { a: a, b: b, m: m };
    }
    var size = Math.max(9.5, Math.min(13.5, Math.floor(13.5 * room / best.m * 10) / 10));
    return { lines: [best.a, best.b], size: size };
  }
  function compareHTML(it) {
    return '<table class="cmp"><thead><tr><th></th><th>' + esc(it.left) + "</th><th>" + esc(it.right) + "</th></tr></thead><tbody>" +
      it.rows.map(function (r) { return "<tr><th>" + esc(r[0]) + "</th><td>" + esc(r[1]) + "</td><td>" + esc(r[2]) + "</td></tr>"; }).join("") + "</tbody></table>";
  }
  function flowSay(it) {
    if (it.kind === "compare") return it.title + "। " + it.rows.map(function (r) { return r[0] + ": " + it.left + " में " + r[1] + ", " + it.right + " में " + r[2]; }).join("। ");
    return it.title + "। " + it.nodes.map(function (d) { return d.t + (d.s ? " " + d.s : ""); }).join(", ");
  }
  function flowScreen(it, n) {
    var kick = { types: "प्रकार, एक नज़र में", process: "कैसे होता है, एक नज़र में", compare: "फ़र्क, एक नज़र में" }[it.kind] || "एक नज़र में";
    return { html: '<div class="kicker">' + kick + "</div><h2>" + esc(it.title) + "</h2>" +
      (it.kind === "compare" ? compareHTML(it) : '<div class="flbox">' + flowSVG(it, n, false) + "</div>"), say: flowSay(it) };
  }
  function mapPage(n) {
    chapter(n).then(function (c) {
      if (!c.map) return go("#/ch/" + n + "/learn");
      app.innerHTML = top("पाठ " + lab(c) + ": नक्शा", "#/ch/" + n + "/learn") + '<div class="pad"><p class="small">किसी डिब्बे को दबाइए, वही बात खुलेगी। ✅ = समझ ली।</p><div class="flbox big">' +
        flowSVG(c.map, n, true) + '</div><div class="legend"><span class="lg r">पाठ</span><span class="lg g">हिस्सा</span><span class="lg c">बात (दबाइए)</span><span class="lg d">समझ ली</span></div></div>' + tabs(n, "learn");
    });
  }

  /* ---------------- class tab ---------------- */
  function classList(n) {
    chapter(n).then(function (c) {
      var p = c.prep || {};
      var html = top("कक्षा में पढ़ाइए", "#/") + '<div class="pad"><div class="box blue"><div class="h">🎒 पढ़ाने से पहले (' + esc(p.samay || "") + ")</div>" +
        (p.saman || []).map(function (s) { return "• " + esc(s); }).join("<br>") + "</div><p class=\"small\">हर बात के लिए: कक्षा में क्या बोलें, बच्चे क्या कहेंगे, बोर्ड पर क्या लिखें, और बच्चों से क्या पूछें।</p></div><div class=\"path\">";
      c.concepts.forEach(function (k, i) { html += stone("#/ch/" + n + "/class/" + k.id, k.emoji, (i + 1) + ". " + k.name, "कक्षा की स्क्रिप्ट", false); });
      if (c.homework && c.homework.length) html += '</div><div class="pad"><div class="box gold"><div class="h">🏠 गृहकार्य</div>' + c.homework.map(function (h) { return "• " + esc(h); }).join("<br>") + "</div></div>";
      else html += "</div>";
      app.innerHTML = html + tabs(n, "class");
    });
  }
  function classOne(n, id) {
    chapter(n).then(function (c) {
      var k = c.concepts.filter(function (x) { return x.id === id; })[0]; if (!k) return go("#/ch/" + n + "/class");
      var who = { "शिक्षक": "b-t", "बच्चे": "b-k", "करें": "b-d" };
      var html = top(k.emoji + " " + k.name, "#/ch/" + n + "/class") + '<div class="pad"><div class="kicker">कक्षा में ऐसे बोलिए</div>' +
        k.script.map(function (s) { return '<div class="bubble ' + (who[s.kaun] || "b-d") + '"><span class="w">' + esc(s.kaun === "करें" ? "✋ आप करें" : s.kaun) + "</span>" + nl(s.text) + "</div>"; }).join("") +
        (k.board ? '<div class="kicker" style="margin-top:16px">ब्लैकबोर्ड पर</div><div class="board">' + esc(k.board) + "</div>" : "") +
        (k.askKids.length ? '<div class="kicker" style="margin-top:16px">बच्चों से पूछिए</div>' + k.askKids.map(function (x, j) {
          return '<div class="box"><div class="q"><b>❓ ' + esc(x.q) + '</b></div><button class="reveal" style="margin:8px 0 0" data-reveal="ak' + j + '">संभावित उत्तर</button><div id="ak' + j + '" hidden>✅ ' + nl(x.a) + "</div></div>";
        }).join("") : "") +
        '<a class="btn soft" href="#/ch/' + n + "/c/" + k.id + '">📖 पहले खुद समझिए</a></div>';
      app.innerHTML = html; bindReveal(app);
    });
  }

  /* ---------------- play tab ---------------- */
  function playList(n) {
    chapter(n).then(function (c) {
      app.innerHTML = top("खेलें", "#/") + '<div class="path">' +
        stone("#/ch/" + n + "/play/tf", "⚡", "झटपट सही या गलत", c.trueFalse.length + " बातें, एक-एक करके", false) +
        stone("#/ch/" + n + "/play/words", "🃏", "शब्द कार्ड", c.words.length + " नए शब्द, पलटकर अर्थ देखिए", false) +
        stone("#/ch/" + n + "/play/riddles", "🗝️", "पहेलियाँ", c.riddles.length + " पहेलियाँ बूझिए", false) +
        '</div><div class="pad"><div class="tip">ये खेल कक्षा में भी खिलाइए: फ़ोन पर बात पढ़िए, बच्चे “सही” हो तो खड़े हों, “गलत” हो तो बैठें।</div></div>' + tabs(n, "play");
    });
  }
  function playTF(n) {
    chapter(n).then(function (c) {
      var score = 0;
      var sc = c.trueFalse.map(function (x, i) {
        return { gate: true, say: x.t, html: '<div class="kicker">⚡ ' + (i + 1) + " / " + c.trueFalse.length + '</div><div class="box tf">' + esc(x.t) + '</div><div class="tfbtns"><button class="y">✅ सही</button><button class="n">❌ गलत</button></div><div id="fb"></div>',
          onShow: function (el, unlock) {
            function ans(v) { var ok = v === x.ok; if (ok) score++; $$(".tfbtns button", el).forEach(function (b) { b.disabled = true; });
              el.querySelector("#fb").innerHTML = '<div class="box ' + (ok ? "ok" : "bad") + '" style="margin-top:12px"><div class="h">' + (ok ? "✅ बिल्कुल!" : "❌ उलटा है। यह बात " + (x.ok ? "सही" : "गलत") + " है।") + "</div>" + nl(x.why) + "</div>"; unlock(); }
            el.querySelector(".y").onclick = function () { ans(true); }; el.querySelector(".n").onclick = function () { ans(false); };
          } };
      });
      sc.push({ html: '<div id="r"></div>', onShow: function (el) { addXP(15, n + ":tf"); el.querySelector("#r").innerHTML = '<div class="score">' + score + " / " + c.trueFalse.length + '</div><a class="btn soft" href="#/ch/' + n + '/play">और खेल</a>'; } });
      player("झटपट सही या गलत", "#/ch/" + n + "/play", sc, function () { go("#/ch/" + n + "/play"); });
    });
  }
  function playWords(n) {
    chapter(n).then(function (c) {
      var sc = c.words.map(function (w, i) {
        return { say: w.w + "। " + w.m + "। " + w.e, html: '<div class="kicker">🃏 ' + (i + 1) + " / " + c.words.length + ' · दबाकर पलटिए</div><div class="flip"><div class="card"><div class="f">' + esc(w.w) +
          '<div class="small" style="font-weight:400;margin-top:10px">अर्थ देखने के लिए दबाइए</div></div><div class="b"><b>' + esc(w.m) + "</b><p class=\"small\" style=\"margin-top:10px\">जैसे: " + esc(w.e) + "</p></div></div></div>",
          onShow: function (el) { el.querySelector(".flip").onclick = function () { this.classList.toggle("on"); }; } };
      });
      player("शब्द कार्ड", "#/ch/" + n + "/play", sc, function () { addXP(10, n + ":words"); go("#/ch/" + n + "/play"); });
    });
  }
  function playRiddles(n) {
    chapter(n).then(function (c) {
      var sc = c.riddles.map(function (r, i) {
        return { say: r.r, html: '<div class="kicker">🗝️ पहेली ' + (i + 1) + '</div><div class="box gold lead" style="white-space:pre-line">' + esc(r.r) + "</div>" +
          '<button class="reveal" data-reveal="h' + i + '">🤔 संकेत</button><div id="h' + i + '" hidden class="box">' + esc(r.hint) + "</div>" +
          '<button class="reveal" data-reveal="a' + i + '">🔓 उत्तर</button><div id="a' + i + '" hidden class="box ok lead"><b>' + esc(r.a) + "</b></div>" };
      });
      player("पहेलियाँ", "#/ch/" + n + "/play", sc, function () { addXP(10, n + ":riddles"); go("#/ch/" + n + "/play"); });
    });
  }

  /* ---------------- practice tab ---------------- */
  function practice(n) {
    chapter(n).then(function (c) {
      app.innerHTML = top("किताब के अभ्यास", "#/") + '<div class="pad"><p class="small">किताब के सवाल, आसान उत्तर के साथ। पहले खुद सोचिए, फिर “उत्तर देखिए” दबाइए।</p>' +
        c.practice.map(function (x, i) {
          return '<div class="box"><div><b>' + (i + 1) + ". " + nl(x.q) + '</b></div><button class="reveal" style="margin:10px 0 0" data-reveal="p' + i + '">उत्तर देखिए</button><div id="p' + i + '" hidden style="margin-top:10px">' +
            '<div class="box ok">' + nl(x.a) + "</div>" + (x.how ? '<div class="box blue"><div class="h">🧑‍🏫 बच्चों को ऐसे समझाइए</div>' + nl(x.how) + "</div>" : "") + "</div></div>";
        }).join("") + "</div>" + tabs(n, "practice");
      bindReveal(app);
    });
  }

  /* ---------------- hands-on widgets ---------------- */
  var DIRS = [["उत्तर", 0], ["उत्तर-पूर्व", 45], ["पूर्व", 90], ["दक्षिण-पूर्व", 135], ["दक्षिण", 180], ["दक्षिण-पश्चिम", 225], ["पश्चिम", 270], ["उत्तर-पश्चिम", 315]];
  function rounds(el, total, ask, check, end) {
    var r = 0, sc = 0;
    function nextQ() { if (r >= total) { end(sc); return; } ask(r); }
    check(function (ok) { r++; if (ok) sc++; setTimeout(nextQ, 900); });
    nextQ();
  }
  var WIDGETS = {
    compass: {
      say: "दिशा का खेल। फ़ोन जो दिशा बोले, उस पर उँगली रखिए।",
      html: '<h2>🧭 दिशा पहचानिए</h2><div class="wg"><div class="ask" id="ask"></div><div class="rose">' +
        DIRS.map(function (d) { var a = (d[1] - 90) * Math.PI / 180, x = 140 + 118 * Math.cos(a), y = 140 + 118 * Math.sin(a);
          return '<button data-d="' + d[0] + '" style="left:' + x + "px;top:" + y + 'px">' + d[0].replace("-", "-<br>") + "</button>"; }).join("") +
        '<div class="c">☀️</div></div><div class="fb" id="fb"></div><p class="small">याद रखिए: सुबह सूरज जिधर से निकलता है, वह पूर्व।</p></div>',
      init: function (el, unlock) {
        var want = "";
        rounds(el, 6, function () { want = DIRS[Math.floor(Math.random() * 8)][0]; el.querySelector("#ask").textContent = "👉 " + want + " पर टैप कीजिए";
          $$(".rose button", el).forEach(function (b) { b.className = ""; }); el.querySelector("#fb").textContent = ""; },
          function (done) { $$(".rose button", el).forEach(function (b) { b.onclick = function () { var ok = b.getAttribute("data-d") === want; b.className = ok ? "right" : "wrong";
            el.querySelector("#fb").textContent = ok ? "✅ सही!" : "❌ यह " + b.getAttribute("data-d") + " है"; done(ok); }; }); },
          function (s) { el.querySelector("#ask").textContent = "🎉 6 में से " + s + " सही!"; unlock(); });
      }
    },
    scale: {
      say: "स्केल का खेल। नक्शे की दूरी और स्केल बदलिए, असली दूरी देखिए।",
      html: '<h2>📏 नक्शे की दूरी → असली दूरी</h2><div class="wg"><div class="small">स्केल चुनिए</div><div class="seg" id="sc">' +
        [1, 2, 5, 10].map(function (k, i) { return '<button data-k="' + k + '" class="' + (i ? "" : "on") + '">1 सेमी = ' + k + " किमी</button>"; }).join("") +
        '</div><div class="small">नक्शे पर दूरी: <b id="cmv">4</b> सेमी</div><input type="range" id="cm" min="1" max="10" value="4"><div class="mapline" id="ml"></div><div class="out" id="out"></div>' +
        '<p class="small">तरीका: नक्शे की दूरी × स्केल = असली दूरी</p></div>',
      init: function (el, unlock) {
        var k = 1, cm = el.querySelector("#cm");
        function upd() { var v = +cm.value; el.querySelector("#cmv").textContent = v; el.querySelector("#ml").style.width = (v * 9) + "%";
          el.querySelector("#out").textContent = v + " × " + k + " = " + (v * k) + " किमी असली दूरी"; unlock(); }
        cm.oninput = upd;
        $$("#sc button", el).forEach(function (b) { b.onclick = function () { $$("#sc button", el).forEach(function (x) { x.classList.remove("on"); }); b.classList.add("on"); k = +b.getAttribute("data-k"); upd(); }; });
        upd();
      }
    },
    grid: {
      say: "लाइन और कॉलम का खेल। फ़ोन जो खाना बोले, उस पर टैप कीजिए।",
      html: '<h2>🔢 खाना ढूँढिए</h2><div class="wg"><div class="ask" id="ask"></div><div class="grid" id="g"></div><div class="fb" id="fb"></div>' +
        '<p class="small">पहले ऊपर वाला अक्षर (कॉलम), फिर बाएँ वाली गिनती (लाइन)। अक्षांश-देशांतर भी ऐसे ही पता बताते हैं।</p></div>',
      init: function (el, unlock) {
        var C = ["क", "ख", "ग", "घ"], g = el.querySelector("#g"), want = "", h = "<div></div>";
        C.forEach(function (x) { h += "<div>" + x + "</div>"; });
        for (var r = 1; r <= 4; r++) { h += "<div>" + r + "</div>"; C.forEach(function (x) { h += '<button data-c="' + x + " " + r + '"></button>'; }); }
        g.innerHTML = h;
        rounds(el, 5, function () { want = C[Math.floor(Math.random() * 4)] + " " + (1 + Math.floor(Math.random() * 4));
          el.querySelector("#ask").textContent = "👉 खाना " + want + " पर ⭐ रखिए"; $$("#g button", el).forEach(function (b) { b.className = ""; b.textContent = ""; }); el.querySelector("#fb").textContent = ""; },
          function (done) { $$("#g button", el).forEach(function (b) { b.onclick = function () { var ok = b.getAttribute("data-c") === want; b.className = ok ? "right" : "wrong"; b.textContent = ok ? "⭐" : "✗";
            el.querySelector("#fb").textContent = ok ? "✅ सही पता!" : "❌ यह खाना " + b.getAttribute("data-c") + " है"; done(ok); }; }); },
          function (s) { el.querySelector("#ask").textContent = "🎉 5 में से " + s + " सही!"; unlock(); });
      }
    },
    clock: {
      say: "समय का खेल। स्लाइडर से देशांतर बदलिए, देखिए वहाँ घड़ी में क्या बजा है, जब ग्रिनिच में दोपहर के बारह बजे हैं।",
      html: '<h2>🕛 जगह बदलिए, समय देखिए</h2><div class="wg"><div class="small" style="text-align:center">ग्रिनिच (0°) पर अभी दोपहर 12:00 बजे हैं</div>' +
        '<div class="seg" id="pl"><button data-l="0">ग्रिनिच 0°</button><button data-l="82.5">भारत IST 82½° पू.</button><button data-l="77">दिल्ली 77° पू.</button><button data-l="140">टोक्यो 140° पू.</button><button data-l="-74">न्यूयॉर्क 74° प.</button></div>' +
        '<input type="range" id="lon" min="-180" max="180" step="7.5" value="82.5"><div class="out" id="lonv"></div><div class="clock"><div>ग्रिनिच<b>12:00</b>दोपहर</div><div id="loc"></div></div>' +
        '<div class="box gold" id="why" style="margin-top:10px"></div></div>',
      init: function (el, unlock) {
        var lon = el.querySelector("#lon");
        function part(h) { return h >= 4 && h < 12 ? "सुबह" : h < 16 ? "दोपहर" : h < 19 ? "शाम" : "रात"; }
        function upd() {
          var L = +lon.value, mins = Math.round(720 + L * 4), h = ((Math.floor(mins / 60) % 24) + 24) % 24, m = ((mins % 60) + 60) % 60, h12 = h % 12 || 12;
          el.querySelector("#lonv").textContent = L === 0 ? "0° (ग्रिनिच)" : Math.abs(L) + "° " + (L > 0 ? "पूर्व" : "पश्चिम");
          el.querySelector("#loc").innerHTML = "यहाँ<b>" + h12 + ":" + (m < 10 ? "0" : "") + m + "</b>" + part(h) + " " + (h >= 6 && h < 18 ? "☀️" : "🌙");
          var hrs = Math.abs(L) / 15;
          el.querySelector("#why").textContent = L === 0 ? "यही 0° रेखा है, यहीं से गिनती शुरू।" :
            Math.abs(L) + "° ÷ 15 = " + (Math.round(hrs * 100) / 100) + " घंटे " + (L > 0 ? "आगे (पूर्व में जोड़ो)" : "पीछे (पश्चिम में घटाओ)") + (L === 82.5 ? "। भारत का मानक समय: 5 घंटे 30 मिनट आगे।" : "");
          unlock();
        }
        lon.oninput = upd;
        $$("#pl button", el).forEach(function (b) { b.onclick = function () { lon.value = b.getAttribute("data-l"); upd(); }; });
        upd();
      }
    }
  };

  /* ---------------- router ---------------- */
  function route() {
    stopSpeak(); app.ontouchstart = app.ontouchend = null;
    var h = location.hash.replace(/^#\/?/, "").split("/");
    if (h[0] !== "ch") return home();
    var n = +h[1], v = h[2] || "learn";
    if (v === "learn") return learn(n);
    if (v === "map") return mapPage(n);
    if (v === "intro") return intro(n);
    if (v === "story") return story(n);
    if (v === "c") return concept(n, h[3]);
    if (v === "quiz") return finalQuiz(n);
    if (v === "class") return h[3] ? classOne(n, h[3]) : classList(n);
    if (v === "play") return h[3] === "tf" ? playTF(n) : h[3] === "words" ? playWords(n) : h[3] === "riddles" ? playRiddles(n) : playList(n);
    if (v === "practice") return practice(n);
    home();
  }
  window.addEventListener("hashchange", function () { route(); window.scrollTo(0, 0); });
  route();
  if ("serviceWorker" in navigator) window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
})();
