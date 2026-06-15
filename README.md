# Widget de Resultados de Carrera — Guía de Desarrollo

Widget React + TypeScript + MUI que muestra resultados de carreras desde la plataforma RaceResult 14, integrado dentro de una página de WordPress.

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
Los visitantes leen esos archivos desde tu propio servidor — la API de RaceResult nunca se contacta en tiempo de ejecución.

```
npm run prefetch
  └─> public/race-data-index.json          (índice ligero ~2 KB — se carga siempre)
  └─> public/race-data-{eventId}.json      (resultados por evento — carga perezosa al seleccionar)
  └─> public/race-data-{eventId}_{fmt}.json  (cuando el evento tiene Individual + Parejas + Equipos)

npm run build
  └─> build/   (incluye todos los archivos anteriores + JS/CSS empaquetados)
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

## Añadir una carrera nueva (o actualizar resultados)

No se necesita ningún cambio en el código. El script de prefetch **descubre automáticamente** todos los eventos a los que tu clave de API tiene acceso, detecta los formatos y descarga los tiempos parciales si están disponibles.

El único ajuste que puede interesarte modificar es `LIST_PATTERN` al inicio de `scripts/prefetch-results.js`. Controla qué prefijo de lista de resultados usar (por defecto: `Resultados`). El script elige la primera lista cuyo nombre empiece por ese texto y contenga `01.` o `LIVE`.

---

## Flujo de despliegue

Ejecuta estos pasos cada vez que quieras actualizar los resultados (por ejemplo, tras terminar una carrera):

```bash
# Paso 1 — Descargar todos los resultados (descubre los eventos automáticamente, se ejecuta en tu máquina)
npm run prefetch

# Paso 2 — Compilar (incluye los datos descargados en la carpeta de salida)
npm run build

# Paso 3 — Subir el contenido de build/ al servidor de WordPress
# Sustituye los archivos anteriores. Todo lo que necesita el navegador está dentro de build/.
```

---

## Desarrollo local

```bash
# Servidor con recarga en caliente (usa la API en vivo, ignora race-data.json)
npm start
# -> http://localhost:3000

# Previsualizar la build de producción en local
npm run build
cd build
npx serve . -l 4000
# -> http://localhost:4000/test.html
```

---

## Estructura del proyecto

```
scripts/
  prefetch-results.js        Descubre eventos, detecta formatos y guarda resultados
                             -> public/race-data-index.json
                             -> public/race-data-{key}.json  (uno por evento/formato)

src/
  App.tsx                    Solo el tema visual — no requiere configuración de eventos
  components/
    RaceResultsWidget.tsx    Orquestador principal (fases: búsqueda / resultados / detalle)
    SearchForm.tsx           Selector de evento (con chip Individual/Parejas/Equipos) + búsqueda
    Filters.tsx              Barra de filtros (género, categoría, grupo de edad, etc.)
    ResultsTable.tsx         Tabla de resultados ordenable y paginada
    AthleteDetail.tsx        Página de detalle: info + tiempos parciales (T. Parcial / T. Acumulado)
    AthleteModal.tsx         Modal alternativo de detalle (misma información, formato diálogo)
    CertificateGenerator.tsx Certificado de finisher en PDF / JPG (generado en el cliente)
  hooks/
    useRaceResults.ts        Carga de datos: lee race-data-index.json + race-data-{key}.json lazy
  lib/
    raceResultApi.ts         Cliente de la API RaceResult 14 (login, descarga de listas)
    types.ts                 Interfaces TypeScript compartidas (Athlete, Split, EventInfo…)
    mockData.ts              Atletas de prueba para desarrollo sin clave de API

public/
  race-data-index.json       Generado por prefetch. Índice ligero (~2 KB). NO editar manualmente.
  race-data-*.json           Generados por prefetch. Resultados por evento. NO editar manualmente.

build/                       Salida de producción. Despliega esta carpeta en WordPress.
```

---

## Variables de entorno

| Variable                  | Requerida | Descripción                                                    |
|---------------------------|-----------|----------------------------------------------------------------|
| REACT_APP_RR_API_KEY      | Sí        | Clave de API de solo lectura de RaceResult. Solo en .env.local.|

`.env.local` está en el `.gitignore`. Nunca subas tu clave de API al repositorio.