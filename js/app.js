/* ============================================================
   TMDB API helper
   ============================================================ */
const TMDB = (() => {
  const DEFAULT_KEY = '8265bd1679663a7ea12ac168da84d2e8';
  const BASE = 'https://api.themoviedb.org/3';
  const IMG = 'https://image.tmdb.org/t/p';
  function key() { return localStorage.getItem('tmdb_key') || DEFAULT_KEY; }
  function setKey(k) { if (k && k.trim()) localStorage.setItem('tmdb_key', k.trim()); else localStorage.removeItem('tmdb_key'); }
  const apiCache = new Map();
  async function api(path, params = {}) {
    const url = new URL(BASE + path);
    url.searchParams.set('api_key', key());
    url.searchParams.set('language', 'en-US');
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v); });
    const cacheKey = url.toString();
    if (apiCache.has(cacheKey)) return apiCache.get(cacheKey);

    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('TMDB request failed: ' + res.status);
        const data = await res.json();
        if (apiCache.size > 300) {
          const firstKey = apiCache.keys().next().value;
          apiCache.delete(firstKey);
        }
        apiCache.set(cacheKey, data);
        return data;
      } catch (e) {
        lastErr = e;
        if (attempt < 2) await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
      }
    }
    throw lastErr;
  }
  const poster = (p, size = 'w500') => p ? `${IMG}/${size}${p}` : null;
  const backdrop = (p, size = 'w1280') => p ? `${IMG}/${size}${p}` : null;
  const profile = (p, size = 'w185') => p ? `${IMG}/${size}${p}` : null;
  const trending = (media = 'all', window = 'week') => api(`/trending/${media}/${window}`);
  const popularMovies = (page = 1) => api('/movie/popular', { page });
  const topRatedMovies = (page = 1) => api('/movie/top_rated', { page });
  const nowPlaying = (page = 1) => api('/movie/now_playing', { page });
  const upcoming = (page = 1) => api('/movie/upcoming', { page });
  const popularTV = (page = 1) => api('/tv/popular', { page });
  const topRatedTV = (page = 1) => api('/tv/top_rated', { page });
  const airingTV = (page = 1) => api('/tv/on_the_air', { page });
  const byGenre = (media, genreId, page = 1) => api(`/discover/${media}`, { with_genres: genreId, sort_by: 'popularity.desc', page });
  const searchMulti = (q, page = 1) => api('/search/multi', { query: q, page });
  const movieDetails = (id) => api(`/movie/${id}`, { append_to_response: 'credits,videos,recommendations,images' });
  const tvDetails = (id) => api(`/tv/${id}`, { append_to_response: 'credits,videos,recommendations,images,external_ids' });
  const seasonDetails = (id, season) => api(`/tv/${id}/season/${season}`);
  const externalIds = (media, id) => api(`/${media}/${id}/external_ids`);
  const videos = (media, id) => api(`/${media}/${id}/videos`);
  // Popular anime discovery via TMDB (genre 16 Animation + Japanese origin)
  const popularAnime = (page = 1) => api('/discover/tv', { with_genres: 16, with_origin_country: 'JP', sort_by: 'popularity.desc', page });
  const topRatedAnime = (page = 1) => api('/discover/tv', { with_genres: 16, with_origin_country: 'JP', sort_by: 'vote_average.desc', 'vote_count.gte': 200, page });
  const airingAnime = (page = 1) => api('/discover/tv', { with_genres: 16, with_origin_country: 'JP', sort_by: 'popularity.desc', 'air_date.gte': new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10), page });
  const GENRES = {
    movie: { 28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',99:'Documentary',18:'Drama',10751:'Family',14:'Fantasy',36:'History',27:'Horror',10402:'Music',9648:'Mystery',10749:'Romance',878:'Sci-Fi',53:'Thriller',10752:'War',37:'Western' },
    tv: { 10759:'Action & Adventure',16:'Animation',35:'Comedy',80:'Crime',99:'Documentary',18:'Drama',10751:'Family',10765:'Sci-Fi & Fantasy',9648:'Mystery',10764:'Reality',10768:'War & Politics' }
  };
  const getProviderContent = async (providerId) => {
    try {
      const [mRes, tRes] = await Promise.all([
        api('/discover/movie', { with_watch_providers: providerId, watch_region: 'US', sort_by: 'popularity.desc' }),
        api('/discover/tv', { with_watch_providers: providerId, watch_region: 'US', sort_by: 'popularity.desc' })
      ]);
      const movies = (mRes.results || []).map(x => ({ ...x, media_type: 'movie' }));
      const tvs = (tRes.results || []).map(x => ({ ...x, media_type: 'tv' }));
      const combined = [];
      const max = Math.max(movies.length, tvs.length);
      for (let i = 0; i < max; i++) {
        if (movies[i]) combined.push(movies[i]);
        if (tvs[i]) combined.push(tvs[i]);
      }
      return { results: combined };
    } catch (e) {
      return api('/discover/movie', { with_watch_providers: providerId, watch_region: 'US', sort_by: 'popularity.desc' });
    }
  };
  const recentlyAdded = async (page = 1) => {
    try {
      const [mRes, tRes] = await Promise.all([
        api('/discover/movie', { sort_by: 'primary_release_date.desc', 'vote_count.gte': 50, page }),
        api('/discover/tv', { sort_by: 'first_air_date.desc', 'vote_count.gte': 30, page })
      ]);
      const movies = (mRes.results || []).map(x => ({ ...x, media_type: 'movie' }));
      const tvs = (tRes.results || []).map(x => ({ ...x, media_type: 'tv' }));
      const combined = [];
      const max = Math.max(movies.length, tvs.length);
      for (let i = 0; i < max; i++) {
        if (movies[i]) combined.push(movies[i]);
        if (tvs[i]) combined.push(tvs[i]);
      }
      return { results: combined };
    } catch (e) {
      return nowPlaying(page);
    }
  };
  return { key, setKey, DEFAULT_KEY, poster, backdrop, profile, trending, popularMovies, topRatedMovies, nowPlaying, upcoming, popularTV, topRatedTV, airingTV, byGenre, searchMulti, movieDetails, tvDetails, seasonDetails, externalIds, videos, popularAnime, topRatedAnime, airingAnime, recentlyAdded, getProviderContent, GENRES };
})();

/* ============================================================
   Streaming source providers
   -----------------------------------------------------------
   Two families of embed providers:
   1. TMDB-based providers (movies + TV via {tmdb}/{season}/{episode})
   2. MegaPlay / Anikoto anime providers (by MAL / AniList / catalog id)

   Press 1..N while watching to switch the active server.
   ============================================================ */
const PROVIDERS = [
  /* ---------------- RECOMMENDED SERVERS (Top 5) ---------------- */
  { id:'vidking', name:'VidKing', recommended: true, badge:'Fast · Default', build({type,tmdb,season,episode,opt}) {
      let base = type==='movie' ? `https://www.vidking.net/embed/movie/${tmdb}` : `https://www.vidking.net/embed/tv/${tmdb}/${season}/${episode}`;
      const p = new URLSearchParams();
      if (opt && opt.color) p.set('color', opt.color);
      p.set('autoPlay', opt && opt.autoplay === false ? 'false' : 'true');
      if (type==='tv') { p.set('nextEpisode','true'); p.set('episodeSelector','true'); }
      const qs = p.toString(); return qs ? `${base}?${qs}` : base;
  }},
  { id:'111movies', name:'111Movies', recommended: true, badge:'Ad-Free & Fast', build({type,tmdb,season,episode}) {
      return type==='movie' ? `https://111movies.com/movie/${tmdb}` : `https://111movies.com/tv/${tmdb}/${season}/${episode}`;
  }},
  { id:'vidlinkpro', name:'VidLink Pro', recommended: true, badge:'Ad-Free', build({type,tmdb,season,episode,opt}) {
      let base = type==='movie' ? `https://vidlink.pro/movie/${tmdb}` : `https://vidlink.pro/tv/${tmdb}/${season}/${episode}`;
      const p = new URLSearchParams();
      if (opt && opt.color) p.set('primaryColor', opt.color);
      p.set('autoplay', opt && opt.autoplay === false ? 'false' : 'true');
      if (type==='tv') p.set('nextbutton','true');
      const qs = p.toString(); return qs ? `${base}?${qs}` : base;
  }},
  { id:'videasy', name:'Videasy', recommended: true, badge:'Ad-Free & Great UI', build({type,tmdb,season,episode,opt}) {
      let base = type==='movie' ? `https://player.videasy.net/movie/${tmdb}` : `https://player.videasy.net/tv/${tmdb}/${season}/${episode}`;
      const p = new URLSearchParams();
      if (opt && opt.color) p.set('color', opt.color);
      if (type==='tv') p.set('nextEpisode','true');
      const qs = p.toString(); return qs ? `${base}?${qs}` : base;
  }},
  { id:'vidfast', name:'Vidfast', recommended: true, badge:'Fast & HD', build({type,tmdb,season,episode,opt}) {
      let base = type==='movie' ? `https://vidfast.pro/movie/${tmdb}` : `https://vidfast.pro/tv/${tmdb}/${season}/${episode}`;
      const p = new URLSearchParams();
      if (opt && opt.color) p.set('theme', opt.color);
      p.set('autoPlay', opt && opt.autoplay === false ? 'false' : 'true');
      if (type==='tv') p.set('nextButton','true');
      const qs = p.toString(); return qs ? `${base}?${qs}` : base;
  }},

  /* ---------------- BACKUP SERVERS (Ordered) ---------------- */
  { id:'vidsrcto', name:'VidSrc.to', recommended: false, badge:'Alt Endpoint · Subs', build({type,tmdb,season,episode}) {
      return type==='movie' ? `https://vidsrc.to/embed/movie/${tmdb}` : `https://vidsrc.to/embed/tv/${tmdb}/${season}/${episode}`;
  }},
  { id:'vidbinge', name:'VidBinge', recommended: false, badge:'4K Sources', build({type,tmdb,season,episode}) {
      return type==='movie' ? `https://vidbinge.dev/embed/movie/${tmdb}` : `https://vidbinge.dev/embed/tv/${tmdb}/${season}/${episode}`;
  }},
  { id:'embedsu', name:'Embed.su', recommended: false, badge:'Great Uptime', build({type,tmdb,season,episode}) {
      return type==='movie' ? `https://embed.su/embed/movie/${tmdb}` : `https://embed.su/embed/tv/${tmdb}/${season}/${episode}`;
  }},
  { id:'superembed', name:'SuperEmbed', recommended: false, badge:'Multi-Server Balancing', build({type,tmdb,season,episode}) {
      return type==='movie' ? `https://multiembed.mov/?video_id=${tmdb}&tmdb=1` : `https://multiembed.mov/?video_id=${tmdb}&tmdb=1&s=${season}&e=${episode}`;
  }},
  { id:'smashystream', name:'SmashyStream', recommended: false, badge:'Multi-Source', build({type,tmdb,season,episode}) {
      return type==='movie' ? `https://embed.smashystream.com/playere.php?tmdb=${tmdb}` : `https://embed.smashystream.com/playere.php?tmdb=${tmdb}&season=${season}&episode=${episode}`;
  }},
  { id:'spencerdevs', name:'SpenceDevs', recommended: false, badge:'Ad-Free', build({type,tmdb,season,episode}) {
      return type==='movie' ? `https://spencerdevs.xyz/movie/${tmdb}` : `https://spencerdevs.xyz/tv/${tmdb}/${season}/${episode}`;
  }},
  { id:'rivestream', name:'RiveStream', recommended: false, badge:'Multi-Provider', build({type,tmdb,season,episode}) {
      return type==='movie' ? `https://rivestream.live/embed?type=movie&id=${tmdb}` : `https://rivestream.live/embed?type=tv&id=${tmdb}&season=${season}&episode=${episode}`;
  }},
  { id:'moviesapi', name:'MoviesAPI', recommended: false, badge:'Backup · HD', build({type,tmdb,season,episode}) {
      return type==='movie' ? `https://moviesapi.club/movie/${tmdb}` : `https://moviesapi.club/tv/${tmdb}-${season}-${episode}`;
  }},
  { id:'autoembed', name:'AutoEmbed', recommended: false, badge:'Multi-Language', build({type,tmdb,season,episode}) {
      return type==='movie' ? `https://player.autoembed.cc/embed/movie/${tmdb}` : `https://player.autoembed.cc/embed/tv/${tmdb}/${season}/${episode}`;
  }},
  { id:'vidsrcme', name:'VidSrc.me', recommended: false, badge:'Classic · Wide DB', build({type,tmdb,season,episode}) {
      return type==='movie' ? `https://vidsrc.me/embed/movie?tmdb=${tmdb}` : `https://vidsrc.me/embed/tv?tmdb=${tmdb}&season=${season}&episode=${episode}`;
  }},
  { id:'vidsrcxyz', name:'VidSrc.xyz', recommended: false, badge:'Mirror · Wide DB', build({type,tmdb,season,episode}) {
      return type==='movie' ? `https://vidsrc.xyz/embed/movie?tmdb=${tmdb}` : `https://vidsrc.xyz/embed/tv?tmdb=${tmdb}&season=${season}&episode=${episode}`;
  }},
  { id:'vidsrcvip', name:'VidSrc.vip', recommended: false, badge:'HD · Fast', build({type,tmdb,season,episode}) {
      return type==='movie' ? `https://vidsrc.vip/embed/movie/${tmdb}` : `https://vidsrc.vip/embed/tv/${tmdb}/${season}/${episode}`;
  }},
  { id:'vidsrcpro', name:'VidSrc.pro', recommended: false, badge:'Alt Mirror', build({type,tmdb,season,episode}) {
      return type==='movie' ? `https://vidsrc.pro/embed/movie/${tmdb}` : `https://vidsrc.pro/embed/tv/${tmdb}/${season}/${episode}`;
  }},
  { id:'twoembed', name:'2Embed', recommended: false, badge:'Backup', build({type,tmdb,season,episode}) {
      return type==='movie' ? `https://www.2embed.cc/embed/${tmdb}` : `https://www.2embed.cc/embedtv/${tmdb}&s=${season}&e=${episode}`;
  }},
  { id:'cinescrape', name:'2Embed.skin', recommended: false, badge:'Legacy Mirror', build({type,tmdb,season,episode}) {
      return type==='movie' ? `https://2embed.skin/embed/${tmdb}` : `https://2embed.skin/embedtv/${tmdb}&s=${season}&e=${episode}`;
  }},
  { id:'vidsrccc', name:'VidSrc.cc', recommended: false, badge:'HD', build({type,tmdb,season,episode,opt}) {
      let base = type==='movie' ? `https://vidsrc.cc/v2/embed/movie/${tmdb}` : `https://vidsrc.cc/v2/embed/tv/${tmdb}/${season}/${episode}`;
      return base + (opt && opt.autoplay === false ? '?autoPlay=false' : '?autoPlay=true');
  }},
  { id:'nontongo', name:'NontonGo', recommended: false, badge:'Backup', build({type,tmdb,season,episode}) {
      return type==='movie' ? `https://www.NontonGo.win/embed/movie/${tmdb}` : `https://www.NontonGo.win/embed/tv/${tmdb}/${season}/${episode}`;
  }}
];

