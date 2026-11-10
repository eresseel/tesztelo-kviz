(function () {
  'use strict';

  const TOPICS = {
    teszt: 'Tesztautomatizálás',
    web: 'Webfejlesztés (HTML, CSS, JS)',
    java: 'Java alapok és OOP',
    halado: 'Java haladó (GUI, adatbázis), Mockito, TDD'
  };
  const TYPE_HINT = {
    single: 'Egy helyes válasz',
    multi: 'Több helyes válasz is lehet',
    truefalse: 'Igaz vagy hamis?'
  };
  const LS = { stats: 'tq.stats', history: 'tq.history', theme: 'tq.theme', setup: 'tq.setup' };
  const LETTERS = 'ABCDEFGH';

  const ALL = (window.QUESTIONS || []).filter(validQuestion);

  // ---------- Helpers ----------
  const $ = sel => document.querySelector(sel);
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };

  function validQuestion(q) {
    return q && q.id && TOPICS[q.topic] && Array.isArray(q.options) && q.options.length >= 2 &&
      Array.isArray(q.answer) && q.answer.length > 0 &&
      q.answer.every(i => Number.isInteger(i) && i >= 0 && i < q.options.length);
  }

  function load(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* tárolás nem elérhető */ }
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  // Szöveg: HTML escape + `inline kód` kiemelés
  function fmt(s) {
    return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  // Forrás-hivatkozás: melyik PDF hányadik oldalán található a megoldás
  const PDF_DIR = 'elmelet/';
  function sourceHtml(q) {
    const src = Array.isArray(q.source) ? q.source.filter(s => s && s.file) : [];
    if (!src.length) return '';
    const links = src.map(s => {
      const href = PDF_DIR + encodeURIComponent(s.file) + (s.page ? '#page=' + s.page : '');
      const label = s.file + (s.page ? ', ' + s.page + '. oldal' : '');
      return '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(label) + '</a>';
    });
    return '<div class="source">📄 Megoldás a tananyagban: ' + links.join(' · ') + '</div>';
  }

  const KW = {
    java: 'abstract|assert|boolean|break|byte|case|catch|char|class|continue|default|do|double|else|enum|extends|final|finally|float|for|if|implements|import|instanceof|int|interface|long|new|null|package|private|protected|public|return|short|static|super|switch|this|throw|throws|try|void|while|true|false|var|String',
    javascript: 'break|case|catch|class|const|continue|default|do|else|export|extends|false|finally|for|function|if|import|in|instanceof|let|new|null|of|return|switch|this|throw|true|try|typeof|undefined|var|while|async|await|console|document',
    css: '',
    html: ''
  };
  function highlight(src, lang) {
    const kw = KW[lang] || KW.java;
    const parts = [
      '(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/|<!--[\\s\\S]*?-->)',
      '("(?:[^"\\\\\\n]|\\\\.)*"' + (lang === 'html' ? '' : "|'(?:[^'\\\\\\n]|\\\\.)*'") + ')',
      '\\b(\\d+(?:\\.\\d+)?[LlFfDd]?)\\b'
    ];
    if (kw) parts.push('\\b(' + kw + ')\\b');
    const re = new RegExp(parts.join('|'), 'g');
    let out = '', last = 0, m;
    while ((m = re.exec(src)) !== null) {
      out += esc(src.slice(last, m.index));
      const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'n' : 'k';
      out += '<span class="' + cls + '">' + esc(m[0]) + '</span>';
      last = re.lastIndex;
    }
    return out + esc(src.slice(last));
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function sameSet(a, b) {
    if (a.length !== b.length) return false;
    const s = new Set(a);
    return b.every(x => s.has(x));
  }

  function fmtTime(sec) {
    const m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  function show(screen) {
    ['start', 'quiz', 'result'].forEach(n => { $('#screen-' + n).hidden = n !== screen; });
    window.scrollTo(0, 0);
  }

  // ---------- Theme ----------
  function applyTheme(t) {
    if (t) document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }
  applyTheme(load(LS.theme, null));
  $('#themeToggle').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    save(LS.theme, next);
  });

  // ---------- Start screen ----------
  const form = $('#setupForm');

  function renderStart() {
    const stats = load(LS.stats, {});
    const setup = load(LS.setup, null);
    $('#totalCount').textContent = ALL.length + ' kérdés, ' + Object.keys(TOPICS).length + ' témakör.';

    const list = $('#topicList');
    list.innerHTML = '';
    Object.entries(TOPICS).forEach(([key, name]) => {
      const n = ALL.filter(q => q.topic === key).length;
      if (!n) return;
      const lab = el('label', 'check');
      const checked = !setup || !Array.isArray(setup.excluded) || !setup.excluded.includes(key);
      lab.innerHTML = '<input type="checkbox" name="topic" value="' + key + '"' + (checked ? ' checked' : '') + '>' +
        '<span>' + esc(name) + '</span><span class="count">' + n + ' db</span>';
      list.appendChild(lab);
    });

    if (setup) {
      ['mode', 'pool'].forEach(k => {
        const r = form.querySelector('input[name="' + k + '"][value="' + setup[k] + '"]');
        if (r) r.checked = true;
      });
      if (setup.count != null) form.count.value = String(setup.count);
      if (setup.time != null) form.time.value = String(setup.time);
      form.shuffleOptions.checked = setup.shuffleOptions !== false;
    }

    const wrongN = ALL.filter(q => stats[q.id] && stats[q.id].last === 'bad').length;
    const unseenN = ALL.filter(q => !stats[q.id]).length;
    $('#wrongInfo').textContent = 'Amiket legutóbb elrontottál (' + wrongN + ' db)';
    $('#unseenInfo').textContent = 'Amiket még nem láttál (' + unseenN + ' db)';
    updateTimeField();
    renderHistory();
    $('#setupError').hidden = true;
    show('start');
  }

  function updateTimeField() {
    $('#timeField').style.opacity = form.mode.value === 'exam' ? '1' : '.45';
    form.time.disabled = form.mode.value !== 'exam';
  }
  form.addEventListener('change', updateTimeField);

  function renderHistory() {
    const hist = load(LS.history, []);
    const box = $('#historyList');
    if (!hist.length) {
      box.innerHTML = '<p class="muted">Még nincs elmentett eredmény. Indíts egy feladatsort!</p>';
      $('#clearHistory').hidden = true;
      return;
    }
    $('#clearHistory').hidden = false;
    let html = '<table class="history-table"><thead><tr><th>Dátum</th><th>Mód</th><th class="hide-sm">Témák</th><th>Eredmény</th><th class="hide-sm">Idő</th></tr></thead><tbody>';
    hist.slice(0, 15).forEach(h => {
      const cls = h.pct >= 80 ? 'badge-ok' : h.pct >= 60 ? 'badge-mid' : 'badge-bad';
      const d = new Date(h.date);
      const ds = d.toLocaleDateString('hu-HU') + ' ' + d.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
      const topics = (h.topics || []).map(t => (TOPICS[t] || t).split(' ')[0]).join(', ');
      html += '<tr><td>' + esc(ds) + '</td><td>' + (h.mode === 'exam' ? 'Vizsga' : 'Gyakorló') + '</td>' +
        '<td class="hide-sm">' + esc(topics) + '</td>' +
        '<td class="num">' + h.correct + '/' + h.total + ' <span class="badge ' + cls + '">' + h.pct + '%</span></td>' +
        '<td class="num hide-sm">' + fmtTime(h.duration || 0) + '</td></tr>';
    });
    box.innerHTML = html + '</tbody></table>';
  }

  $('#clearHistory').addEventListener('click', () => {
    if (!confirm('Biztosan törlöd az előzményeket és a kérdésstatisztikát?')) return;
    try { localStorage.removeItem(LS.history); localStorage.removeItem(LS.stats); } catch (e) { /* ignore */ }
    renderStart();
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const topics = [...form.querySelectorAll('input[name="topic"]:checked')].map(i => i.value);
    const setup = {
      mode: form.mode.value,
      pool: form.pool.value,
      topics,
      excluded: [...form.querySelectorAll('input[name="topic"]:not(:checked)')].map(i => i.value),
      count: parseInt(form.count.value, 10),
      time: parseInt(form.time.value, 10),
      shuffleOptions: form.shuffleOptions.checked
    };
    save(LS.setup, setup);

    const err = $('#setupError');
    if (!topics.length) { err.textContent = 'Válassz legalább egy témakört!'; err.hidden = false; return; }

    const stats = load(LS.stats, {});
    let pool = ALL.filter(q => topics.includes(q.topic));
    if (setup.pool === 'wrong') pool = pool.filter(q => stats[q.id] && stats[q.id].last === 'bad');
    if (setup.pool === 'unseen') pool = pool.filter(q => !stats[q.id]);
    if (!pool.length) {
      err.textContent = setup.pool === 'wrong'
        ? 'Nincs elrontott kérdés a kiválasztott témákban. Szép munka!'
        : 'Nincs több új kérdés a kiválasztott témákban.';
      err.hidden = false;
      return;
    }
    let picked = shuffle(pool);
    if (setup.count > 0) picked = picked.slice(0, setup.count);
    startQuiz(picked, setup);
  });

  // ---------- Quiz ----------
  let quiz = null;

  function startQuiz(questions, setup) {
    quiz = {
      mode: setup.mode,
      setup,
      topics: setup.topics,
      items: questions.map(q => ({
        q,
        order: setup.shuffleOptions && q.type !== 'truefalse' ? shuffle(q.options.map((_, i) => i)) : q.options.map((_, i) => i),
        sel: [],
        checked: false
      })),
      idx: 0,
      start: Date.now(),
      limit: setup.mode === 'exam' && setup.time > 0 ? setup.time * questions.length : 0,
      timer: null,
      finished: false
    };
    $('#qMode').textContent = quiz.mode === 'exam' ? 'Vizsga mód' : 'Gyakorló mód';
    $('#timer').hidden = !quiz.limit;
    if (quiz.limit) {
      tick();
      quiz.timer = setInterval(tick, 1000);
    }
    $('#qmapWrap').open = quiz.mode === 'exam';
    show('quiz');
    renderQuestion();
  }

  function tick() {
    const left = quiz.limit - Math.floor((Date.now() - quiz.start) / 1000);
    const t = $('#timer');
    t.textContent = '⏱ ' + fmtTime(Math.max(0, left));
    t.classList.toggle('low', left <= 60);
    if (left <= 0) {
      alert('Lejárt az idő! A feladatsort automatikusan beadjuk.');
      finish();
    }
  }

  function isCorrect(item) {
    return sameSet(item.sel, item.q.answer);
  }

  function renderQuestion() {
    const item = quiz.items[quiz.idx];
    const q = item.q;
    const n = quiz.items.length;
    const locked = quiz.mode === 'practice' && item.checked;

    $('#qCounter').textContent = (quiz.idx + 1) + ' / ' + n;
    const done = quiz.mode === 'practice' ? quiz.items.filter(i => i.checked).length : quiz.items.filter(i => i.sel.length).length;
    $('#progressBar').style.width = (done / n * 100) + '%';
    if (quiz.mode === 'practice') {
      const ok = quiz.items.filter(i => i.checked && isCorrect(i)).length;
      $('#qScore').hidden = false;
      $('#qScore').textContent = '✓ ' + ok + ' / ' + done;
    } else {
      $('#qScore').hidden = false;
      $('#qScore').textContent = 'Megválaszolva: ' + done + ' / ' + n;
    }

    $('#qTopic').textContent = TOPICS[q.topic];
    $('#qSub').textContent = q.subtopic || '';
    $('#qSub').hidden = !q.subtopic;
    $('#qType').textContent = TYPE_HINT[q.type] || TYPE_HINT.single;
    $('#qText').innerHTML = fmt(q.question);

    const codeBox = $('#qCode');
    if (q.code && q.code.src) {
      codeBox.hidden = false;
      codeBox.querySelector('code').innerHTML = highlight(q.code.src, q.code.lang);
    } else {
      codeBox.hidden = true;
    }

    const box = $('#qOptions');
    box.innerHTML = '';
    box.classList.toggle('locked', locked);
    const multi = q.type === 'multi';
    item.order.forEach((orig, pos) => {
      const lab = el('label', 'option');
      const input = el('input');
      input.type = multi ? 'checkbox' : 'radio';
      input.name = 'opt';
      input.checked = item.sel.includes(orig);
      input.disabled = locked;
      input.addEventListener('change', () => toggleOption(orig, input.checked));
      lab.appendChild(input);
      lab.appendChild(el('span', 'key', LETTERS[pos]));
      lab.appendChild(el('span', 'txt', fmt(q.options[orig])));
      if (item.sel.includes(orig)) lab.classList.add('selected');
      if (locked) markOption(lab, orig, item);
      box.appendChild(lab);
    });

    const fb = $('#feedback');
    if (locked) showFeedback(item); else fb.hidden = true;

    updateButtons();
    renderMap();
  }

  function markOption(lab, orig, item) {
    const isAns = item.q.answer.includes(orig);
    const isSel = item.sel.includes(orig);
    lab.classList.remove('selected');
    if (isAns && isSel) lab.classList.add('correct');
    else if (isAns) lab.classList.add('correct', 'missed');
    else if (isSel) lab.classList.add('wrong');
  }

  function showFeedback(item) {
    const fb = $('#feedback');
    const ok = isCorrect(item);
    fb.className = 'feedback' + (ok ? '' : ' bad');
    const correctLetters = item.order.map((o, p) => item.q.answer.includes(o) ? LETTERS[p] : null).filter(Boolean).join(', ');
    fb.innerHTML = '<strong>' + (ok ? '✓ Helyes válasz!' : '✗ Nem jó. Helyes: ' + correctLetters) + '</strong>' +
      (item.q.explanation ? fmt(item.q.explanation) : '') +
      (ok ? '' : sourceHtml(item.q));
    fb.hidden = false;
  }

  function toggleOption(orig, on) {
    const item = quiz.items[quiz.idx];
    if (quiz.mode === 'practice' && item.checked) return;
    if (item.q.type === 'multi') {
      item.sel = on ? [...new Set([...item.sel, orig])] : item.sel.filter(x => x !== orig);
    } else {
      item.sel = on ? [orig] : [];
    }
    [...$('#qOptions').children].forEach((lab, pos) => {
      lab.classList.toggle('selected', item.sel.includes(item.order[pos]));
    });
    updateButtons();
    if (quiz.mode === 'exam') {
      renderMap();
      const done = quiz.items.filter(i => i.sel.length).length;
      $('#progressBar').style.width = (done / quiz.items.length * 100) + '%';
      $('#qScore').textContent = 'Megválaszolva: ' + done + ' / ' + quiz.items.length;
    }
  }

  function updateButtons() {
    const item = quiz.items[quiz.idx];
    const last = quiz.idx === quiz.items.length - 1;
    const practice = quiz.mode === 'practice';
    $('#prevBtn').disabled = quiz.idx === 0;
    $('#checkBtn').hidden = !practice || item.checked;
    $('#checkBtn').disabled = !item.sel.length;
    $('#nextBtn').hidden = practice ? (!item.checked || last) : last;
    $('#submitBtn').hidden = practice ? !(item.checked && last) && quiz.items.filter(i => i.checked).length === 0 : false;
    $('#submitBtn').textContent = practice ? (last && item.checked ? 'Eredmény megtekintése' : 'Befejezés') : 'Beadás';
  }

  function renderMap() {
    const map = $('#qmap');
    map.innerHTML = '';
    quiz.items.forEach((it, i) => {
      const b = el('button', '', String(i + 1));
      b.type = 'button';
      if (quiz.mode === 'practice' && it.checked) b.classList.add(isCorrect(it) ? 'ok' : 'bad');
      else if (it.sel.length) b.classList.add('answered');
      if (i === quiz.idx) b.classList.add('current');
      b.addEventListener('click', () => go(i));
      map.appendChild(b);
    });
  }

  function go(i) {
    if (i < 0 || i >= quiz.items.length) return;
    quiz.idx = i;
    renderQuestion();
    $('.question-card').scrollIntoView({ block: 'nearest' });
  }

  function check() {
    const item = quiz.items[quiz.idx];
    if (quiz.mode !== 'practice' || item.checked || !item.sel.length) return;
    item.checked = true;
    recordStats([item]);
    renderQuestion();
  }

  function next() {
    const item = quiz.items[quiz.idx];
    if (quiz.mode === 'practice' && !item.checked) return;
    if (quiz.idx < quiz.items.length - 1) go(quiz.idx + 1);
  }

  function recordStats(items) {
    const stats = load(LS.stats, {});
    items.forEach(it => {
      const s = stats[it.q.id] || { seen: 0, wrong: 0 };
      const ok = isCorrect(it);
      s.seen++;
      if (!ok) s.wrong++;
      s.last = ok ? 'ok' : 'bad';
      stats[it.q.id] = s;
    });
    save(LS.stats, stats);
  }

  function finish() {
    if (!quiz || quiz.finished) return;
    if (quiz.timer) clearInterval(quiz.timer);
    quiz.finished = true;
    const counted = quiz.mode === 'practice' ? quiz.items.filter(i => i.checked) : quiz.items;
    if (quiz.mode === 'exam') recordStats(quiz.items);
    const correct = counted.filter(isCorrect).length;
    const total = counted.length;
    const pct = total ? Math.round(correct / total * 100) : 0;
    const duration = Math.round((Date.now() - quiz.start) / 1000);

    if (total) {
      const hist = load(LS.history, []);
      hist.unshift({ date: new Date().toISOString(), mode: quiz.mode, total, correct, pct, topics: quiz.topics, duration });
      save(LS.history, hist.slice(0, 50));
    }
    renderResult(counted, correct, total, pct, duration);
  }

  $('#prevBtn').addEventListener('click', () => go(quiz.idx - 1));
  $('#nextBtn').addEventListener('click', next);
  $('#checkBtn').addEventListener('click', check);
  $('#submitBtn').addEventListener('click', () => {
    if (quiz.mode === 'exam') {
      const empty = quiz.items.filter(i => !i.sel.length).length;
      if (empty && !confirm(empty + ' kérdés megválaszolatlan. Biztosan beadod?')) return;
    } else {
      const unchecked = quiz.items.filter(i => !i.checked).length;
      if (unchecked && !confirm('Még ' + unchecked + ' kérdés hátravan. Befejezed? Az értékelés csak a megválaszolt kérdésekre vonatkozik.')) return;
    }
    finish();
  });
  $('#quitBtn').addEventListener('click', () => {
    if (!confirm('Kilépsz? Az eddigi válaszok nem lesznek értékelve.')) return;
    if (quiz.timer) clearInterval(quiz.timer);
    quiz = null;
    renderStart();
  });

  document.addEventListener('keydown', e => {
    if (!quiz || quiz.finished || $('#screen-quiz').hidden) return;
    if (e.target.tagName === 'SELECT' || e.ctrlKey || e.metaKey || e.altKey) return;
    const item = quiz.items[quiz.idx];
    const k = e.key;
    if (/^[1-8]$/.test(k)) {
      const pos = parseInt(k, 10) - 1;
      if (pos < item.order.length) {
        const orig = item.order[pos];
        const on = item.q.type === 'multi' ? !item.sel.includes(orig) : true;
        const input = $('#qOptions').children[pos].querySelector('input');
        if (input.disabled) return;
        input.checked = on;
        toggleOption(orig, on);
      }
    } else if (k === 'Enter') {
      if (e.target.tagName === 'BUTTON') return;
      e.preventDefault();
      if (quiz.mode === 'practice') {
        if (!item.checked) check();
        else if (quiz.idx < quiz.items.length - 1) next();
        else finish();
      } else if (quiz.idx < quiz.items.length - 1) {
        go(quiz.idx + 1);
      }
    } else if (k === 'ArrowRight') {
      if (quiz.mode === 'exam' || item.checked) go(quiz.idx + 1);
    } else if (k === 'ArrowLeft') {
      go(quiz.idx - 1);
    }
  });

  // ---------- Result ----------
  let lastResult = null;

  function renderResult(items, correct, total, pct, duration) {
    lastResult = { items, setup: quiz.setup };
    const ring = $('#scoreRing');
    ring.style.setProperty('--p', pct);
    ring.style.setProperty('--c', pct >= 80 ? 'var(--ok)' : pct >= 60 ? 'var(--primary)' : 'var(--bad)');
    $('#scorePct').textContent = pct + '%';
    $('#resultTitle').textContent = !total ? 'Nem válaszoltál meg egy kérdést sem'
      : pct >= 90 ? 'Kiváló!' : pct >= 75 ? 'Szép eredmény!' : pct >= 60 ? 'Megfelelt – van még mit gyakorolni' : 'Gyakorolj még!';
    $('#resultSub').textContent = correct + ' helyes ' + total + ' kérdésből · ' +
      (quiz.mode === 'exam' ? 'Vizsga' : 'Gyakorló') + ' mód · ' + fmtTime(duration);

    const wrongCount = items.filter(i => !isCorrect(i)).length;
    $('#retryWrongBtn').hidden = wrongCount === 0;
    $('#retryWrongBtn').textContent = 'Hibásak újra (' + wrongCount + ')';

    // témakörönként
    const bd = $('#topicBreakdown');
    bd.innerHTML = '';
    const groups = {};
    items.forEach(it => {
      const g = groups[it.q.topic] || (groups[it.q.topic] = { ok: 0, n: 0, subs: {} });
      g.n++; if (isCorrect(it)) g.ok++;
      const sk = it.q.subtopic || '–';
      const s = g.subs[sk] || (g.subs[sk] = { ok: 0, n: 0 });
      s.n++; if (isCorrect(it)) s.ok++;
    });
    Object.entries(groups).forEach(([t, g]) => {
      bd.appendChild(bdRow('<strong>' + esc(TOPICS[t]) + '</strong>', g.ok, g.n));
      Object.entries(g.subs).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n).forEach(([s, v]) => {
        bd.appendChild(bdRow('<span class="muted">&nbsp;&nbsp;' + esc(s) + '</span>', v.ok, v.n));
      });
    });

    $('#onlyWrong').checked = wrongCount > 0 && wrongCount < items.length;
    renderReview();
    show('result');
  }

  function bdRow(label, ok, n) {
    const p = n ? Math.round(ok / n * 100) : 0;
    const row = el('div', 'bd-row');
    row.innerHTML = '<div>' + label + '</div><div class="bd-bar"><div style="width:' + p + '%"></div></div>' +
      '<div class="bd-val">' + ok + '/' + n + '</div>';
    return row;
  }

  function renderReview() {
    const box = $('#reviewList');
    box.innerHTML = '';
    const only = $('#onlyWrong').checked;
    lastResult.items.forEach((it, i) => {
      const ok = isCorrect(it);
      if (only && ok) return;
      const q = it.q;
      const div = el('div', 'review-item' + (ok ? '' : ' bad'));
      let html = '<div class="q-tags"><span class="tag">' + (i + 1) + '.</span><span class="tag tag-soft">' + esc(q.subtopic || TOPICS[q.topic]) + '</span>' +
        '<span class="badge ' + (ok ? 'badge-ok">Helyes' : 'badge-bad">' + (it.sel.length ? 'Hibás' : 'Nincs válasz')) + '</span></div>' +
        '<div class="q-text">' + fmt(q.question) + '</div>';
      if (q.code && q.code.src) html += '<pre class="code"><code>' + highlight(q.code.src, q.code.lang) + '</code></pre>';
      html += '<div class="options locked">';
      it.order.forEach((orig, pos) => {
        const isAns = q.answer.includes(orig), isSel = it.sel.includes(orig);
        const cls = isAns && isSel ? 'correct' : isAns ? 'correct missed' : isSel ? 'wrong' : '';
        const mark = isSel ? (isAns ? ' ✓' : ' ✗ (a te válaszod)') : (isAns ? ' ← helyes' : '');
        html += '<div class="option ' + cls + '"><span class="key">' + LETTERS[pos] + '</span><span class="txt">' + fmt(q.options[orig]) + '<strong>' + mark + '</strong></span></div>';
      });
      html += '</div>';
      if (q.explanation) html += '<div class="exp">💡 ' + fmt(q.explanation) + '</div>';
      if (!ok) html += sourceHtml(q);
      div.innerHTML = html;
      box.appendChild(div);
    });
    if (!box.children.length) box.innerHTML = '<p class="muted">Minden válasz helyes volt. 🎉</p>';
  }

  $('#onlyWrong').addEventListener('change', renderReview);
  $('#newQuizBtn').addEventListener('click', () => { quiz = null; renderStart(); });
  $('#retryWrongBtn').addEventListener('click', () => {
    const wrong = lastResult.items.filter(i => !isCorrect(i)).map(i => i.q);
    if (wrong.length) startQuiz(shuffle(wrong), lastResult.setup);
  });
  $('#homeLink').addEventListener('click', e => {
    e.preventDefault();
    if (quiz && !quiz.finished && !$('#screen-quiz').hidden) {
      if (!confirm('Kilépsz? Az eddigi válaszok nem lesznek értékelve.')) return;
      if (quiz.timer) clearInterval(quiz.timer);
    }
    quiz = null;
    renderStart();
  });

  window.addEventListener('beforeunload', e => {
    if (quiz && !quiz.finished && !$('#screen-quiz').hidden) { e.preventDefault(); e.returnValue = ''; }
  });

  renderStart();
})();
