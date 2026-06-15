# Guía de Desarrollo

Widget React + TypeScript + MUI que muestra resultados de carreras desde la plataforma RaceResult 14.

---

## Requisitos previos

- Node.js 18+ y npm
- Una clave de API de solo lectura de RaceResult (en el software RaceResult bajo Ajustes > Claves API)

---

## Configuración inicial

```bash
cd scripts/search-race-results

# 1. Instalar dependencias
npm install

# 2. Crear el archivo de entorno local — nunca lo subas al repositorio
cp .env.local.example .env.local
# Edita .env.local y añade tu clave:
#   REACT_APP_RR_API_KEY=tu_clave_aqui
```

---

## Cómo funcionan los datos

Los resultados los descargas **tú una sola vez** (no los visitantes) y se guardan como archivos JSON estáticos.
Los visitantes leen esos archivos desde GitHub Pages — la API de RaceResult nunca se contacta en tiempo de ejecución.

```
npm run prefetch
  └─> public/race-data-index.json          (índice ligero ~2 KB — se carga siempre)
  └─> public/race-data-{eventId}.json      (resultados por evento — carga perezosa al seleccionar)
  └─> public/race-data-{eventId}_{fmt}.json  (cuando el evento tiene Individual + Parejas + Equipos)

npm run bundle
  └─> build/   (incluye todos los archivos anteriores + JS/CSS empaquetados en un único fichero)
```

El visitante solo descarga el índice al abrir la página (~2 KB). El archivo de resultados de un evento concreto (100–600 KB) solo se descarga cuando el usuario lo selecciona en el desplegable.

### Formatos automáticos (Individual / Parejas / Equipos)

El script lee los **contests** de cada evento vía `/_N/api/contests/get`. Si el nombre del contest contiene `pareja/duo/doble` → formato `pairs`; `equipo/team/relay/relevo` → `teams`; el resto → `individual`.

Si un evento tiene más de un formato distinto, se crea **una entrada separada** en el desplegable por formato (y un archivo de caché propio). Si todos los contests son del mismo formato, se usa una sola entrada combinada.

### Tiempos parciales

Si el evento tiene una lista llamada `*DETAIL LIST*` configurada en RaceResult, el script la descarga durante el prefetch y adjunta los tiempos parciales de cada participante directamente en el archivo de caché. La pantalla de detalle del atleta muestra entonces:

- **T. Parcial** — tiempo del sector individual (Carrera 1, Zona 1, etc.)
- **T. Acumulado** — tiempo desde la salida hasta ese punto

No se necesita ninguna petición extra al abrir el detalle.

---

## Desarrollo local

```bash
# Servidor con recarga en caliente
npm start
# -> http://localhost:3000

# Previsualizar la build de producción en local
npm run bundle
# Abrir test.html en el navegador
```

---

## Estructura del proyecto

```
scripts/
  prefetch-results.js        Descubre eventos, detecta formatos y guarda resultados
  bundle.js                  Empaqueta el widget en un único JS + inyecta CSS hardening

src/
  App.tsx                    Tema visual y ThemeProvider
  components/
    RaceResultsWidget.tsx    Orquestador principal (fases: búsqueda / resultados / detalle)
    SearchForm.tsx           Selector de evento + búsqueda por nombre
    Filters.tsx              Barra de filtros (categoría, grupo de edad, etc.)
    ResultsTable.tsx         Tabla de resultados ordenable y paginada
    AthleteDetail.tsx        Detalle del atleta con tiempos por sector
    CertificateGenerator.tsx Certificado de finisher en PDF/JPG
  hooks/
    useRaceResults.ts        Carga lazy de race-data-index.json + race-data-{key}.json
  lib/
    types.ts                 Interfaces TypeScript compartidas

public/
  race-data-index.json       Generado por prefetch. NO editar manualmente.
  race-data-*.json           Generados por prefetch. NO editar manualmente.

build/                       Salida de producción — desplegada en GitHub Pages.
```

---

## Variables de entorno

| Variable             | Requerida | Descripción                                          |
|----------------------|-----------|------------------------------------------------------|
| REACT_APP_RR_API_KEY | Sí        | Clave de API de solo lectura de RaceResult.          |

`.env.local` está en el `.gitignore`. Nunca subas tu clave de API al repositorio.
En GitHub Actions se configura como secret `RR_API_KEY` en la configuración del repositorio.