/* ============================================================
   ANIME providers — MegaPlay + Anikoto (HiAnime library)
   Uses MAL / AniList ids from TMDB external_ids, plus catalog ids.
   These are used on the Anime watch flow (episode-number based).
   ============================================================ */
const ANIME_API_BASE = 'https://anikotoapi.site';
const ANIME_PROVIDERS = [
  { id:'megaplay-mal', name:'MegaPlay (MAL)', badge:'MAL ID', build({malId, epNum, lang}) {
      return `https://megaplay.buzz/stream/mal/${malId}/${epNum}/${lang || 'sub'}`;
  }},
  { id:'megaplay-ani', name:'MegaPlay (AniList)', badge:'AniList ID', build({anilistId, epNum, lang}) {
      return `https://megaplay.buzz/stream/ani/${anilistId}/${epNum}/${lang || 'sub'}`;
  }},
  { id:'megaplay-s2', name:'MegaPlay (Catalog)', badge:'Catalog ID', build({embedId, lang}) {
      return `https://megaplay.buzz/stream/s-2/${embedId}/${lang || 'sub'}`;
  }}
];

function getProvider(id) { return PROVIDERS.find(p => p.id === id) || PROVIDERS[0]; }
function getAnimeProvider(id) { return ANIME_PROVIDERS.find(p => p.id === id) || ANIME_PROVIDERS[0]; }

/* ============================================================
   Anikoto anime catalog API helper (MegaPlay docs)
   ============================================================ */
const Anime = (() => {
  const cache = new Map();
  async function req(path) {
    if (cache.has(path)) return cache.get(path);
    let lastErr;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(ANIME_API_BASE + path);
        if (!res.ok) throw new Error('Anikoto request failed: ' + res.status);
        const data = await res.json();
        cache.set(path, data);
        return data;
      } catch (e) { lastErr = e; if (attempt < 1) await new Promise(r => setTimeout(r, 400)); }
    }
    throw lastErr;
  }
  const recent = (page = 1, perPage = 24) => req(`/recent-anime?page=${page}&per_page=${perPage}`);
  const series = (id) => req(`/series/${encodeURIComponent(id)}`);
  return { recent, series };
})();

/* ============================================================
   Settings + History
   ============================================================ */
const Settings = (() => {
  const KEY = 'Urnperiodic_settings';
  const DEFAULTS = { color:'e50914', autoplay:true, muted:false, defaultProvider:'vidking', animeProvider:'megaplay-mal', animeLang:'sub' };
  function get() { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEFAULTS }; } }
  function save(s) { localStorage.setItem(KEY, JSON.stringify({ ...get(), ...s })); applyTheme(); }
  function applyTheme() {
    const s = get();
    document.documentElement.style.setProperty('--accent', '#' + s.color);
    const r = parseInt(s.color.slice(0,2),16), g = parseInt(s.color.slice(2,4),16), b = parseInt(s.color.slice(4,6),16);
    document.documentElement.style.setProperty('--accent-soft', `rgba(${r},${g},${b},0.15)`);
  }
  return { get, save, applyTheme, DEFAULTS };
})();

const SWATCHES = ['e50914','ff6b00','f5a623','46d369','00b4d8','4361ee','9146ff','e91e63','ffffff'];

const History = (() => {
  const KEY = 'Urnperiodic_history';
  function all() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
  function save(list) { localStorage.setItem(KEY, JSON.stringify(list.slice(0,60))); }
  function record(item) {
    const list = all();
    const idx = list.findIndex(x => x.id == item.id && x.type === item.type);
    const entry = { ...item, updated: Date.now() };
    if (idx >= 0) list[idx] = { ...list[idx], ...entry }; else list.unshift(entry);
    list.sort((a,b) => b.updated - a.updated); save(list);
  }
  function get(id, type) { return all().find(x => x.id == id && x.type === type); }
  function clear() { localStorage.removeItem(KEY); }
  return { all, record, get, clear };
})();
Settings.applyTheme();

function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- Custom Dropdown Helper ---------- */
function createCustomDropdown({ container, options, value, onChange }) {
  if (!container) return;
  const currentVal = String(value);
  const selectedOption = options.find(o => String(o.value) === currentVal) || options[0];

  const wrapper = document.createElement('div');
  wrapper.className = 'custom-dropdown';

  wrapper.innerHTML = `
    <button type="button" class="custom-dropdown-btn" aria-haspopup="listbox" aria-expanded="false">
      <span class="cd-label">${selectedOption ? selectedOption.label : 'Select'}</span>
      <i class="fa-solid fa-chevron-down cd-icon"></i>
    </button>
    <div class="custom-dropdown-menu" role="listbox">
      ${options.map(opt => {
        const isAct = String(opt.value) === currentVal;
        return `
          <div class="custom-dropdown-item ${isAct ? 'active' : ''}" data-value="${opt.value}">
            <span>${opt.label}</span>
            ${isAct ? '<i class="fa-solid fa-check"></i>' : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;

  const btn = wrapper.querySelector('.custom-dropdown-btn');
  const label = wrapper.querySelector('.cd-label');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.custom-dropdown.open').forEach(other => {
      if (other !== wrapper) other.classList.remove('open');
    });
    wrapper.classList.toggle('open');
  });

  wrapper.querySelectorAll('.custom-dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const val = item.dataset.value;

      wrapper.querySelectorAll('.custom-dropdown-item').forEach(i => {
        const act = i.dataset.value === val;
        i.classList.toggle('active', act);
        let chk = i.querySelector('.fa-check');
        if (act && !chk) {
          i.insertAdjacentHTML('beforeend', '<i class="fa-solid fa-check"></i>');
        } else if (!act && chk) {
          chk.remove();
        }
      });

      const chosen = options.find(o => String(o.value) === String(val));
      if (chosen) label.textContent = chosen.label;
      wrapper.classList.remove('open');
      if (onChange) onChange(val);
    });
  });

  container.innerHTML = '';
  container.appendChild(wrapper);
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.custom-dropdown')) {
    document.querySelectorAll('.custom-dropdown.open').forEach(dd => dd.classList.remove('open'));
  }
});

/* ============================================================
   Settings drawer  (also contains SERVER selection)
   ============================================================ */
