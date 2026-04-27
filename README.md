# CIK Kriminal — statički sajt + Decap CMS

Ovo je početni paket za javni dokumentarni sajt sa 19 žalbenih navoda. Sajt nema bazu podataka i nema server-side CMS. Sadržaj se čuva u JSON fajlovima u Git repozitoriju, Decap CMS ih uređuje kroz `/admin`, a build skripta pravi statičke HTML stranice u `dist/`.

## Struktura

```text
admin/                  Decap CMS admin interfejs
assets/                 CSS, JS, logo i uploadovani fajlovi
content/site.json       osnovna podešavanja sajta
content/navodi/         19 žalbenih navoda
content/dokumenti/      žalba, odgovor organa i prilozi
content/vremenska-linija.json
scripts/build.js        generator statičkih stranica
scripts/serve.js        lokalni server za pregled sajta
dist/                   generisani sajt nakon npm run build
```

## Lokalno pokretanje

Treba ti Node.js 18 ili noviji.

```bash
npm run build
npm run serve
```

Zatim otvori:

```text
http://localhost:8080
```

## Lokalni Decap CMS režim

Za lokalno uređivanje kroz Decap, u jednom terminalu pokreni:

```bash
npx decap-server
```

U drugom terminalu pokreni sajt:

```bash
npm run build
npm run serve
```

Zatim otvori:

```text
http://localhost:8080/admin/
```

Napomena: nakon izmjene sadržaja kroz CMS lokalno, ponovo pokreni `npm run build` da se HTML stranice regenerišu.

## Objavljivanje na Netlify

Najjednostavniji put:

1. Napravi GitHub repozitorij i ubaci ovaj folder.
2. Na Netlify napravi novi site iz tog repozitorija.
3. Build command: `npm run build`.
4. Publish directory: `dist`.
5. U Netlify uključi Identity.
6. U Identity uključi Git Gateway.
7. Pozovi svoj e-mail kao korisnika.
8. Otvori `https://cikkriminal.com/admin/` i prijavi se.

`admin/config.yml` je već podešen na `git-gateway` i branch `main`.

## Prije javne objave

U `content/site.json` trenutno je postavljeno:

```json
"noindex": true
```

To znači da se u `dist/robots.txt` generiše zabrana indeksacije. Kada sajt bude spreman, promijeni na:

```json
"noindex": false
```

i ponovo pokreni build.

## Kako uređivati 19 navoda

Svaki navod je u `content/navodi/navod-XX.json`. Polja su:

- `broj` — redni broj navoda
- `title` — kratak naslov
- `slug` — URL dio, npr. `navod-01-nezakonito-stanje`
- `status` — nacrt, objavljeno, dopunjeno, čeka odgovor, sporno
- `kratki_sazetak` — jedna do dvije rečenice
- `zalba` — šta je navedeno u žalbi
- `odgovor_organa` — šta je organ odgovorio
- `istina` — dokumentovana analiza
- `zakljucak` — kratak zaključak
- `dokazi` — slike, strane i opisi dokaza

## Preporučeni stil pisanja

Bolje je pisati:

> Dokument X pokazuje da se organ nije očitovao o navodu Y.

nego:

> Oni su kriminalci i lažu.

Neka struktura bude mirna, dokazna i provjerljiva: žalba → odgovor organa → dokumenti → zaključak.

## Redakcija podataka

Prije objave dokumenata i slika ukloni sve što nije nužno za javno razumijevanje predmeta, posebno:

- JMBG,
- kućne adrese,
- privatne telefone i e-mailove,
- potpise ako nisu nužni,
- podatke maloljetnika,
- bankovne podatke,
- zdravstvene i porodične podatke,
- podatke trećih lica koji nisu bitni za dokazivanje navoda.

## Promjena domene i naziva

Uredi `content/site.json`:

```json
"domain": "https://cikkriminal.com",
"site_name": "CIK Kriminal"
```

Ako promijeniš domenu, uredi i `admin/config.yml` polja `site_url` i `display_url`.

## Upload slika i PDF dokumenata

Decap CMS slike i fajlove sprema u:

```text
assets/uploads/
```

Na stranici svakog navoda možeš dodati više dokaznih stavki. Za svaku stavi naslov, vrstu, dokument, stranu, sliku i objašnjenje.

## Šta je već napravljeno

- početna stranica,
- stranica O predmetu,
- pregled svih 19 navoda,
- pojedinačna stranica za svaki navod,
- dokazna galerija sa lightbox prikazom slika,
- dokumenti,
- vremenska linija,
- metodologija,
- pravo na odgovor,
- kontakt,
- Decap CMS konfiguracija,
- lokalni build i lokalni server,
- Netlify konfiguracija.
