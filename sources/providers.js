/**
 * ========================================================================
 * STREAMING EMBED PROVIDERS CONFIGURATION
 * ========================================================================
 * 
 * Edit this file to add, modify, reorder, or remove TMDB embed servers & anime providers!
 * 
 * PROVIDER OBJECT STRUCTURE:
 * ------------------------------------------------------------------------
 * {
 *   id: 'myprovider',              // Unique alphanumeric ID
 *   name: 'My Provider Name',       // Display name in server menu
 *   recommended: true,             // true to pin near top of server list
 *   badge: 'Ad-Free · Fast',       // Tagline/badge displayed in UI
 *   build({ type, tmdb, season, episode, opt, progress }) {
 *     // Return the full iframe URL string for this movie / TV episode
 *     return type === 'movie'
 *       ? `https://myprovider.com/embed/movie/${tmdb}`
 *       : `https://myprovider.com/embed/tv/${tmdb}/${season}/${episode}`;
 *   }
 * }
 */

window.STREAM_PROVIDERS = [
  /* ---------------- RECOMMENDED SERVERS ---------------- */
  {
    id: 'vidy',
    name: 'Vidy',
    recommended: true,
    badge: 'Default · Featured · Vidy.st',
    build({ type, tmdb, season, episode, opt, progress }) {
      let base = type === 'movie' ? `https://vidy.st/movie/${tmdb}` : `https://vidy.st/tv/${tmdb}/${season || 1}/${episode || 1}`;
      const p = new URLSearchParams();
      if (opt && opt.color) p.set('color', opt.color.replace('#', ''));
      if (progress && progress > 0) p.set('progress', Math.floor(progress));
      if (type === 'tv') {
        p.set('nextEpisode', 'true');
        p.set('episodeSelector', 'true');
        p.set('autoplayNextEpisode', opt && opt.autoplay === false ? 'false' : 'true');
      }
      const qs = p.toString();
      return qs ? `${base}?${qs}` : base;
    }
  },
  {
    id: 'vidlinkpro',
    name: 'VidLink Pro',
    recommended: true,
    badge: 'Ad-Free',
    build({ type, tmdb, season, episode, opt }) {
      let base = type === 'movie' ? `https://vidlink.pro/movie/${tmdb}` : `https://vidlink.pro/tv/${tmdb}/${season}/${episode}`;
      const p = new URLSearchParams();
      if (opt && opt.color) p.set('primaryColor', opt.color);
      p.set('autoplay', opt && opt.autoplay === false ? 'false' : 'true');
      if (type === 'tv') p.set('nextbutton', 'true');
      const qs = p.toString();
      return qs ? `${base}?${qs}` : base;
    }
  },
  {
    id: 'videasy',
    name: 'Videasy',
    recommended: true,
    badge: 'Ad-Free & Great UI',
    build({ type, tmdb, season, episode, opt }) {
      let base = type === 'movie' ? `https://player.videasy.net/movie/${tmdb}` : `https://player.videasy.net/tv/${tmdb}/${season}/${episode}`;
      const p = new URLSearchParams();
      if (opt && opt.color) p.set('color', opt.color);
      if (type === 'tv') p.set('nextEpisode', 'true');
      const qs = p.toString();
      return qs ? `${base}?${qs}` : base;
    }
  },
  {
    id: 'vidfast',
    name: 'Vidfast',
    recommended: true,
    badge: 'Fast & HD',
    build({ type, tmdb, season, episode, opt }) {
      let base = type === 'movie' ? `https://vidfast.pro/movie/${tmdb}` : `https://vidfast.pro/tv/${tmdb}/${season}/${episode}`;
      const p = new URLSearchParams();
      if (opt && opt.color) p.set('theme', opt.color);
      p.set('autoPlay', opt && opt.autoplay === false ? 'false' : 'true');
      if (type === 'tv') p.set('nextButton', 'true');
      const qs = p.toString();
      return qs ? `${base}?${qs}` : base;
    }
  },
  {
    id: 'autoembed',
    name: 'AutoEmbed',
    recommended: true,
    badge: 'Multi-Language',
    build({ type, tmdb, season, episode }) {
      return type === 'movie' ? `https://player.autoembed.cc/embed/movie/${tmdb}` : `https://player.autoembed.cc/embed/tv/${tmdb}/${season}/${episode}`;
    }
  },
  {
    id: 'superembed',
    name: 'SuperEmbed',
    recommended: true,
    badge: 'Multi-Server Balancing',
    build({ type, tmdb, season, episode }) {
      return type === 'movie' ? `https://multiembed.mov/?video_id=${tmdb}&tmdb=1` : `https://multiembed.mov/?video_id=${tmdb}&tmdb=1&s=${season}&e=${episode}`;
    }
  },
  {
    id: 'embedsu',
    name: 'Embed.su',
    recommended: true,
    badge: 'Great Uptime',
    build({ type, tmdb, season, episode }) {
      return type === 'movie' ? `https://embed.su/embed/movie/${tmdb}` : `https://embed.su/embed/tv/${tmdb}/${season}/${episode}`;
    }
  },

  /* ---------------- BACKUP & WEB EMBED SERVERS ---------------- */
  {
    id: 'vidcore',
    name: 'VidCore',
    recommended: false,
    badge: 'Fast & Clean',
    build({ type, tmdb, season, episode }) {
      return type === 'movie' ? `https://vidcore.org/embed/movie/${tmdb}` : `https://vidcore.org/embed/tv/${tmdb}/${season}/${episode}`;
    }
  },
  {
    id: 'yapgrid',
    name: 'YapGrid',
    recommended: false,
    badge: 'Ad-Free Player',
    build({ type, tmdb, season, episode }) {
      return type === 'movie' ? `https://yapgrid.com/embed/movie/${tmdb}` : `https://yapgrid.com/embed/tv/${tmdb}/${season}/${episode}`;
    }
  },
  {
    id: 'embedmaster',
    name: 'EmbedMaster',
    recommended: false,
    badge: 'Multi-Source HD',
    build({ type, tmdb, season, episode }) {
      return type === 'movie' ? `https://embedmaster.link/movie/${tmdb}` : `https://embedmaster.link/tv/${tmdb}/${season}/${episode}`;
    }
  },
  {
    id: 'vidsrcicu',
    name: 'VidSrc.icu',
    recommended: false,
    badge: 'High Uptime',
    build({ type, tmdb, season, episode }) {
      return type === 'movie' ? `https://vidsrc.icu/embed/movie/${tmdb}` : `https://vidsrc.icu/embed/tv/${tmdb}/${season}/${episode}`;
    }
  },
  {
    id: 'nexstream',
    name: 'NexStream',
    recommended: false,
    badge: 'Adaptive Bitrate',
    build({ type, tmdb, season, episode }) {
      return type === 'movie' ? `https://nexstream.net/embed/movie/${tmdb}` : `https://nexstream.net/embed/tv/${tmdb}/${season}/${episode}`;
    }
  },
  {
    id: 'vidsrcto',
    name: 'VidSrc.to',
    recommended: false,
    badge: 'Alt Endpoint · Subs',
    build({ type, tmdb, season, episode }) {
      return type === 'movie' ? `https://vidsrc.to/embed/movie/${tmdb}` : `https://vidsrc.to/embed/tv/${tmdb}/${season}/${episode}`;
    }
  },
  {
    id: 'vidbinge',
    name: 'VidBinge',
    recommended: false,
    badge: '4K Sources',
    build({ type, tmdb, season, episode }) {
      return type === 'movie' ? `https://vidbinge.dev/embed/movie/${tmdb}` : `https://vidbinge.dev/embed/tv/${tmdb}/${season}/${episode}`;
    }
  },
  {
    id: 'smashystream',
    name: 'SmashyStream',
    recommended: false,
    badge: 'Multi-Source',
    build({ type, tmdb, season, episode }) {
      return type === 'movie' ? `https://embed.smashystream.com/playere.php?tmdb=${tmdb}` : `https://embed.smashystream.com/playere.php?tmdb=${tmdb}&season=${season}&episode=${episode}`;
    }
  },
  {
    id: 'spencerdevs',
    name: 'SpenceDevs',
    recommended: false,
    badge: 'Ad-Free',
    build({ type, tmdb, season, episode }) {
      return type === 'movie' ? `https://spencerdevs.xyz/movie/${tmdb}` : `https://spencerdevs.xyz/tv/${tmdb}/${season}/${episode}`;
    }
  },
  {
    id: 'rivestream',
    name: 'RiveStream',
    recommended: false,
    badge: 'Multi-Provider',
    build({ type, tmdb, season, episode }) {
      return type === 'movie' ? `https://rivestream.live/embed?type=movie&id=${tmdb}` : `https://rivestream.live/embed?type=tv&id=${tmdb}&season=${season}&episode=${episode}`;
    }
  },
  {
    id: 'moviesapi',
    name: 'MoviesAPI',
    recommended: false,
    badge: 'Backup · HD',
    build({ type, tmdb, season, episode }) {
      return type === 'movie' ? `https://moviesapi.club/movie/${tmdb}` : `https://moviesapi.club/tv/${tmdb}-${season}-${episode}`;
    }
  },
  {
    id: 'vidsrcme',
    name: 'VidSrc.me',
    recommended: false,
    badge: 'Classic · Wide DB',
    build({ type, tmdb, season, episode }) {
      return type === 'movie' ? `https://vidsrc.me/embed/movie?tmdb=${tmdb}` : `https://vidsrc.me/embed/tv?tmdb=${tmdb}&season=${season}&episode=${episode}`;
    }
  },
  {
    id: 'vidsrcxyz',
    name: 'VidSrc.xyz',
    recommended: false,
    badge: 'Mirror · Wide DB',
    build({ type, tmdb, season, episode }) {
      return type === 'movie' ? `https://vidsrc.xyz/embed/movie?tmdb=${tmdb}` : `https://vidsrc.xyz/embed/tv?tmdb=${tmdb}&season=${season}&episode=${episode}`;
    }
  },
  {
    id: 'vidsrcvip',
    name: 'VidSrc.vip',
    recommended: false,
    badge: 'HD · Fast',
    build({ type, tmdb, season, episode }) {
      return type === 'movie' ? `https://vidsrc.vip/embed/movie/${tmdb}` : `https://vidsrc.vip/embed/tv/${tmdb}/${season}/${episode}`;
    }
  },
  {
    id: 'vidsrcpro',
    name: 'VidSrc.pro',
    recommended: false,
    badge: 'Alt Mirror',
    build({ type, tmdb, season, episode }) {
      return type === 'movie' ? `https://vidsrc.pro/embed/movie/${tmdb}` : `https://vidsrc.pro/embed/tv/${tmdb}/${season}/${episode}`;
    }
  },
  {
    id: 'twoembed',
    name: '2Embed',
    recommended: false,
    badge: 'Backup',
    build({ type, tmdb, season, episode }) {
      return type === 'movie' ? `https://www.2embed.cc/embed/${tmdb}` : `https://www.2embed.cc/embedtv/${tmdb}&s=${season}&e=${episode}`;
    }
  },
  {
    id: 'cinescrape',
    name: '2Embed.skin',
    recommended: false,
    badge: 'Legacy Mirror',
    build({ type, tmdb, season, episode }) {
      return type === 'movie' ? `https://2embed.skin/embed/${tmdb}` : `https://2embed.skin/embedtv/${tmdb}&s=${season}&e=${episode}`;
    }
  },
  {
    id: 'vidsrccc',
    name: 'VidSrc.cc',
    recommended: false,
    badge: 'HD',
    build({ type, tmdb, season, episode, opt }) {
      let base = type === 'movie' ? `https://vidsrc.cc/v2/embed/movie/${tmdb}` : `https://vidsrc.cc/v2/embed/tv/${tmdb}/${season}/${episode}`;
      return base + (opt && opt.autoplay === false ? '?autoPlay=false' : '?autoPlay=true');
    }
  },
  {
    id: 'nontongo',
    name: 'NontonGo',
    recommended: false,
    badge: 'Backup',
    build({ type, tmdb, season, episode }) {
      return type === 'movie' ? `https://www.NontonGo.win/embed/movie/${tmdb}` : `https://www.NontonGo.win/embed/tv/${tmdb}/${season}/${episode}`;
    }
  }
];