function buildSettingsDrawer() {
  if (document.getElementById('settings-drawer')) return;
  const s = Settings.get();
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="drawer-backdrop" id="drawer-backdrop"></div>
    <aside class="drawer" id="settings-drawer" aria-label="Settings">
      <button class="drawer-close" id="drawer-close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      <h3>Settings</h3>
      <p class="muted">Personalize the player, server and theme.</p>

      <div class="field" style="margin-bottom:14px">
        <label style="font-size:0.85rem;margin-bottom:6px"><i class="fa-solid fa-dragon" style="color:var(--accent)"></i> Anime server (MegaPlay)</label>
        <div class="server-picker" id="anime-server-picker">
          ${ANIME_PROVIDERS.map(p => `
            <button class="server-opt is-compact ${p.id===s.animeProvider?'active':''}" data-anime-id="${p.id}">
              <span class="sname">${p.name}</span>
              <span class="sbadge">${p.badge}</span>
            </button>`).join('')}
        </div>
        <p class="muted" style="margin-top:5px;font-size:0.75rem;margin-bottom:0">Used on Anime pages to stream HiAnime library via Anikoto.</p>
      </div>

      <div class="field">
        <label><i class="fa-solid fa-server"></i> Streaming server</label>
        <div class="server-picker" id="server-picker">
          ${PROVIDERS.map((p,i) => `
            <button class="server-opt ${i < 5 ? 'is-recommended' : ''} ${p.id===s.defaultProvider?'active':''}" data-id="${p.id}">
              <span class="server-num">${i+1}</span>
              ${i < 5 ? '<span class="rec-star-badge"><i class="fa-solid fa-star"></i> Recommended</span>' : ''}
              <span class="sname">${p.name}</span>
              <span class="sbadge">${p.badge}</span>
            </button>`).join('')}
        </div>
        <p class="muted" style="margin-top:10px">If a video won't play, switch the server here (or press 1–${PROVIDERS.length} while watching).</p>
      </div>

      <div class="field">
        <label>Accent color</label>
        <div class="color-swatches" id="swatch-list">
          ${SWATCHES.map(c => `<button class="swatch ${c===s.color?'active':''}" data-color="${c}" style="background:#${c}" aria-label="color ${c}"></button>`).join('')}
        </div>
        <div style="margin-top:12px;display:flex;align-items:center;gap:10px">
          <input type="color" id="custom-color" value="#${s.color}" style="width:42px;height:36px;border:none;background:none;cursor:pointer">
          <span class="muted">Custom</span>
        </div>
      </div>

      <div class="field">
        <label>Playback</label>
        <div class="toggle-row"><span>Autoplay</span><label class="switch"><input type="checkbox" id="opt-autoplay" ${s.autoplay?'checked':''}><span class="slider"></span></label></div>
        <div class="toggle-row"><span>Start muted</span><label class="switch"><input type="checkbox" id="opt-muted" ${s.muted?'checked':''}><span class="slider"></span></label></div>
      </div>

      <button class="btn btn-primary" id="clear-history" style="width:100%;justify-content:center;margin-top:12px;background:#2a2a36">
        <i class="fa-solid fa-trash"></i> Clear watch history
      </button>
      <button class="btn btn-primary" id="reopen-notice-btn" style="width:100%;justify-content:center;margin-top:10px;background:#1e1e2d;border:1px solid rgba(255,255,255,0.15)">
        <i class="fa-solid fa-shield-halved" style="color:var(--accent)"></i> Adblocker Guide
      </button>
    </aside>`;
  document.body.appendChild(wrap);
  const backdrop = document.getElementById('drawer-backdrop');
  const drawer = document.getElementById('settings-drawer');
  let lastCloseTime = 0;
  const close = () => {
    backdrop.classList.remove('open');
    drawer.classList.remove('open');
    lastCloseTime = Date.now();
  };
  backdrop.addEventListener('click', close);
  document.getElementById('drawer-close').addEventListener('click', close);

  // server selection
  document.querySelectorAll('#settings-drawer .server-opt[data-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#settings-drawer .server-opt[data-id]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      Settings.save({ defaultProvider: btn.dataset.id });
      toast('Server set to ' + getProvider(btn.dataset.id).name);
      if (window._reloadPlayer) window._reloadPlayer(btn.dataset.id);
    });
  });

  // anime server selection
  document.querySelectorAll('#settings-drawer .server-opt[data-anime-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#settings-drawer .server-opt[data-anime-id]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      Settings.save({ animeProvider: btn.dataset.animeId });
      toast('Anime server set to ' + getAnimeProvider(btn.dataset.animeId).name);
      if (window._reloadAnimePlayer) window._reloadAnimePlayer(btn.dataset.animeId);
    });
  });

  document.querySelectorAll('#swatch-list .swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#swatch-list .swatch').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      Settings.save({ color: btn.dataset.color });
      document.getElementById('custom-color').value = '#' + btn.dataset.color;
    });
  });
  document.getElementById('custom-color').addEventListener('input', e => {
    const c = e.target.value.replace('#','');
    document.querySelectorAll('#swatch-list .swatch').forEach(b => b.classList.remove('active'));
    Settings.save({ color: c });
  });
  document.getElementById('opt-autoplay').addEventListener('change', e => Settings.save({ autoplay: e.target.checked }));
  document.getElementById('opt-muted').addEventListener('change', e => Settings.save({ muted: e.target.checked }));
  document.getElementById('clear-history').addEventListener('click', () => { if (confirm('Clear all watch history?')) { History.clear(); toast('Watch history cleared'); if (parseHash().route==='home') render(); } });
  document.getElementById('reopen-notice-btn').addEventListener('click', () => { close(); if (window.openAdblockerNotice) window.openAdblockerNotice(); });
  window.closeSettings = close;
  window.toggleSettings = window.openSettings = () => {
    if (drawer.classList.contains('open') || (Date.now() - lastCloseTime < 250)) {
      close();
    } else {
      backdrop.classList.add('open');
      drawer.classList.add('open');
    }
  };
}

/* ============================================================
   First-Time Adblocker Notice
   ============================================================ */
function initFirstTimeNotice() {
  if (document.getElementById('notice-backdrop')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="notice-backdrop" id="notice-backdrop" role="dialog" aria-modal="true" aria-labelledby="notice-title">
      <div class="notice-modal">
        <div class="notice-header">
          <div class="notice-title-box">
            <div class="notice-icon-badge"><i class="fa-solid fa-shield-halved"></i></div>
            <div>
              <h2 id="notice-title">Adblocker Notice</h2>
              <p>Important recommendation for best experience</p>
            </div>
          </div>
          <button class="notice-close-btn" id="notice-close" aria-label="Close Notice"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div class="notice-body-text">
          <p style="margin-bottom: 12px; font-weight: 600; color: #fff;">Welcome, fellow peers and strangers! 👋</p>
          <p style="margin-bottom: 12px;">To ensure you get the absolute best, uninterrupted streaming experience, I (the creator of this site) strongly recommend using a trusted adblocker extension:</p>
          <ul style="margin: 0 0 12px 18px; padding: 0; line-height: 1.7; color: var(--text-dim);">
            <li><strong style="color: #fff;">uBlock Origin Lite</strong> (for Chrome, Edge & Chromium browsers)</li>
            <li><strong style="color: #fff;">uBlock Origin</strong> (for those using Firefox... <em>ew</em>)</li>
          </ul>
          <p style="margin-bottom: 12px; font-size: 0.88rem; color: #a0a0b5;"><em>🔒 Rest assured, these are 100% safe, open-source browser extensions trusted by over 10 million users worldwide.</em></p>
          <p style="margin: 0;"><strong style="color: var(--accent);">Next Step:</strong> After installing, set your filtering mode to <strong style="color: #fff;">"Complete"</strong> as shown in the guide below.</p>
        </div>

        <div class="ublock-guide-container">
          <img src="./ublock_guide.jpg" alt="Set filtering mode to complete in uBlock" class="ublock-guide-img" onerror="this.style.display='none'">
          <div class="ublock-guide-caption">
            <i class="fa-solid fa-circle-info"></i> Set filtering mode to <strong>complete</strong> in uBlock Lite extension
          </div>
        </div>

        <button id="notice-dismiss-btn" class="btn btn-primary" style="width:100%; justify-content:center; padding: 12px 20px; font-weight: 700; font-size: 0.98rem; border-radius: 10px;">
          <i class="fa-solid fa-circle-check"></i> I Understand & Got It
        </button>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  const backdrop = document.getElementById('notice-backdrop');
  const closeNotice = () => {
    backdrop.classList.remove('open');
    localStorage.setItem('adblocker_notice_seen', 'true');
  };

  document.getElementById('notice-close').addEventListener('click', closeNotice);
  document.getElementById('notice-dismiss-btn').addEventListener('click', closeNotice);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeNotice();
  });

  if (!localStorage.getItem('adblocker_notice_seen')) {
    setTimeout(() => backdrop.classList.add('open'), 450);
  }

  window.openAdblockerNotice = () => backdrop.classList.add('open');
}

/* ============================================================
   Shared card helpers & Cineby Hover Trailer Player
   ============================================================ */
const cardVideoCache = {};

function cardHTML(item, isPortrait = false, rank = null) {
  const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
  if (type !== 'movie' && type !== 'tv') return '';
  const title = item.title || item.name || 'Untitled';
  const usePortrait = isPortrait || !item.backdrop_path;
  const imageUrl = usePortrait
    ? (item.poster_path ? TMDB.poster(item.poster_path, 'w342') : TMDB.backdrop(item.backdrop_path, 'w300'))
    : TMDB.backdrop(item.backdrop_path, 'w300');
  const year = (item.release_date || item.first_air_date || '').substring(0, 4) || 'N/A';
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
  const poster = imageUrl ? `<img decoding="async" src="${imageUrl}" alt="${title}">`
    : `<div class="skeleton" style="width:100%;height:100%;display:grid;place-items:center;color:#555"><i class="fa-solid fa-film fa-2x"></i></div>`;
  return `
    <article class="card ${usePortrait ? 'card-portrait' : ''}" data-id="${item.id}" data-type="${type}" tabindex="0">
      <div class="card-poster">
        ${rank ? `<div class="card-rank-badge">#${rank}</div>` : ''}
        ${poster}
        <div class="play-overlay">
          <button class="card-action-btn btn-play" data-action="play" title="Play ${title} instantly">
            <i class="fa-solid fa-play"></i> Play
          </button>
          <button class="card-action-btn btn-info" data-action="info" title="View info & details for ${title}">
            <i class="fa-solid fa-circle-info"></i> Info
          </button>
        </div>
      </div>
      <div class="card-info">
        <div class="card-title" title="${title}">${title}</div>
        <div class="card-meta">
          ${rating ? `<span class="card-rating"><i class="fa-solid fa-star"></i> ${rating}</span> <span class="dot">•</span>` : ''}
          <span>${year}</span>
          <span class="dot">•</span>
          <span>${type === 'tv' ? 'TV Show' : 'Movie'}</span>
        </div>
      </div>
    </article>`;
}

function continueCardHTML(item) {
  const backdropUrl = item.backdrop ? TMDB.backdrop(item.backdrop, 'w300') : TMDB.poster(item.poster, 'w342');
  const sub = item.type==='tv' && item.season ? `S${item.season} E${item.episode}` : '';
  const poster = backdropUrl ? `<img decoding="async" src="${backdropUrl}" alt="${item.title}">` : '';
  return `
    <article class="card" data-id="${item.id}" data-type="${item.type}" data-resume="1" data-season="${item.season||1}" data-episode="${item.episode||1}" tabindex="0">
      <div class="card-poster">${poster}
        <div class="play-overlay">
          <button class="card-action-btn btn-play" data-action="play" title="Resume ${item.title}">
            <i class="fa-solid fa-play"></i> Resume
          </button>
          <button class="card-action-btn btn-info" data-action="info" title="View info & details for ${item.title}">
            <i class="fa-solid fa-circle-info"></i> Info
          </button>
        </div>
      </div>
      <div class="card-info">
        <div class="card-title" title="${item.title}">${item.title}</div>
        <div class="card-meta">
          ${sub ? `<span style="color:var(--accent);font-weight:700">${sub}</span> <span class="dot">•</span>` : ''}
          <span>${item.type==='tv'?'TV Show':'Movie'}</span>
        </div>
      </div>
    </article>`;
}

function navigateToDetails(id, type) { location.hash = `#/details?type=${type}&id=${id}`; }
function navigateToWatch(id, type, season, episode) {
  let url = `#/watch?type=${type}&id=${id}`;
  if (type === 'tv') url += `&s=${season||1}&e=${episode||1}`;
  location.hash = url;
}

function wireCards(scope) {
  scope.querySelectorAll('.card').forEach(card => {
    const id = card.dataset.id;
    const type = card.dataset.type;
    const season = card.dataset.season || 1;
    const episode = card.dataset.episode || 1;

    const playBtn = card.querySelector('[data-action="play"]');
    const infoBtn = card.querySelector('[data-action="info"]');

    if (playBtn) {
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateToWatch(id, type, season, episode);
      });
    }

    if (infoBtn) {
      infoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateToDetails(id, type);
      });
    }

    const defaultGo = () => { navigateToWatch(id, type, season, episode); };

    card.addEventListener('click', (e) => {
      if (!e.target.closest('.card-action-btn') && !e.target.closest('.card-sound-btn')) {
        defaultGo();
      }
    });

    card.addEventListener('keydown', e => { if (e.key === 'Enter') defaultGo(); });

    /* ---- Cineby Hover Trailer Preview ---- */
    let hoverTimer = null;

    card.addEventListener('mouseenter', () => {
      if (!id || !type) return;
      // Do not play trailer video on tall/portrait cards (only on landscape cards)
      if (card.classList.contains('card-portrait')) return;

      hoverTimer = setTimeout(async () => {
        if (!card.matches(':hover')) return;
        const cacheKey = `${type}_${id}`;
        let videoKey = cardVideoCache[cacheKey];

        if (videoKey === undefined) {
          try {
            const vData = await TMDB.videos(type, id);
            const results = vData.results || [];
            const ytVideos = results.filter(v => v.site === 'YouTube' && v.key);
            const trailer = ytVideos.find(v => v.type === 'Trailer') || ytVideos[0];
            videoKey = trailer ? trailer.key : null;
            cardVideoCache[cacheKey] = videoKey;
          } catch (e) {
            cardVideoCache[cacheKey] = null;
            videoKey = null;
          }
        }

        if (videoKey && card.matches(':hover')) {
          const poster = card.querySelector('.card-poster');
          if (!poster || poster.querySelector('.card-video-wrap')) return;

          const videoWrap = document.createElement('div');
          videoWrap.className = 'card-video-wrap';
          let isMuted = true;
          videoWrap.innerHTML = `
            <iframe id="vid_${type}_${id}" src="https://www.youtube-nocookie.com/embed/${videoKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoKey}&enablejsapi=1&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0" allow="autoplay; encrypted-media" frameborder="0"></iframe>
            <button class="card-sound-btn" title="Toggle Sound"><i class="fa-solid fa-volume-xmark"></i></button>
          `;

          poster.appendChild(videoWrap);

          const soundBtn = videoWrap.querySelector('.card-sound-btn');
          if (soundBtn) {
            soundBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              e.preventDefault();
              isMuted = !isMuted;
              const iframe = videoWrap.querySelector('iframe');
              if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage(JSON.stringify({
                  event: 'command',
                  func: isMuted ? 'mute' : 'unMute',
                  args: ''
                }), '*');
              }
              soundBtn.innerHTML = isMuted ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>';
            });
          }
        }
      }, 320);
    });

    card.addEventListener('mouseleave', () => {
      if (hoverTimer) clearTimeout(hoverTimer);
      const poster = card.querySelector('.card-poster');
      if (poster) {
        const wrap = poster.querySelector('.card-video-wrap');
        if (wrap) wrap.remove();
      }
    });
  });
}

