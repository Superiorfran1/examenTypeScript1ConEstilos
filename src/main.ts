import './style.css'
import type { Generation, Tipo } from './type-Interface';

const URLBASE = "https://pokeapi.co/api/v2/type/";
const MAX_REINTENTOS = 3;
const ESPERA_ENTRE_REINTENTOS_MS = 1000;
const TIEMPO_LIMITE_MS = 3000;

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<header class="app-header">
  <a class="brand" href="#" aria-label="Pokédex, inicio">
    <span class="brand-mark" aria-hidden="true"><span></span></span>
    <span class="brand-copy"><strong>Pokédex</strong><span>Guía de tipos</span></span>
  </a>
  <button id="themeToggle" class="theme-toggle" type="button" aria-label="Activar modo oscuro" aria-pressed="false">
    <span class="theme-icon" aria-hidden="true">☾</span>
    <span class="theme-label">Modo oscuro</span>
  </button>
</header>
<section id="selector">
  <div class="hero-art" aria-hidden="true">
    <div class="hero-orbit hero-orbit-one"></div>
    <div class="hero-orbit hero-orbit-two"></div>
    <div class="hero-pokeball"><span></span></div>
    <span class="hero-spark hero-spark-one">✦</span>
    <span class="hero-spark hero-spark-two">✧</span>
  </div>
  <div class="section-heading">
    <span class="eyebrow"><span class="eyebrow-dot"></span> Tu próxima aventura empieza aquí</span>
    <h1>Encuentra tu equipo <span>Pokémon</span></h1>
    <p>Elige un tipo —o combina dos— y descubre quiénes comparten tu energía.</p>
  </div>
  <form id="typeForm">
    <div class="field-group">
      <label for="getType">Tipo de Pokémon</label>
      <select id="getType" name="getType" class="getType" required disabled>
        <option value="">Cargando tipos...</option>
      </select>
    </div>
    <div class="field-group">
      <label for="getSecondType">Segundo tipo <span>(opcional)</span></label>
      <select id="getSecondType" name="getSecondType" class="getType" disabled>
        <option value="">Ninguno</option>
      </select>
    </div>
    <button type="submit" class="getType search-button" disabled>Explorar Pokémon <span aria-hidden="true">→</span></button>
  </form>
  <p id="typeStatus" role="status" aria-live="polite"></p>
</section>
<section id="pokemonView">
  <div class="results-heading">
    <div>
      <span class="eyebrow">La Pokédex</span>
      <div class="results-title"><h2>Tu colección</h2><span id="pokemonCount" class="pokemon-count" aria-live="polite"></span></div>
    </div>
    <span class="results-mark" aria-hidden="true">✦</span>
  </div>
  <p id="pokemonStatus" role="status" aria-live="polite">Selecciona un tipo para ver sus Pokémon.</p>
  <form id="pokemonSearchForm" hidden>
    <label for="pokemonSearch">Busca en tu colección:</label>
    <div class="search-control">
      <span aria-hidden="true">⌕</span>
      <input id="pokemonSearch" name="pokemonSearch" type="search" placeholder="Por ejemplo, pikachu" required>
      <button type="submit" class="getType">Buscar</button>
    </div>
  </form>
  <p id="searchStatus" role="status" aria-live="polite"></p>
  <section id="weightHighlights" class="weight-highlights" aria-label="Pokémon con mayor y menor peso" hidden></section>
  <ul id="pokemonList"></ul>
