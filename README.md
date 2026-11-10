# Tesztelő Gyakorló

Gyakorló és vizsga feladatsorok a **Junior automata tesztelő** tanfolyam elméleti anyagából.
Tiszta HTML + CSS + JavaScript, build lépés és függőség nélkül – közvetlenül feltölthető GitHub Pages-re.

## Funkciók

- **Gyakorló mód** – minden kérdés után azonnali visszajelzés és magyarázat.
- **Vizsga mód** – időkorlát (kérdésenként 45/60/90 mp), kérdéstérkép, értékelés a beadás után.
- **Témakörök**: Tesztautomatizálás · Webfejlesztés (HTML, CSS, JS) · Java alapok és OOP · Java haladó, Mockito, TDD.
- **Kérdéstípusok**: egyválaszos, többválaszos, igaz/hamis, kódrészlet-elemzés.
- **Kérdéskészlet**: összes / csak a legutóbb elrontott / csak a még nem látott kérdések.
- Eredmények témakörönként és altémánként, hibás kérdések újragyakorlása.
- Előzmények és kérdésstatisztika a böngésző `localStorage`-ában (nem kerül sehova).
- Világos / sötét téma, mobilbarát, billentyűzettel is kezelhető (`1`–`5`, `Enter`, `←` `→`).

## Felépítés

```
index.html        – oldal
css/style.css     – stílusok
js/app.js         – alkalmazáslogika
js/questions.js   – kérdésbank (window.QUESTIONS)
elmelet/          – tananyag PDF-ek (ezekre mutatnak a forrás-linkek)
.nojekyll         – GitHub Pages: Jekyll feldolgozás kikapcsolása
```

## Futtatás helyben

Az `index.html` dupla kattintással is megnyitható. Vagy helyi szerverrel:

```bash
python3 -m http.server 8000
```

majd: <http://localhost:8000>

## Közzététel GitHub Pages-en

1. Hozz létre egy új repót, és töltsd fel a mappa tartalmát (az `index.html` a repó gyökerébe kerüljön).
2. GitHub → **Settings → Pages** → *Build and deployment* → Source: **Deploy from a branch**, Branch: `main`, mappa: `/ (root)`.
3. Pár perc múlva elérhető: `https://<felhasználónév>.github.io/<repó-név>/`

## Kérdés hozzáadása / javítása

A `js/questions.js` minden sora egy kérdés:

```js
{
  "id": "java-056",                 // egyedi azonosító
  "topic": "java",                  // teszt | web | java | halado
  "subtopic": "Öröklődés",          // szabad szöveg, az eredménynél csoportosít
  "type": "single",                 // single | multi | truefalse
  "question": "Mit ír ki a program?",
  "code": { "lang": "java", "src": "int a = 7 / 2;\nSystem.out.println(a);" },  // opcionális
  "options": ["3", "3.5", "4", "Fordítási hiba"],
  "answer": [0],                    // a helyes opció(k) indexe, 0-tól
  "explanation": "Egész osztás: `7 / 2` eredménye 3.",
  "source": [{ "file": "JuniorJavaBackend_01.pdf", "page": 9 }]  // hol található a megoldás
}
```

- A kérdések kizárólag az `elmelet/` mappában lévő tananyag PDF-ekre épülnek.
- `source`: a PDF fájlneve (az `elmelet/` mappán belül) és az oldalszám (a PDF-nézőben látható oldalindex). Rossz válasznál az app ide linkel: `elmelet/<fájl>#page=<oldal>`.

- `truefalse` típusnál az `options` mindig `["Igaz", "Hamis"]`.
- A szövegben a `` `backtick` `` közé írt rész kódként jelenik meg.