/* ============================================================
   Hash router
   ============================================================ */
function parseHash() {
  let h = location.hash.replace(/^#/, '');
  if (!h || h === '/') return { route: 'home', params: {} };
  const [path, query] = h.split('?');
  const params = {};
  new URLSearchParams(query || '').forEach((v, k) => params[k] = v);
  if (path === '/browse') return { route: 'browse', params };
  if (path === '/details') return { route: 'details', params };
  if (path === '/watch') return { route: 'watch', params };
  if (path === '/anime') return { route: 'anime', params };
  if (path === '/anime-watch') return { route: 'anime-watch', params };
  return { route: 'home', params: {} };
}

const app = document.getElementById('app');
const siteHeader = document.getElementById('site-header');
const watchTop = document.getElementById('watch-top');
const siteFooter = document.getElementById('site-footer');

function setChrome(route) {
  if (route === 'watch' || route === 'anime-watch') {
    siteHeader.hidden = true; watchTop.hidden = false; siteFooter.style.display = 'none';
    document.body.style.background = '#000';
  } else {
    siteHeader.hidden = false; watchTop.hidden = true; siteFooter.style.display = '';
    document.body.style.background = 'var(--bg)';
  }
}

function initHeaderScroll() {
  const onScroll = () => siteHeader.classList.toggle('scrolled', window.scrollY > 30);
  window.removeEventListener('scroll', window._sv_scroll || (()=>{}));
  window._sv_scroll = onScroll;
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
}

/* ---------- HOME ---------- */
const TOP_10_ANIME_IDS = [
  31911,  // 1. Fullmetal Alchemist: Brotherhood
  42509,  // 2. Steins;Gate
  890,    // 3. Neon Genesis Evangelion
  45790,  // 4. JoJo's Bizarre Adventure
  45952,  // 5. Hunter × Hunter
  13916,  // 6. Death Note
  31724,  // 7. Code Geass: Lelouch of the Rebellion
  30981,  // 8. Monster
  209867, // 9. Frieren: Beyond Journey's End
  30991   // 10. Cowboy Bebop
];

async function buildTop10AnimeRow(container) {
  const section = document.createElement('section');
  section.className = 'row top10-anime-row';
  const cardClass = 'card card-portrait';
  section.innerHTML = `
    <div class="row-head">
      <h2><i class="fa-solid fa-trophy" style="color:#ffce47"></i> Top 10 anime of all time <span style="font-size:0.82rem;font-weight:500;color:var(--text-dim);margin-left:6px">(in the website creator's opinion)</span></h2>
    </div>
    <div class="row-wrapper">
      <button class="row-nav nav-prev" aria-label="Scroll left"><i class="fa-solid fa-chevron-left"></i></button>
      <div class="row-scroller">${Array(10).fill(`<div class="${cardClass}"><div class="card-poster skeleton"></div><div class="skeleton" style="height:18px;width:70%;margin-top:10px;border-radius:4px"></div><div class="skeleton" style="height:14px;width:40%;margin-top:6px;border-radius:4px"></div></div>`).join('')}</div>
      <button class="row-nav nav-next" aria-label="Scroll right"><i class="fa-solid fa-chevron-right"></i></button>
    </div>`;

  container.appendChild(section);

  const scroller = section.querySelector('.row-scroller');
  const prevBtn = section.querySelector('.nav-prev');
  const nextBtn = section.querySelector('.nav-next');
  if (prevBtn) prevBtn.onclick = () => scroller.scrollBy({ left: -500, behavior: 'smooth' });
  if (nextBtn) nextBtn.onclick = () => scroller.scrollBy({ left: 500, behavior: 'smooth' });

  try {
    const items = await Promise.all(TOP_10_ANIME_IDS.map(id => TMDB.tvDetails(id)));
    scroller.innerHTML = items.map((item, idx) => cardHTML({ ...item, media_type: 'tv' }, true, idx + 1)).join('');
    scroller.scrollLeft = 0;
    wireCards(section);
  } catch (e) {
    console.error('Failed to load top 10 anime:', e);
  }
}

async function renderHome() {
  setChrome('home');
  siteHeader.classList.remove('scrolled');
  document.querySelectorAll('#main-nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#/'));
  app.innerHTML = `
    <section class="hero" id="hero">
      <div class="hero-bg"></div>
      <div class="hero-content">
        <div class="skeleton" style="height:44px;width:55%;border-radius:8px;margin-bottom:14px"></div>
        <div style="display:flex;gap:12px;margin-bottom:16px">
          <div class="skeleton" style="height:22px;width:65px;border-radius:6px"></div>
          <div class="skeleton" style="height:22px;width:80px;border-radius:6px"></div>
          <div class="skeleton" style="height:22px;width:70px;border-radius:6px"></div>
        </div>
        <div class="skeleton" style="height:16px;width:85%;border-radius:4px;margin-bottom:8px"></div>
        <div class="skeleton" style="height:16px;width:65%;border-radius:4px;margin-bottom:20px"></div>
        <div style="display:flex;gap:12px">
          <div class="skeleton" style="height:44px;width:125px;border-radius:8px"></div>
          <div class="skeleton" style="height:44px;width:125px;border-radius:8px"></div>
        </div>
      </div>
    </section>
    <main id="rows"></main>`;
  initHeaderScroll();
  const rows = document.getElementById('rows');
  buildContinueWatching(rows);
  buildTop10AnimeRow(rows);

  Promise.all([
    buildHero(),
    buildRow('Recently Added', () => TMDB.recentlyAdded(), rows, true),
    buildProviderRow(rows, true),
    buildRow('Popular Movies', () => TMDB.popularMovies(), rows, false),
    buildRow('Popular TV Shows', () => TMDB.popularTV(), rows, true),
    buildRow('Popular Anime', () => TMDB.popularAnime(), rows, true),
    buildRow('Now Playing in Theaters', () => TMDB.nowPlaying(), rows, false),
    buildRow('Top Rated Movies', () => TMDB.topRatedMovies(), rows, true),
    buildRow('Top Rated TV', () => TMDB.topRatedTV(), rows, false),
    buildRow('Action & Adventure', () => TMDB.byGenre('movie',28), rows, true),
    buildRow('Comedy', () => TMDB.byGenre('movie',35), rows, false),
    buildRow('Sci-Fi', () => TMDB.byGenre('movie',878), rows, true)
  ]);
}

const STREAMING_PROVIDERS = [
  { id: '8', name: 'Netflix', icon: 'N', bg: '#e50914', color: '#fff' },
  { id: '119', name: 'Prime Video', icon: 'P', bg: '#00a8e1', color: '#fff' },
  { id: '1899', name: 'Max', icon: 'M', bg: '#252636', color: '#fff' },
  { id: '337', name: 'Disney+', icon: 'D+', bg: '#113ccf', color: '#fff' },
  { id: '350', name: 'Apple TV+', icon: 'tv', bg: '#000000', color: '#fff' },
  { id: '531', name: 'Paramount+', icon: 'P+', bg: '#0064ff', color: '#fff' },
  { id: '15', name: 'Hulu', icon: 'H', bg: '#1ce783', color: '#000' }
];

async function buildProviderRow(container, isPortrait = true) {
  let currentProvider = STREAMING_PROVIDERS[0];
  const section = document.createElement('section');
  section.className = 'row provider-row';
  const cardClass = isPortrait ? 'card card-portrait' : 'card';

  section.innerHTML = `
    <div class="row-head">
      <h2>Only on 
        <div class="provider-selector-wrap" id="provider-selector-wrap">
          <button class="provider-btn" id="provider-dropdown-btn">
            <span class="provider-name-underline">${currentProvider.name}</span>
            <i class="fa-solid fa-chevron-down"></i>
          </button>
          <div class="provider-dropdown-menu" id="provider-dropdown-menu">
            ${STREAMING_PROVIDERS.map(p => `
              <button class="provider-option-item ${p.id === currentProvider.id ? 'active' : ''}" data-provider-id="${p.id}">
                <span class="provider-icon-badge" style="background:${p.bg};color:${p.color}">${p.icon}</span>
                <span style="${p.id === currentProvider.id ? 'color:var(--accent)' : ''}">${p.name}</span>
              </button>
            `).join('')}
          </div>
        </div>
      </h2>
    </div>
    <div class="row-wrapper">
      <button class="row-nav nav-prev" aria-label="Scroll left"><i class="fa-solid fa-chevron-left"></i></button>
      <div class="row-scroller">${Array(8).fill(`<div class="${cardClass}"><div class="card-poster skeleton"></div><div class="skeleton" style="height:18px;width:70%;margin-top:10px;border-radius:4px"></div><div class="skeleton" style="height:14px;width:40%;margin-top:6px;border-radius:4px"></div></div>`).join('')}</div>
      <button class="row-nav nav-next" aria-label="Scroll right"><i class="fa-solid fa-chevron-right"></i></button>
    </div>`;
  container.appendChild(section);

  const scroller = section.querySelector('.row-scroller');
  const prevBtn = section.querySelector('.nav-prev');
  const nextBtn = section.querySelector('.nav-next');
  if (prevBtn) prevBtn.onclick = () => scroller.scrollBy({ left: isPortrait ? -500 : -600, behavior: 'smooth' });
  if (nextBtn) nextBtn.onclick = () => scroller.scrollBy({ left: isPortrait ? 500 : 600, behavior: 'smooth' });

  async function loadProvider(prov) {
    currentProvider = prov;
    const wrap = section.querySelector('#provider-selector-wrap');
    if (wrap) wrap.classList.remove('open');
    const btnSpan = section.querySelector('.provider-name-underline');
    if (btnSpan) btnSpan.textContent = prov.name;

    scroller.innerHTML = Array(8).fill(`<div class="${cardClass}"><div class="card-poster skeleton"></div><div class="skeleton" style="height:18px;width:70%;margin-top:10px;border-radius:4px"></div><div class="skeleton" style="height:14px;width:40%;margin-top:6px;border-radius:4px"></div></div>`).join('');
    scroller.scrollLeft = 0;

    try {
      const data = await TMDB.getProviderContent(prov.id);
      const items = (data.results || []).filter(x => x.poster_path || x.backdrop_path);
      scroller.innerHTML = items.map(item => cardHTML(item, isPortrait)).join('') || '<p style="color:#888;padding:20px">No items available.</p>';
      scroller.scrollLeft = 0;
      wireCards(section);
    } catch (e) {
      scroller.innerHTML = '<p style="color:#888;padding:20px">Failed to load content.</p>';
      scroller.scrollLeft = 0;
    }
  }

  section.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('#provider-dropdown-btn');
    const wrap = section.querySelector('#provider-selector-wrap');
    if (toggleBtn && wrap) {
      e.stopPropagation();
      wrap.classList.toggle('open');
      return;
    }

    const itemBtn = e.target.closest('.provider-option-item');
    if (itemBtn) {
      e.stopPropagation();
      const pId = itemBtn.dataset.providerId;
      const chosen = STREAMING_PROVIDERS.find(p => p.id === pId);
      if (chosen) {
        section.querySelectorAll('.provider-option-item').forEach(el => {
          const isMe = el.dataset.providerId === pId;
          el.classList.toggle('active', isMe);
          const nameSpan = el.querySelector('span:last-child');
          if (nameSpan) nameSpan.style.color = isMe ? 'var(--accent)' : '';
        });
        loadProvider(chosen);
      }
    }
  });

  document.addEventListener('click', (e) => {
    const wrap = section.querySelector('#provider-selector-wrap');
    if (wrap && wrap.classList.contains('open') && !wrap.contains(e.target)) {
      wrap.classList.remove('open');
    }
  });

  await loadProvider(currentProvider);
}