</section>
`;
const themeToggle = document.querySelector<HTMLButtonElement>('#themeToggle')!;
const themeLabel = themeToggle.querySelector<HTMLSpanElement>('.theme-label')!;
const themeIcon = themeToggle.querySelector<HTMLSpanElement>('.theme-icon')!;
const savedTheme = localStorage.getItem('theme');
const initialTheme = savedTheme === 'light' || savedTheme === 'dark'
  ? savedTheme
  : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

function setTheme(theme: 'light' | 'dark'): void {
  const isDark = theme === 'dark';
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute('aria-pressed', String(isDark));
  themeToggle.setAttribute('aria-label', `Activar modo ${isDark ? 'claro' : 'oscuro'}`);
  themeLabel.textContent = `Modo ${isDark ? 'claro' : 'oscuro'}`;
  themeIcon.textContent = isDark ? '☀' : '☾';
  localStorage.setItem('theme', theme);
}

setTheme(initialTheme);
themeToggle.addEventListener('click', () => {
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});

const typeForm = document.querySelector<HTMLFormElement>('#typeForm')!;
const typeSelect = typeForm.querySelector<HTMLSelectElement>('select[name="getType"]')!;
const secondTypeSelect = typeForm.querySelector<HTMLSelectElement>('select[name="getSecondType"]')!;
const submitButton = typeForm.querySelector<HTMLButtonElement>('button[type="submit"]')!;
const pokemonStatus = document.querySelector<HTMLParagraphElement>('#pokemonStatus')!;
const pokemonList = document.querySelector<HTMLUListElement>('#pokemonList')!;
const typeStatus = document.querySelector<HTMLParagraphElement>('#typeStatus')!;
const pokemonSearchForm = document.querySelector<HTMLFormElement>('#pokemonSearchForm')!;
const pokemonSearchInput = pokemonSearchForm.querySelector<HTMLInputElement>('input[name="pokemonSearch"]')!;
const searchStatus = document.querySelector<HTMLParagraphElement>('#searchStatus')!;
const pokemonCount = document.querySelector<HTMLSpanElement>('#pokemonCount')!;
const weightHighlights = document.querySelector<HTMLElement>('#weightHighlights')!;
type PokemonCardData = { name: string; id: number; weight: number };
let loadedPokemon: PokemonCardData[] = [];

class TimeoutError extends Error {}

async function peticionConTimeout<T>(url: string, tiempo: number): Promise<T> {
  if (!Number.isFinite(tiempo) || tiempo <= 0) {
    throw new RangeError('El tiempo límite debe ser un número positivo.');
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), tiempo);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`La API respondió con el estado ${response.status}.`);
    }

    return await response.json() as T;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new TimeoutError(`La petición tardó más de ${tiempo / 1000} segundos y fue cancelada.`);
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function peticionConReintento<T>(
  url: string,
): Promise<T> {
  for (let intento = 0; intento <= MAX_REINTENTOS; intento++) {
    try {
      return await peticionConTimeout<T>(url, TIEMPO_LIMITE_MS);
    } catch (error) {
      if (error instanceof TimeoutError || intento === MAX_REINTENTOS) {
        throw error;
      }

      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, ESPERA_ENTRE_REINTENTOS_MS);
      });
    }
  }

  throw new Error('No se pudo completar la petición.');
}

function showPokemon(pokemon: PokemonCardData[]): void {
  const items = pokemon.map(({ name, id }) => {
    const item = document.createElement('li');
    item.className = 'pokemon-card';

    const artwork = document.createElement('div');
    artwork.className = 'pokemon-artwork';

    const image = document.createElement('img');
    image.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
    image.alt = `Ilustración de ${name}`;
    image.loading = 'lazy';
    image.decoding = 'async';
    artwork.append(image);

    const details = document.createElement('div');
    details.className = 'pokemon-details';

    const number = document.createElement('span');
    number.className = 'pokemon-number';
    number.textContent = `N.º ${String(id).padStart(3, '0')}`;

    const pokemonName = document.createElement('span');
    pokemonName.className = 'pokemon-name';
    pokemonName.textContent = name.replaceAll('-', ' ');

    details.append(number, pokemonName);
    item.append(artwork, details);
    return item;
  });
  pokemonList.replaceChildren(...items);
  pokemonCount.textContent = String(pokemon.length);
}

function showWeightHighlights(pokemon: PokemonCardData[]): void {
  const heaviest = pokemon.reduce((current, entry) => entry.weight > current.weight ? entry : current);
  const lightest = pokemon.reduce((current, entry) => entry.weight < current.weight ? entry : current);
  const formatWeight = (weight: number): string =>
    `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(weight / 10)} kg`;

  const heading = document.createElement('h3');
  heading.className = 'weight-highlights-title';
  heading.textContent = 'Extremos de peso';

  const cards = [
    { label: 'Mayor peso', pokemon: heaviest, icon: '↑', className: 'heaviest' },
    { label: 'Menor peso', pokemon: lightest, icon: '↓', className: 'lightest' },
  ].map(({ label, pokemon: entry, icon, className }) => {
    const card = document.createElement('article');
    card.className = `weight-card ${className}`;

    const iconElement = document.createElement('span');
    iconElement.className = 'weight-icon';
    iconElement.setAttribute('aria-hidden', 'true');
    iconElement.textContent = icon;

    const details = document.createElement('div');
    details.className = 'weight-details';

    const description = document.createElement('span');
    description.className = 'weight-label';
    description.textContent = label;

    const name = document.createElement('strong');
    name.className = 'weight-name';
    name.textContent = entry.name.replaceAll('-', ' ');

    const value = document.createElement('span');
    value.className = 'weight-value';
    value.textContent = formatWeight(entry.weight);

    details.append(description, name, value);
    card.append(iconElement, details);
    return card;
  });

  weightHighlights.replaceChildren(heading, ...cards);
  weightHighlights.hidden = false;
}

async function loadTypes(): Promise<void> {
  try {
    const data = await peticionConReintento<{ results: Generation[] }>(URLBASE);
    const options = data.results.map(({ name, url }) => {
      const idMatch = url.match(/\/type\/(\d+)\/?$/);
      if (!idMatch) {
        throw new Error(`No se pudo obtener el ID del tipo "${name}".`);
      }

      const option = document.createElement('option');
      option.value = idMatch[1];
      option.textContent = name;
      return option;
    });

    typeSelect.replaceChildren(new Option('Selecciona un tipo', ''), ...options);
    secondTypeSelect.replaceChildren(
      new Option('Ninguno', ''),
      ...options.map((option) => option.cloneNode(true) as HTMLOptionElement),
    );
    typeSelect.disabled = false;
    secondTypeSelect.disabled = false;
    submitButton.disabled = false;
    typeStatus.textContent = '';
    typeStatus.classList.remove('error-status');
  } catch (error) {
    console.error('Error al cargar los tipos de Pokémon:', error);
    typeSelect.replaceChildren(new Option('No se pudieron cargar los tipos', ''));
    typeStatus.textContent = error instanceof Error
      ? `No se pudieron cargar los tipos: ${error.message}`
      : 'No se pudieron cargar los tipos.';
    typeStatus.classList.add('error-status');
  }
}
function updateTypeOptions(): void {
  const selectedTypeIds = [typeSelect.value, secondTypeSelect.value];
  [typeSelect, secondTypeSelect].forEach((select, index) => {
    const otherTypeId = selectedTypeIds[index === 0 ? 1 : 0];
    Array.from(select.options).forEach((option) => {
      option.disabled = option.value !== '' && option.value === otherTypeId;
    });
  });
}

async function getPokemon(types: { id: number; name: string }[]): Promise<void> {
  loadedPokemon = [];
  pokemonList.replaceChildren();
  pokemonCount.textContent = '';
  weightHighlights.hidden = true;
  weightHighlights.replaceChildren();
  pokemonSearchForm.hidden = true;
  pokemonSearchInput.value = '';
  searchStatus.textContent = '';
  pokemonStatus.classList.remove('error-status');
  pokemonStatus.textContent = 'Cargando Pokémon...';

  try {
    const pokemonByType = await Promise.all(types.map(async ({ id }) => {
      const data = await peticionConReintento<Tipo>(`${URLBASE}${id}`);
      return data.pokemon.map(({ pokemon }) => {
        const idMatch = pokemon.url.match(/\/pokemon\/(\d+)\/?$/);
        if (!idMatch) {
          throw new Error(`No se pudo obtener el ID de "${pokemon.name}".`);
        }

        return { name: pokemon.name, id: Number(idMatch[1]), url: pokemon.url };
      });
    }));
    const pokemonReferences = [...new Map(pokemonByType.flat().map((entry) => [entry.id, entry])).values()];
    const typeNames = types.map(({ name }) => `"${name}"`).join(' o ');

    if (pokemonReferences.length === 0) {
      pokemonStatus.textContent = `No se encontraron Pokémon del tipo ${typeNames}.`;
      return;
    }

    pokemonStatus.textContent = 'Calculando los pesos de los Pokémon...';
    const pokemon: PokemonCardData[] = new Array(pokemonReferences.length);
    let nextPokemonIndex = 0;
    const loadWeight = async (): Promise<void> => {
      while (nextPokemonIndex < pokemonReferences.length) {
        const index = nextPokemonIndex++;
        const reference = pokemonReferences[index];
        const details = await peticionConReintento<{ weight: number }>(reference.url);
        if (!Number.isFinite(details.weight) || details.weight < 0) {
          throw new Error(`No se pudo obtener un peso válido para "${reference.name}".`);
        }

        pokemon[index] = { name: reference.name, id: reference.id, weight: details.weight };
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(8, pokemonReferences.length) }, () => loadWeight()),
    );

    loadedPokemon = pokemon;
    pokemonStatus.textContent = `Pokémon de tipo ${typeNames}:`;
    showWeightHighlights(pokemon);
    showPokemon(pokemon);
    pokemonSearchForm.hidden = false;
  } catch (error) {
    console.error('Error al cargar los Pokémon:', error);
    pokemonStatus.textContent = error instanceof Error
      ? `No se pudieron cargar los Pokémon: ${error.message}`
      : 'No se pudieron cargar los Pokémon.';
    pokemonStatus.classList.add('error-status');
  }
}

pokemonSearchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = pokemonSearchInput.value.trim().toLocaleLowerCase();
  if (!query) {
    return;
  }

  const matches = loadedPokemon.filter(({ name }) => name.toLocaleLowerCase().includes(query));
  showPokemon(matches);
  searchStatus.textContent = matches.length > 0
    ? `Se encontraron ${matches.length} Pokémon.`
    : `No se encontraron Pokémon que coincidan con "${pokemonSearchInput.value.trim()}".`;
});
typeForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const selectedTypes = [typeSelect, secondTypeSelect]
    .filter((select) => select.value !== '')
    .map((select) => ({
      id: Number(select.value),
      name: select.selectedOptions[0]?.textContent ?? '',
    }));
  if (
    selectedTypes.length > 0 &&
    selectedTypes.every(({ id, name }) => Number.isInteger(id) && id > 0 && name)
  ) {
    void getPokemon(selectedTypes);
  }
});

typeSelect.addEventListener('change', updateTypeOptions);
secondTypeSelect.addEventListener('change', updateTypeOptions);

void loadTypes();