/* ============================================================
   ANIME PROVIDERS CONFIGURATION
   ============================================================ */
window.ANIME_PROVIDERS = [
  {
    id: 'vidy-anime',
    name: 'Vidy Anime',
    recommended: true,
    badge: 'AniList ID · Vidy.st',
    build({ anilistId, epNum, opt, progress }) {
      let base = `https://vidy.st/anime/${anilistId}/${epNum || 1}`;
      const p = new URLSearchParams();
      if (opt && opt.color) p.set('color', opt.color.replace('#', ''));
      if (progress && progress > 0) p.set('progress', Math.floor(progress));
      p.set('nextEpisode', 'true');
      p.set('episodeSelector', 'true');
      p.set('autoplayNextEpisode', opt && opt.autoplay === false ? 'false' : 'true');
      const qs = p.toString();
      return qs ? `${base}?${qs}` : base;
    }
  },
  {
    id: 'megaplay-mal',
    name: 'MegaPlay (MAL)',
    badge: 'MAL ID',
    build({ malId, epNum, lang }) {
      return `https://megaplay.buzz/stream/mal/${malId}/${epNum}/${lang || 'sub'}`;
    }
  },
  {
    id: 'megaplay-ani',
    name: 'MegaPlay (AniList)',
    badge: 'AniList ID',
    build({ anilistId, epNum, lang }) {
      return `https://megaplay.buzz/stream/ani/${anilistId}/${epNum}/${lang || 'sub'}`;
    }
  },
  {
    id: 'megaplay-s2',
    name: 'MegaPlay (Catalog)',
    badge: 'Catalog ID',
    build({ embedId, lang }) {
      return `https://megaplay.buzz/stream/s-2/${embedId}/${lang || 'sub'}`;
    }
  }
];

window.getProvider = function(id) {
  const list = window.STREAM_PROVIDERS || [];
  return list.find(p => p.id === id) || list[0];
};

window.getAnimeProvider = function(id) {
  const animeList = window.ANIME_PROVIDERS || [];
  const streamList = window.STREAM_PROVIDERS || [];
  return animeList.find(p => p.id === id) || streamList.find(p => p.id === id) || animeList[0];
};