async function buildHero() {
  const hero = document.getElementById('hero');
  if (!hero) return;
  try {
    const data = await TMDB.trending('all','week');
    const items = (data.results || []).filter(x => x.backdrop_path && (x.title || x.name));
    const pick = items[Math.floor(Math.random() * Math.min(5, items.length))];
    const type = pick.media_type || (pick.first_air_date ? 'tv' : 'movie');
    const title = pick.title || pick.name;
    hero.querySelector('.hero-bg').style.backgroundImage = `url(${TMDB.backdrop(pick.backdrop_path, 'original')})`;
    hero.querySelector('.hero-content').innerHTML = `
      <h1>${title}</h1>
      <div class="hero-meta">
        <span class="rating"><i class="fa-solid fa-star"></i> ${(pick.vote_average||0).toFixed(1)}</span>
        <span style="text-transform:uppercase">${type==='tv'?'TV Series':'Movie'}</span>
      </div>
      <p class="hero-overview">${pick.overview || ''}</p>
      <div class="hero-actions">
        <button class="btn btn-primary" id="hero-play"><i class="fa-solid fa-play"></i> Play</button>
        <button class="btn btn-ghost" id="hero-info"><i class="fa-solid fa-circle-info"></i> Details</button>
      </div>`;
    document.getElementById('hero-play').addEventListener('click', () => navigateToWatch(pick.id, type, 1, 1));
    document.getElementById('hero-info').addEventListener('click', () => navigateToDetails(pick.id, type));
  } catch (e) {
    hero.querySelector('.hero-content').innerHTML = `<h1>Welcome to Urnperiodic Streaming</h1><p class="hero-overview">Browse thousands of movies and TV shows free in HD.</p>`;
  }
}

async function buildRow(title, fetcher, container, isPortrait = false) {
  const section = document.createElement('section');
  section.className = 'row';
  const cardClass = isPortrait ? 'card card-portrait' : 'card';
  section.innerHTML = `
    <div class="row-head"><h2>${title}</h2></div>
    <div class="row-wrapper">
      <button class="row-nav nav-prev" aria-label="Scroll left"><i class="fa-solid fa-chevron-left"></i></button>
      <div class="row-scroller">${Array(8).fill(`<div class="${cardClass}"><div class="card-poster skeleton"></div><div class="skeleton" style="height:18px;width:70%;margin-top:10px;border-radius:4px"></div><div class="skeleton" style="height:14px;width:40%;margin-top:6px;border-radius:4px"></div></div>`).join('')}</div>
      <button class="row-nav nav-next" aria-label="Scroll right"><i class="fa-solid fa-chevron-right"></i></button>
    </div>`;
  container.appendChild(section);

  const scroller = section.querySelector('.row-scroller');
  const prevBtn = section.querySelector('.nav-prev');
  const nextBtn = section.querySelector('.nav-next');
  if (prevBtn) prevBtn.onclick = () => scroller.scrollBy({ left: isPortrait ? -500 : -600, behavior: 'smooth' });
  if (nextBtn) nextBtn.onclick = () => scroller.scrollBy({ left: isPortrait ? 500 : 600, behavior: 'smooth' });

  try {
    const data = await fetcher();
    const items = (data.results || []).filter(x => x.poster_path || x.backdrop_path);
    scroller.innerHTML = items.map(item => cardHTML(item, isPortrait)).join('') || '<p style="color:#888">Nothing here.</p>';
    scroller.scrollLeft = 0;
    wireCards(section);
  } catch (e) {
    scroller.innerHTML = '<p style="color:#888;padding:20px">Failed to load.</p>';
    scroller.scrollLeft = 0;
  }
}

function buildContinueWatching(container) {
  const items = History.all();
  if (!items.length) return;
  const section = document.createElement('section');
  section.className = 'row';
  section.innerHTML = `
    <div class="row-head"><h2><i class="fa-solid fa-clock-rotate-left" style="color:var(--accent)"></i> Continue Watching</h2></div>
    <div class="row-wrapper">
      <button class="row-nav nav-prev" aria-label="Scroll left"><i class="fa-solid fa-chevron-left"></i></button>
      <div class="row-scroller">${items.map(continueCardHTML).join('')}</div>
      <button class="row-nav nav-next" aria-label="Scroll right"><i class="fa-solid fa-chevron-right"></i></button>
    </div>`;
  container.prepend(section);

  const scroller = section.querySelector('.row-scroller');
  scroller.scrollLeft = 0;
  const prevBtn = section.querySelector('.nav-prev');
  const nextBtn = section.querySelector('.nav-next');
  if (prevBtn) prevBtn.onclick = () => scroller.scrollBy({ left: -600, behavior: 'smooth' });
  if (nextBtn) nextBtn.onclick = () => scroller.scrollBy({ left: 600, behavior: 'smooth' });

  wireCards(section);
}

/* ---------- BROWSE / SEARCH ---------- */
let browseState = null;
async function renderBrowse(params) {
  setChrome('home');
  siteHeader.classList.add('scrolled');
  const gridSkeletonCards = Array(12).fill(`
    <div class="card card-portrait" style="pointer-events:none">
      <div class="card-poster skeleton"></div>
      <div class="skeleton" style="height:18px;width:75%;margin-top:10px;border-radius:4px"></div>
      <div class="skeleton" style="height:14px;width:40%;margin-top:6px;border-radius:4px"></div>
    </div>
  `).join('');

  app.innerHTML = `
    <main class="grid-page">
      <h1 id="page-title">Browse</h1>
      <p class="sub" id="page-sub"></p>
      <nav class="filter-bar" id="filter-bar"></nav>
      <section class="poster-grid" id="grid">${gridSkeletonCards}</section>
      <div id="loader" style="text-align:center;padding:40px;color:var(--text-dim)">Loading more…</div>
    </main>`;
  initHeaderScroll();

  const MODE = {
    q: params.q || '', type: params.type || '', trending: params.trending === '1',
    genre: params.genre || '', page: 1, loading: false, done: false, fetcher: null, title: 'Browse'
  };
  document.querySelectorAll('#main-nav a').forEach(a => {
    const href = a.getAttribute('href');
    a.classList.toggle('active', (MODE.trending && href.includes('trending')) || (!MODE.trending && href.includes('type='+MODE.type) && MODE.type));
  });

  function makeFetcher() {
    if (MODE.q) { MODE.title = `Results for “${MODE.q}”`; return () => TMDB.searchMulti(MODE.q, MODE.page); }
    if (MODE.trending) { MODE.title = 'Trending'; return () => TMDB.trending('all','week'); }
    if (MODE.genre && MODE.type) { MODE.title = (TMDB.GENRES[MODE.type] && TMDB.GENRES[MODE.type][MODE.genre]) || 'Browse'; return () => TMDB.byGenre(MODE.type, MODE.genre, MODE.page); }
    if (MODE.type === 'tv') { MODE.title = 'TV Shows'; return () => TMDB.popularTV(MODE.page); }
    MODE.title = 'Movies'; return () => TMDB.popularMovies(MODE.page);
  }

  function renderFilters() {
    const bar = document.getElementById('filter-bar');
    if (MODE.q || MODE.trending) { bar.style.display = 'none'; return; }
    const type = MODE.type === 'tv' ? 'tv' : 'movie';
    const genres = TMDB.GENRES[type];
    bar.innerHTML = `
      <a class="chip ${!MODE.genre?'active':''}" href="#/browse?type=${type}">All</a>
      ${Object.entries(genres).map(([id,name]) => `<a class="chip ${MODE.genre==id?'active':''}" href="#/browse?type=${type}&genre=${id}">${name}</a>`).join('')}`;
  }

  async function loadMore() {
    if (MODE.loading || MODE.done) return;
    MODE.loading = true;
    const grid = document.getElementById('grid');
    try {
      const data = await MODE.fetcher();
      let items = (data.results || []).filter(x => x.poster_path);
      if (MODE.q) items = items.filter(x => x.media_type === 'movie' || x.media_type === 'tv');
      if (MODE.page === 1) grid.innerHTML = '';
      if (!items.length && MODE.page === 1) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-film"></i><p>No results found.</p></div>`;
        MODE.done = true; return;
      }
      grid.insertAdjacentHTML('beforeend', items.map(item => cardHTML(item, true)).join(''));
      wireCards(grid);
      MODE.page++;
      if (MODE.trending || MODE.page > (data.total_pages || 1)) MODE.done = true;
    } catch (e) {
      if (MODE.page === 1) grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load. Check your TMDB key in settings.</p></div>`;
      MODE.done = true;
    } finally {
      MODE.loading = false;
      const ld = document.getElementById('loader'); if (ld) ld.style.display = MODE.done ? 'none' : 'block';
    }
  }

  MODE.fetcher = makeFetcher();
  document.getElementById('page-title').textContent = MODE.title;
  document.getElementById('page-sub').textContent = MODE.q ? 'Movies & TV shows' : (MODE.type === 'tv' ? 'Series' : 'Films');
  renderFilters();
  await loadMore();

  if (browseState && browseState.io) browseState.io.disconnect();
  const io = new IntersectionObserver(entries => { if (entries[0].isIntersecting) loadMore(); }, { rootMargin: '600px' });
  const loaderEl = document.getElementById('loader');
  if (loaderEl) io.observe(loaderEl);
  browseState = { io };

  const input = document.getElementById('search-input');
  if (input && MODE.q) input.value = MODE.q;
}

/* ============================================================
   ANIME BROWSE PAGE (TMDB Japanese animation + MegaPlay watch)
   ============================================================ */
async function renderAnime() {
  setChrome('home');
  siteHeader.classList.remove('scrolled');
  document.querySelectorAll('#main-nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#/anime'));
  app.innerHTML = `
    <main class="grid-page">
      <h1><i class="fa-solid fa-dragon" style="color:var(--accent)"></i> Anime</h1>
      <p class="sub">Powered by MegaPlay + Anikoto (HiAnime library). Pick a title to stream sub or dub.</p>
      <div id="anime-rows"></div>
    </main>`;
  initHeaderScroll();
  const rows = document.getElementById('anime-rows');
  buildTop10AnimeRow(rows);

  Promise.all([
    buildRow('Popular Anime', () => TMDB.popularAnime(), rows, true),
    buildRow('Top Rated Anime', () => TMDB.topRatedAnime(), rows, true),
    buildRow('Recently Airing', () => TMDB.airingAnime(), rows, true),
    buildRow('Action & Adventure Anime', () => TMDB.byGenre('tv', 16, 1), rows, true)
  ]);
}

/* ============================================================
   DETAILS PAGE  (info + episodes)
   ============================================================ */
async function renderDetails(params) {
  setChrome('home');
  siteHeader.classList.add('scrolled');
  const type = params.type === 'tv' ? 'tv' : 'movie';
  const id = params.id;
  let season = parseInt(params.s) || 1;

  app.innerHTML = `
    <div class="details-page">
      <section class="details-hero">
        <div class="details-hero-bg skeleton" style="opacity:0.25"></div>
        <div class="details-inner">
          <div class="details-poster"><div class="skeleton" style="width:100%;aspect-ratio:2/3;border-radius:12px"></div></div>
          <div class="details-meta" style="flex:1">
            <div class="skeleton" style="height:42px;width:65%;border-radius:8px;margin-bottom:12px"></div>
            <div class="skeleton" style="height:20px;width:40%;border-radius:6px;margin-bottom:16px"></div>
            <div class="fact-row" style="display:flex;gap:12px;margin-bottom:16px">
              <div class="skeleton" style="height:24px;width:60px;border-radius:6px"></div>
              <div class="skeleton" style="height:24px;width:50px;border-radius:6px"></div>
              <div class="skeleton" style="height:24px;width:70px;border-radius:6px"></div>
              <div class="skeleton" style="height:24px;width:80px;border-radius:6px"></div>
            </div>
            <div class="genre-tags" style="display:flex;gap:8px;margin-bottom:20px">
              <div class="skeleton" style="height:28px;width:80px;border-radius:20px"></div>
              <div class="skeleton" style="height:28px;width:95px;border-radius:20px"></div>
              <div class="skeleton" style="height:28px;width:70px;border-radius:20px"></div>
            </div>
            <div class="skeleton" style="height:16px;width:95%;border-radius:4px;margin-bottom:8px"></div>
            <div class="skeleton" style="height:16px;width:85%;border-radius:4px;margin-bottom:8px"></div>
            <div class="skeleton" style="height:16px;width:60%;border-radius:4px;margin-bottom:24px"></div>
            <div class="details-actions" style="display:flex;gap:12px">
              <div class="skeleton" style="height:46px;width:140px;border-radius:10px"></div>
            </div>
          </div>
        </div>
      </section>
    </div>`;
  initHeaderScroll();

  let details;
  try {
    details = type === 'movie' ? await TMDB.movieDetails(id) : await TMDB.tvDetails(id);
  } catch (e) {
    app.innerHTML = `<div class="details-page"><div class="empty-state" style="padding:160px 20px"><i class="fa-solid fa-triangle-exclamation"></i><p>Could not load details. Check your TMDB key in settings.</p></div></div>`;
    return;
  }

  const title = details.title || details.name || 'Untitled';
  const year = (details.release_date || details.first_air_date || '').slice(0,4);
  const runtime = details.runtime ? `${details.runtime} min` : (details.episode_run_time && details.episode_run_time[0] ? `${details.episode_run_time[0]} min/ep` : '—');
  const genres = (details.genres || []).map(g => `<span>${g.name}</span>`).join('');
  const posterImg = TMDB.poster(details.poster_path, 'w500');
  const bg = TMDB.backdrop(details.backdrop_path, 'original') || posterImg;
  const director = (details.credits && details.credits.crew || []).find(c => c.job === 'Director');
  const creators = (details.created_by || []).map(c => c.name).join(', ');
  const status = details.status || '—';
  const lang = (details.original_language || '').toUpperCase();

  app.innerHTML = `
    <div class="details-page">
      <section class="details-hero">
        <div class="details-hero-bg" style="background-image:url('${bg||''}')"></div>
        <div class="details-inner">
          <div class="details-poster">${posterImg ? `<img src="${posterImg}" alt="${title}">` : '<div class="skeleton" style="aspect-ratio:2/3"></div>'}</div>
          <div class="details-meta">
            <h1>${title}</h1>
            ${details.tagline ? `<p class="tagline">${details.tagline}</p>` : ''}
            <div class="fact-row">
              <span class="rating"><i class="fa-solid fa-star"></i> ${(details.vote_average||0).toFixed(1)}</span>
              ${year ? `<span>${year}</span>` : ''}
              <span>${runtime}</span>
              ${type==='tv' && details.number_of_seasons ? `<span>${details.number_of_seasons} season(s)</span>` : ''}
              <span style="text-transform:uppercase">${type==='tv'?'TV Series':'Movie'}</span>
            </div>
            <div class="genre-tags">${genres}</div>
            <p class="details-overview">${details.overview || 'No description available.'}</p>
            <div class="details-actions">
              <button class="btn btn-primary" id="det-play"><i class="fa-solid fa-play"></i> ${type==='tv'?'Play S'+season+' E1':'Play'}</button>
            </div>
            <div class="info-grid">
              ${director ? `<div class="info-cell"><div class="k">Director</div><div class="v">${director.name}</div></div>` : ''}
              ${creators ? `<div class="info-cell"><div class="k">Created by</div><div class="v">${creators}</div></div>` : ''}
              <div class="info-cell"><div class="k">Status</div><div class="v">${status}</div></div>
              <div class="info-cell"><div class="k">Language</div><div class="v">${lang || '—'}</div></div>
              ${type==='tv' && details.number_of_episodes ? `<div class="info-cell"><div class="k">Episodes</div><div class="v">${details.number_of_episodes}</div></div>` : ''}
              ${details.vote_count ? `<div class="info-cell"><div class="k">Votes</div><div class="v">${details.vote_count.toLocaleString()}</div></div>` : ''}
            </div>
          </div>
        </div>
      </section>

      <div class="details-body">
        ${type==='tv' ? `
        <section class="episodes-section" id="episodes-section">
          <h2 class="section-title"><span class="accent-bar"></span> Episodes</h2>
          <div class="ep-head">
            <div id="season-dropdown-container"></div>
            <span class="muted" style="color:var(--text-dim);font-size:0.85rem">Select an episode to play.</span>
          </div>
          <div class="ep-list" id="ep-list"><div class="empty-state" style="padding:30px">Loading…</div></div>
        </section>` : ''}

        <section id="cast-section"></section>
        <section class="row" id="recs-section" style="padding:0"></section>
      </div>
    </div>`;

  document.getElementById('det-play').onclick = () => navigateToWatch(id, type, season, 1);

  (function renderCast(){
    const sec = document.getElementById('cast-section');
    const cast = (details.credits && details.credits.cast || []).slice(0, 18);
    if (!cast.length) { sec.innerHTML = ''; return; }
    sec.innerHTML = `<h2 class="section-title"><span class="accent-bar"></span> Cast</h2>
      <div class="cast-row">${cast.map(p => {
        const img = TMDB.profile(p.profile_path);
        return `<div class="cast-card">${img?`<img decoding="async" src="${img}" alt="${p.name}">`:`<div class="noimg"><i class="fa-solid fa-user fa-lg"></i></div>`}<div class="name">${p.name}</div><div class="role">${p.character||''}</div></div>`;
      }).join('')}</div>`;
  })();

  (function renderRecs(){
    const sec = document.getElementById('recs-section');
    const recs = (details.recommendations && details.recommendations.results || []).filter(x => x.poster_path).slice(0, 16);
    if (!recs.length) { sec.innerHTML = ''; return; }
    sec.innerHTML = `<h2 class="section-title" style="padding:0"><span class="accent-bar"></span> You may like</h2>
      <div class="row-scroller" style="padding-left:0;padding-right:0">${recs.map(r => cardHTML({...r, media_type: type})).join('')}</div>`;
    wireCards(sec);
  })();

  if (type === 'tv') {
    const seasons = (details.seasons || []).filter(s => s.season_number > 0);
    const container = document.getElementById('season-dropdown-container');
    if (seasons.length && container) {
      const options = seasons.map(s => ({ value: s.season_number, label: s.name || `Season ${s.season_number}` }));
      createCustomDropdown({
        container, options, value: season,
        onChange: async (newVal) => { season = parseInt(newVal); await loadSeasonEpisodes(); }
      });
      await loadSeasonEpisodes();
    } else {
      document.getElementById('ep-list').innerHTML = '<p style="color:#888">No episodes available.</p>';
    }
  }

  async function loadSeasonEpisodes() {
    const listEl = document.getElementById('ep-list');
    listEl.innerHTML = Array(4).fill(`
      <div class="ep-card" style="pointer-events:none">
        <div class="ep-thumb skeleton" style="min-width:160px;height:90px;border-radius:8px"></div>
        <div class="ep-body" style="flex:1">
          <div class="skeleton" style="height:18px;width:50%;border-radius:4px;margin-bottom:8px"></div>
          <div class="skeleton" style="height:14px;width:85%;border-radius:4px;margin-bottom:6px"></div>
          <div class="skeleton" style="height:14px;width:60%;border-radius:4px"></div>
        </div>
      </div>
    `).join('');
    try {
      const data = await TMDB.seasonDetails(id, season);
      const eps = data.episodes || [];
      listEl.innerHTML = eps.map(ep => {
        const thumb = ep.still_path ? TMDB.backdrop(ep.still_path, 'w300') : '';
        return `<div class="ep-card">
          <div class="ep-thumb" data-ep="${ep.episode_number}">${thumb?`<img decoding="async" src="${thumb}" alt="">`:''}<span class="ep-num">E${ep.episode_number}</span><div class="ep-play-ov"><i class="fa-solid fa-circle-play"></i></div></div>
          <div class="ep-body">
            <div class="ep-title">E${ep.episode_number}. ${ep.name||('Episode '+ep.episode_number)}</div>
            <div class="ep-ov">${ep.overview||''}</div>
            <div class="ep-act">
              <button class="ep-play-btn" data-ep="${ep.episode_number}"><i class="fa-solid fa-play"></i> Play</button>
            </div>
          </div>
        </div>`;
      }).join('') || '<p style="color:#888">No episodes found.</p>';

      listEl.querySelectorAll('.ep-thumb, .ep-play-btn').forEach(el => {
        el.addEventListener('click', () => navigateToWatch(id, 'tv', season, parseInt(el.dataset.ep)));
      });
    } catch (e) { listEl.innerHTML = '<p style="color:#888">Failed to load episodes.</p>'; }
  }

  History.record({
    id, type, title, poster: details.poster_path, backdrop: details.backdrop_path,
    year, viewedDetails: true
  });
  window.scrollTo({ top: 0 });
}

/* ============================================================
   WATCH PAGE (YouTube Style Side-by-Side Layout & Quick Episode Swapper)
   ============================================================ */
let watchState = null;
async function renderWatch(params) {
  setChrome('watch');
  const type = params.type === 'tv' ? 'tv' : 'movie';
  const id = params.id;
  let season = parseInt(params.s) || 1;
  let episode = parseInt(params.e) || 1;
  let currentProvider = Settings.get().defaultProvider;

  const epWrap = document.getElementById('hdr-episodes-wrap');
  const epBtn = document.getElementById('hdr-btn-episodes');
  const prevBtnHdr = document.getElementById('btn-prev-ep');
  const nextBtnHdr = document.getElementById('btn-next-ep');
  const langCont = document.getElementById('w-lang-toggle-container');
  if (langCont) langCont.innerHTML = '';

  if (type === 'tv') {
    if (epWrap) {
      epWrap.style.display = 'inline-flex';
      epWrap.classList.remove('open');
      if (epBtn) { epBtn.onclick = (e) => { e.stopPropagation(); epWrap.classList.toggle('open'); }; }
    }
    if (prevBtnHdr) prevBtnHdr.style.display = 'inline-flex';
    if (nextBtnHdr) nextBtnHdr.style.display = 'inline-flex';
  } else {
    if (epWrap) { epWrap.style.display = 'none'; epWrap.classList.remove('open'); }
    if (prevBtnHdr) prevBtnHdr.style.display = 'none';
    if (nextBtnHdr) nextBtnHdr.style.display = 'none';
  }

  app.innerHTML = `
    <div class="watch-container ${type==='movie'?'movie-mode':''}">
      <div class="watch-grid">
        <div class="watch-main-col">
          <div class="player-stage" id="player-stage" tabindex="0"></div>
        </div>
      </div>
    </div>`;

  document.getElementById('watch-back').onclick = () => { location.hash = '#/'; };

  const hdrDetailsBtn = document.getElementById('hdr-btn-details');
  if (hdrDetailsBtn) hdrDetailsBtn.onclick = () => { location.hash = `#/details?type=${type}&id=${id}${type==='tv'?'&s='+season:''}`; };

  let details = null;
  try {
    details = type === 'movie' ? await TMDB.movieDetails(id) : await TMDB.tvDetails(id);
  } catch (e) {
    document.getElementById('player-stage').innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Could not load metadata. Check your TMDB key in settings.</p></div>`;
    return;
  }

  const title = details.title || details.name || 'Untitled';
  const yearOrTag = type==='tv' ? `Season ${season} · Episode ${episode}` : '';

  const watchTitleEl = document.getElementById('watch-title');
  if (watchTitleEl) watchTitleEl.innerHTML = `<span class="wt-main">${title}</span>${yearOrTag ? `<span class="wt-tag">${yearOrTag}</span>` : ''}`;

  function updateEpTag() {
    const curTag = type==='tv' ? `Season ${season} · Episode ${episode}` : '';
    if (watchTitleEl) watchTitleEl.innerHTML = `<span class="wt-main">${title}</span>${curTag ? `<span class="wt-tag">${curTag}</span>` : ''}`;
  }

  function loadPlayer() {
    const stage = document.getElementById('player-stage');
    const opt = { color: Settings.get().color, autoplay: Settings.get().autoplay, muted: Settings.get().muted };
    const prov = getProvider(currentProvider);
    const src = prov.build({ type, tmdb: id, season, episode, opt });

    const oldFrame = stage.querySelector('iframe');
    if (oldFrame) oldFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.setAttribute('allowfullscreen', '');
    iframe.referrerPolicy = 'origin';
    stage.appendChild(iframe);

    History.record({
      id, type, title, poster: details.poster_path, backdrop: details.backdrop_path,
      season: type==='tv'?season:undefined, episode: type==='tv'?episode:undefined,
      year: (details.release_date || details.first_air_date || '').slice(0,4)
    });
    updateEpTag();
    syncScreenButtons();
  }

  window._reloadPlayer = (provId) => {
    if (parseHash().route !== 'watch') return;
    currentProvider = provId;
    loadPlayer();
  };

  const stageEl = () => document.getElementById('player-stage');
  function toggleTheater() {
    const stage = stageEl(); if (!stage) return;
    const on = stage.classList.toggle('theater');
    document.body.classList.toggle('theater-open', on);
    if (on) window.scrollTo({ top: 0 });
    syncScreenButtons();
  }
  function exitTheater() { const stage = stageEl(); if (stage && stage.classList.contains('theater')) toggleTheater(); }

  function toggleFullscreen() {
    const stage = stageEl(); if (!stage) return;
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fsEl) {
      const req = stage.requestFullscreen || stage.webkitRequestFullscreen || stage.msRequestFullscreen;
      if (req) { try { req.call(stage); } catch (e) { toast('Fullscreen not supported here'); } }
      else { toast('Fullscreen not supported by this browser'); }
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
      if (exit) exit.call(document);
    }
  }

  function syncScreenButtons() {
    const stage = stageEl();
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    const fsOn = !!fsEl;
    const fsBtn = document.getElementById('hdr-btn-fullscreen');
    if (fsBtn) fsBtn.innerHTML = fsOn ? '<i class="fa-solid fa-compress"></i>' : '<i class="fa-solid fa-expand"></i>';
  }

  const hdrFsBtn = document.getElementById('hdr-btn-fullscreen');
  if (hdrFsBtn) hdrFsBtn.onclick = toggleFullscreen;

  if (type === 'tv') {
    const seasons = (details.seasons || []).filter(s => s.season_number > 0);

    function renderSeasonDropdown() {
      const container = document.getElementById('w-season-dropdown-container');
      if (!container || !seasons.length) return;
      const options = seasons.map(s => ({ value: s.season_number, label: s.name || `Season ${s.season_number}` }));
      createCustomDropdown({
        container, options, value: season,
        onChange: async (newVal) => {
          season = parseInt(newVal); episode = 1;
          window.history.replaceState(null, '', `#/watch?type=tv&id=${id}&s=${season}&e=${episode}`);
          loadPlayer(); await loadWSeason();
        }
      });
    }

    function updatePrevNextBtns(totalEps) {
      const prevBtn = document.getElementById('btn-prev-ep');
      const nextBtn = document.getElementById('btn-next-ep');
      const totalSeasons = seasons.length;
      if (prevBtn) prevBtn.disabled = !(episode > 1 || season > 1);
      if (nextBtn) nextBtn.disabled = !(episode < totalEps || season < totalSeasons);
    }

    function switchEpisode(epNum) {
      episode = epNum;
      window.history.replaceState(null, '', `#/watch?type=tv&id=${id}&s=${season}&e=${episode}`);
      loadPlayer();
      const listEl = document.getElementById('sidebar-ep-list');
      if (listEl) {
        listEl.querySelectorAll('.yt-ep-card').forEach(card => {
          const isAct = parseInt(card.dataset.ep) === episode;
          card.classList.toggle('active', isAct);
          const thumb = card.querySelector('.yt-ep-thumb');
          const meta = card.querySelector('.yt-ep-meta');
          const oldOv = thumb ? thumb.querySelector('.yt-ep-playing-ov') : null;
          if (oldOv) oldOv.remove();
          if (isAct && thumb) {
            thumb.insertAdjacentHTML('beforeend', `<div class="yt-ep-playing-ov"><div class="equalizer"><span></span><span></span><span></span></div><span>PLAYING</span></div>`);
          }
          if (meta) meta.innerHTML = isAct ? '<span><i class="fa-solid fa-play"></i> Playing now</span>' : `<span>Episode ${card.dataset.ep}</span>`;
        });
        const activeCard = listEl.querySelector('.yt-ep-card.active');
        if (activeCard) activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      const totalEps = listEl ? listEl.querySelectorAll('.yt-ep-card').length : 99;
      updatePrevNextBtns(totalEps);
    }

    async function loadWSeason() {
      const listEl = document.getElementById('sidebar-ep-list');
      const countEl = document.getElementById('sidebar-ep-count');
      if (!listEl) return;
      listEl.innerHTML = `<div class="empty-state" style="padding:30px"><p>Loading episodes…</p></div>`;
      try {
        const data = await TMDB.seasonDetails(id, season);
        const eps = data.episodes || [];
        if (countEl) countEl.textContent = `${eps.length} episode${eps.length === 1 ? '' : 's'}`;
        if (!eps.length) { listEl.innerHTML = '<p style="color:#888;padding:20px;text-align:center">No episodes found.</p>'; return; }

        listEl.innerHTML = eps.map(ep => {
          const isPlaying = ep.episode_number === episode;
          const thumb = ep.still_path ? TMDB.backdrop(ep.still_path, 'w300') : (details.poster_path ? TMDB.poster(details.poster_path, 'w300') : '');
          return `
            <div class="yt-ep-card ${isPlaying ? 'active' : ''}" data-ep="${ep.episode_number}">
              <div class="yt-ep-thumb">
                ${thumb ? `<img decoding="async" src="${thumb}" alt="${ep.name || ''}">` : '<div style="width:100%;height:100%;background:#222"></div>'}
                <span class="ep-badge">E${ep.episode_number}</span>
                ${isPlaying ? `<div class="yt-ep-playing-ov"><div class="equalizer"><span></span><span></span><span></span></div><span>PLAYING</span></div>` : ''}
              </div>
              <div class="yt-ep-info">
                <div class="yt-ep-title">${ep.episode_number}. ${ep.name || ('Episode ' + ep.episode_number)}</div>
                <div class="yt-ep-meta">
                  ${isPlaying ? '<span><i class="fa-solid fa-play"></i> Playing now</span>' : `<span>Episode ${ep.episode_number}</span>`}
                  ${ep.air_date ? `<span>&middot; ${ep.air_date.slice(0,4)}</span>` : ''}
                </div>
              </div>
            </div>`;
        }).join('');

        listEl.querySelectorAll('.yt-ep-card').forEach(card => {
          card.addEventListener('click', () => {
            const epNum = parseInt(card.dataset.ep);
            if (epNum === episode) return;
            switchEpisode(epNum);
          });
        });

        const activeCard = listEl.querySelector('.yt-ep-card.active');
        if (activeCard) activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        updatePrevNextBtns(eps.length);
      } catch (e) {
        listEl.innerHTML = '<p style="color:#888;padding:20px;text-align:center">Failed to load episodes.</p>';
      }
    }

    const prevBtn = document.getElementById('btn-prev-ep');
    const nextBtn = document.getElementById('btn-next-ep');

    if (prevBtn) {
      prevBtn.addEventListener('click', async () => {
        if (episode > 1) { switchEpisode(episode - 1); }
        else if (season > 1) {
          season--;
          try {
            const data = await TMDB.seasonDetails(id, season);
            const eps = data.episodes || [];
            episode = eps.length > 0 ? eps.length : 1;
            renderSeasonDropdown(); loadPlayer();
            window.history.replaceState(null, '', `#/watch?type=tv&id=${id}&s=${season}&e=${episode}`);
            await loadWSeason();
          } catch (e) {}
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', async () => {
        const listEl = document.getElementById('sidebar-ep-list');
        const totalEps = listEl ? listEl.querySelectorAll('.yt-ep-card').length : 99;
        if (episode < totalEps) { switchEpisode(episode + 1); }
        else if (season < seasons.length) {
          season++; episode = 1;
          renderSeasonDropdown(); loadPlayer();
          window.history.replaceState(null, '', `#/watch?type=tv&id=${id}&s=${season}&e=${episode}`);
          await loadWSeason();
        }
      });
    }

    const chkAutoplay = document.getElementById('chk-autoplay-next');
    if (chkAutoplay) {
      chkAutoplay.checked = Settings.get().autoplay;
      chkAutoplay.onchange = e => {
        Settings.save({ autoplay: e.target.checked });
        toast(e.target.checked ? 'Autoplay next enabled' : 'Autoplay next disabled');
      };
    }

    renderSeasonDropdown();
    await loadWSeason();
  }

  loadPlayer();
  window.scrollTo({ top: 0 });

  if (watchState && watchState.keyHandler) document.removeEventListener('keydown', watchState.keyHandler);
  if (watchState && watchState.fsHandler) {
    document.removeEventListener('fullscreenchange', watchState.fsHandler);
    document.removeEventListener('webkitfullscreenchange', watchState.fsHandler);
  }
  const keyHandler = (e) => {
    if (['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === 'w') { e.preventDefault(); toggleTheater(); return; }
    if (k === 'f') { e.preventDefault(); toggleFullscreen(); return; }
    if (k === 'escape') { exitTheater(); return; }
    const n = parseInt(e.key);
    if (n >= 1 && n <= PROVIDERS.length) { currentProvider = PROVIDERS[n-1].id; Settings.save({defaultProvider:currentProvider}); loadPlayer(); toast('Server: '+PROVIDERS[n-1].name); }
  };
  document.addEventListener('keydown', keyHandler);
  const fsHandler = () => syncScreenButtons();
  document.addEventListener('fullscreenchange', fsHandler);
  document.addEventListener('webkitfullscreenchange', fsHandler);
  watchState = { keyHandler, fsHandler };
}

/* ============================================================
   ANIME WATCH PAGE (MegaPlay via MAL/AniList/Catalog + Sub/Dub)
   URL: #/anime-watch?type=tv&id={tmdbId}&s=1&e=1
   ============================================================ */
let animeWatchState = null;
async function renderAnimeWatch(params) {
  setChrome('anime-watch');
  const tmdbId = params.id;
  let season = parseInt(params.s) || 1;
  let episode = parseInt(params.e) || 1;
  let lang = Settings.get().animeLang || 'sub';
  let currentAnimeProvider = Settings.get().animeProvider;

  const epWrap = document.getElementById('hdr-episodes-wrap');
  const epBtn = document.getElementById('hdr-btn-episodes');
  const prevBtnHdr = document.getElementById('btn-prev-ep');
  const nextBtnHdr = document.getElementById('btn-next-ep');

  if (epWrap) {
    epWrap.style.display = 'inline-flex';
    epWrap.classList.remove('open');
    if (epBtn) epBtn.onclick = (e) => { e.stopPropagation(); epWrap.classList.toggle('open'); };
  }
  if (prevBtnHdr) prevBtnHdr.style.display = 'inline-flex';
  if (nextBtnHdr) nextBtnHdr.style.display = 'inline-flex';

  app.innerHTML = `
    <div class="watch-container">
      <div class="watch-grid">
        <div class="watch-main-col">
          <div class="player-stage" id="player-stage" tabindex="0"></div>
        </div>
      </div>
    </div>`;

  document.getElementById('watch-back').onclick = () => { location.hash = '#/anime'; };
  const hdrDetailsBtn = document.getElementById('hdr-btn-details');
  if (hdrDetailsBtn) hdrDetailsBtn.onclick = () => { location.hash = `#/details?type=tv&id=${tmdbId}&s=${season}`; };

  let details = null, extIds = {};
  try {
    details = await TMDB.tvDetails(tmdbId);
    extIds = details.external_ids || {};
  } catch (e) {
    document.getElementById('player-stage').innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Could not load anime metadata.</p></div>`;
    return;
  }

  // TMDB does not expose MAL/AniList directly; try to derive from external ids where possible.
  // MegaPlay MAL/AniList require those ids; if unavailable we fall back to TMDB-based anime players.
  const malId = extIds.mal_id || null;        // rarely present
  const anilistId = extIds.anilist_id || null; // rarely present
  const title = details.name || 'Anime';

  const watchTitleEl = document.getElementById('watch-title');
  function updateTag() {
    if (watchTitleEl) watchTitleEl.innerHTML = `<span class="wt-main">${title}</span><span class="wt-tag">EP ${episode} · ${lang.toUpperCase()}</span>`;
  }

  function buildAnimeSrc() {
    const prov = getAnimeProvider(currentAnimeProvider);
    // Choose args based on which provider is active + what ids we have.
    if (prov.id === 'megaplay-mal' && malId) return prov.build({ malId, epNum: episode, lang });
    if (prov.id === 'megaplay-ani' && anilistId) return prov.build({ anilistId, epNum: episode, lang });
    if (prov.id === 'megaplay-s2') {
      // Without a resolved catalog embed id we can't use s-2; fall back.
    }
    // Fallbacks that only need the TMDB id:
    if (malId) return getAnimeProvider('megaplay-mal').build({ malId, epNum: episode, lang });
    if (anilistId) return getAnimeProvider('megaplay-ani').build({ anilistId, epNum: episode, lang });
    return getProvider(Settings.get().defaultProvider || 'vidking').build({ type: 'tv', tmdb: tmdbId, season, episode });
  }

  function loadPlayer() {
    const stage = document.getElementById('player-stage');
    const src = buildAnimeSrc();
    const old = stage.querySelector('iframe'); if (old) old.remove();
    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.setAttribute('allowfullscreen', '');
    iframe.referrerPolicy = 'origin';
    stage.appendChild(iframe);
    updateTag();
    History.record({ id: tmdbId, type: 'tv', title, poster: details.poster_path, backdrop: details.backdrop_path, season, episode, year: (details.first_air_date||'').slice(0,4) });
  }

  window._reloadAnimePlayer = (pid) => {
    if (parseHash().route !== 'anime-watch') return;
    currentAnimeProvider = pid; loadPlayer();
  };

  // Language (sub/dub) toggle inside the episodes dropdown
  const langCont = document.getElementById('w-lang-toggle-container');
  if (langCont) {
    langCont.innerHTML = `<div class="lang-toggle">
      <button data-lang="sub" class="${lang==='sub'?'active':''}">SUB</button>
      <button data-lang="dub" class="${lang==='dub'?'active':''}">DUB</button>
    </div>`;
    langCont.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', () => {
        lang = b.dataset.lang;
        Settings.save({ animeLang: lang });
        langCont.querySelectorAll('button').forEach(x => x.classList.toggle('active', x.dataset.lang === lang));
        loadPlayer();
        toast('Language: ' + lang.toUpperCase());
      });
    });
  }

  // Episodes list from TMDB season
  const seasons = (details.seasons || []).filter(s => s.season_number > 0);
  function renderSeasonDropdown() {
    const container = document.getElementById('w-season-dropdown-container');
    if (!container || !seasons.length) return;
    const options = seasons.map(s => ({ value: s.season_number, label: s.name || `Season ${s.season_number}` }));
    createCustomDropdown({
      container, options, value: season,
      onChange: async (newVal) => {
        season = parseInt(newVal); episode = 1;
        window.history.replaceState(null, '', `#/anime-watch?type=tv&id=${tmdbId}&s=${season}&e=${episode}`);
        loadPlayer(); await loadEps();
      }
    });
  }

  function switchEpisode(epNum) {
    episode = epNum;
    window.history.replaceState(null, '', `#/anime-watch?type=tv&id=${tmdbId}&s=${season}&e=${episode}`);
    loadPlayer();
    const listEl = document.getElementById('sidebar-ep-list');
    if (listEl) {
      listEl.querySelectorAll('.yt-ep-card').forEach(c => c.classList.toggle('active', parseInt(c.dataset.ep) === episode));
      const active = listEl.querySelector('.yt-ep-card.active');
      if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  async function loadEps() {
    const listEl = document.getElementById('sidebar-ep-list');
    const countEl = document.getElementById('sidebar-ep-count');
    if (!listEl) return;
    listEl.innerHTML = `<div class="empty-state" style="padding:30px"><p>Loading episodes…</p></div>`;
    try {
      const data = await TMDB.seasonDetails(tmdbId, season);
      const eps = data.episodes || [];
      if (countEl) countEl.textContent = `${eps.length} episode${eps.length===1?'':'s'}`;
      listEl.innerHTML = eps.map(ep => {
        const isP = ep.episode_number === episode;
        const thumb = ep.still_path ? TMDB.backdrop(ep.still_path, 'w300') : (details.poster_path ? TMDB.poster(details.poster_path, 'w300') : '');
        return `<div class="yt-ep-card ${isP?'active':''}" data-ep="${ep.episode_number}">
          <div class="yt-ep-thumb">${thumb?`<img decoding="async" src="${thumb}" alt="">`:'<div style="width:100%;height:100%;background:#222"></div>'}<span class="ep-badge">E${ep.episode_number}</span></div>
          <div class="yt-ep-info"><div class="yt-ep-title">${ep.episode_number}. ${ep.name||('Episode '+ep.episode_number)}</div><div class="yt-ep-meta"><span>Episode ${ep.episode_number}</span></div></div>
        </div>`;
      }).join('') || '<p style="color:#888;padding:20px;text-align:center">No episodes found.</p>';
      listEl.querySelectorAll('.yt-ep-card').forEach(c => c.addEventListener('click', () => { const n = parseInt(c.dataset.ep); if (n!==episode) switchEpisode(n); }));
    } catch (e) {
      listEl.innerHTML = '<p style="color:#888;padding:20px;text-align:center">Failed to load episodes.</p>';
    }
  }

  const prevBtn = document.getElementById('btn-prev-ep');
  const nextBtn = document.getElementById('btn-next-ep');
  if (prevBtn) prevBtn.onclick = () => { if (episode > 1) switchEpisode(episode - 1); };
  if (nextBtn) nextBtn.onclick = () => { switchEpisode(episode + 1); };

  function toggleFullscreen() {
    const stage = document.getElementById('player-stage'); if (!stage) return;
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fsEl) { const req = stage.requestFullscreen || stage.webkitRequestFullscreen; if (req) try { req.call(stage); } catch(e){} }
    else { const exit = document.exitFullscreen || document.webkitExitFullscreen; if (exit) exit.call(document); }
  }
  const hdrFsBtn = document.getElementById('hdr-btn-fullscreen');
  if (hdrFsBtn) hdrFsBtn.onclick = toggleFullscreen;

  renderSeasonDropdown();
  await loadEps();
  loadPlayer();
  window.scrollTo({ top: 0 });

  if (animeWatchState && animeWatchState.keyHandler) document.removeEventListener('keydown', animeWatchState.keyHandler);
  const keyHandler = (e) => {
    if (['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)) return;
    if (e.key.toLowerCase() === 'f') { e.preventDefault(); toggleFullscreen(); }
  };
  document.addEventListener('keydown', keyHandler);
  animeWatchState = { keyHandler };
}

/* ============================================================
   Router dispatch & Watch Auto-Hide Idle Manager
   ============================================================ */
let watchIdleTimer = null;
function resetWatchIdleTimer() {
  const r = parseHash().route;
  const isWatch = r === 'watch' || r === 'anime-watch';
  if (!isWatch) {
    document.body.classList.remove('watch-active', 'user-idle');
    if (watchIdleTimer) clearTimeout(watchIdleTimer);
    return;
  }
  document.body.classList.add('watch-active');
  document.body.classList.remove('user-idle');
  if (watchIdleTimer) clearTimeout(watchIdleTimer);
  watchIdleTimer = setTimeout(() => {
    const rr = parseHash().route;
    if (rr === 'watch' || rr === 'anime-watch') document.body.classList.add('user-idle');
  }, 3000);
}

['mousemove', 'pointermove', 'mousedown', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
  window.addEventListener(evt, resetWatchIdleTimer, { passive: true });
});

async function render() {
  document.body.classList.remove('theater-open', 'watch-active', 'user-idle');
  if (watchIdleTimer) clearTimeout(watchIdleTimer);
  window._reloadPlayer = null;
  window._reloadAnimePlayer = null;
  const { route, params } = parseHash();
  window.scrollTo({ top: 0 });
  if (route === 'watch') { resetWatchIdleTimer(); return renderWatch(params); }
  if (route === 'anime-watch') { resetWatchIdleTimer(); return renderAnimeWatch(params); }
  if (route === 'details') return renderDetails(params);
  if (route === 'browse') return renderBrowse(params);
  if (route === 'anime') return renderAnime(params);
  return renderHome();
}

/* ============================================================
   Global init
   ============================================================ */
function initGlobal() {
  initFirstTimeNotice();
  buildSettingsDrawer();
  document.getElementById('settings-btn').addEventListener('click', () => window.openSettings());
  document.getElementById('settings-btn-watch').addEventListener('click', () => window.openSettings());

  document.addEventListener('click', (e) => {
    const epWrap = document.getElementById('hdr-episodes-wrap');
    if (epWrap && epWrap.classList.contains('open') && !epWrap.contains(e.target)) {
      epWrap.classList.remove('open');
    }
  });

  const input = document.getElementById('search-input');
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    timer = setTimeout(() => { if (q.length >= 2) location.hash = `#/browse?q=${encodeURIComponent(q)}`; }, 600);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && input.value.trim()) location.hash = `#/browse?q=${encodeURIComponent(input.value.trim())}`;
  });
}

window.addEventListener('hashchange', render);
document.addEventListener('DOMContentLoaded', () => { initGlobal(); render(); });
