/**
 * ========================================================================
 * CUSTOM MOVIE & TV STREAM SOURCES (M3U8 & DIRECT VIDEO FILES)
 * ========================================================================
 * 
 * HOW TO MANUALLY EDIT THIS FILE:
 * ------------------------------------------------------------------------
 * 1. To add a new movie or TV show, simply add an entry to CUSTOM_MOVIE_SOURCES below.
 * 2. You can match movies by:
 *    - `id`: The TMDB ID (e.g., 550 for Fight Club, 27205 for Inception)
 *            OR a custom slug/ID string like 'my-favorite-movie'
 *    - `imdb_id`: The IMDb ID (e.g., 'tt0137523')
 * 3. For each movie, add one or more `.m3u8` (HLS) or `.mp4` stream sources in the `sources` array.
 * 
 * EXAMPLE MOVIE FORMAT:
 * {
 *   id: 550,                                // TMDB ID or custom string
 *   title: "Fight Club",
 *   year: "1999",
 *   type: "movie",                          // "movie" or "tv"
 *   poster: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
 *   backdrop: "https://image.tmdb.org/t/p/original/hZkgoQYus5vegHoetLkCJzb17zJ.jpg",
 *   overview: "An insomniac office worker and a devil-may-care soap maker form an underground fight club...",
 *   rating: 8.4,
 *   sources: [
 *     {
 *       name: "Master HLS (1080p)",
 *       quality: "1080p FHD",
 *       url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
 *       type: "m3u8"                        // "m3u8" or "direct"
 *     },
 *     {
 *       name: "Backup 4K Stream",
 *       quality: "4K UHD",
 *       url: "https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8",
 *       type: "m3u8"
 *     }
 *   ]
 * }
 * 
 * EXAMPLE TV SERIES FORMAT:
 * {
 *   id: 1399,                               // TMDB ID for Game of Thrones
 *   title: "Game of Thrones",
 *   type: "tv",
 *   sources: {
 *     "1-1": [                              // Season 1, Episode 1
 *       { name: "S01E01 1080p HLS", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", quality: "1080p", type: "m3u8" }
 *     ],
 *     "1-2": [                              // Season 1, Episode 2
 *       { name: "S01E02 1080p HLS", url: "https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8", quality: "1080p", type: "m3u8" }
 *     ]
 *   }
 * }
 */

window.CUSTOM_MOVIE_SOURCES = [
  {
    id: "big-buck-bunny",
    title: "Big Buck Bunny (4K Ultra HD)",
    year: "2008",
    type: "movie",
    rating: 7.9,
    poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/600px-Big_buck_bunny_poster_big.jpg",
    backdrop: "https://peach.blender.org/wp-content/uploads/bbb-splash.png",
    overview: "A large and lovable rabbit deals with bullying forest creatures in this iconic open-source 4K animated short film.",
    sources: [
      {
        name: "Mux HLS 4K Stream",
        quality: "4K 60fps",
        url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
        type: "m3u8",
        isDefault: true
      },
      {
        name: "Akamai Multi-Bitrate HLS",
        quality: "1080p FHD",
        url: "https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8",
        type: "m3u8"
      }
    ]
  },
  {
    id: "sintel-4k",
    title: "Sintel (Fantasy / Adventure 4K)",
    year: "2010",
    type: "movie",
    rating: 8.1,
    poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Sintel_poster.jpg/600px-Sintel_poster.jpg",
    backdrop: "https://durian.blender.org/wp-content/uploads/2010/09/sintel_desktop_4k.png",
    overview: "A lonely young woman, Sintel, helps and befriends a baby dragon, whom she names Scales. When Scales is kidnapped, she embarks on an epic quest to find him.",
    sources: [
      {
        name: "Official HLS 4K Master",
        quality: "4K UHD",
        url: "https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8",
        type: "m3u8",
        isDefault: true
      }
    ]
  },
  {
    id: "tears-of-steel",
    title: "Tears of Steel (Sci-Fi 4K)",
    year: "2012",
    type: "movie",
    rating: 7.2,
    poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Tears_of_Steel_poster.jpg/600px-Tears_of_Steel_poster.jpg",
    backdrop: "https://mango.blender.org/wp-content/uploads/2012/09/01_thom_celia_bridge.jpg",
    overview: "In a dystopian future, a group of warriors and scientists gather at the Oude Kerk in Amsterdam to stage a crucial event to save humanity.",
    sources: [
      {
        name: "Unified Streaming HLS Master",
        quality: "1080p Multi-Track",
        url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
        type: "m3u8",
        isDefault: true
      }
    ]
  },
  {
    id: "cosmos-laundromat",
    title: "Cosmos Laundromat (First Cycle)",
    year: "2015",
    type: "movie",
    rating: 7.6,
    poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Cosmos_Laundromat_Poster.jpg/600px-Cosmos_Laundromat_Poster.jpg",
    backdrop: "https://cloud.blender.org/p/cosmos-laundromat/561bcf70c379cf04b0870919",
    overview: "On a desolate island, a suicidal sheep named Franck meets a mysterious salesman who offers him the gift of a lifetime.",
    sources: [
      {
        name: "Akamai HLS Stream",
        quality: "1080p FHD",
        url: "https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8",
        type: "m3u8",
        isDefault: true
      }
    ]
  },
  // Example TMDB Mapped Movies:
  // When users watch these TMDB titles via search or browse, the custom M3U8 source will be available in the server selector!
  {
    id: 550, // Fight Club
    title: "Fight Club",
    year: "1999",
    type: "movie",
    sources: [
      {
        name: "Custom HLS 1080p M3U8",
        quality: "1080p Stream",
        url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
        type: "m3u8"
      }
    ]
  },
  {
    id: 27205, // Inception
    title: "Inception",
    year: "2010",
    type: "movie",
    sources: [
      {
        name: "Custom 4K M3U8 Stream",
        quality: "4K Stream",
        url: "https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8",
        type: "m3u8"
      }
    ]
  },
  {
    id: 157336, // Interstellar
    title: "Interstellar",
    year: "2014",
    type: "movie",
    sources: [
      {
        name: "Custom Master HLS M3U8",
        quality: "1080p Stream",
        url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
        type: "m3u8"
      }
    ]
  }
];

/**
 * Helper to find custom M3U8 / stream sources for a given movie or TV show.
 */
window.getCustomSourcesForMedia = function(mediaId, type = 'movie', season = 1, episode = 1) {
  if (!window.CUSTOM_MOVIE_SOURCES || !Array.isArray(window.CUSTOM_MOVIE_SOURCES)) return [];
  
  const targetIdStr = String(mediaId).trim().toLowerCase();
  const found = window.CUSTOM_MOVIE_SOURCES.find(item => {
    return String(item.id).toLowerCase() === targetIdStr || 
           (item.imdb_id && item.imdb_id.toLowerCase() === targetIdStr) ||
           (item.slug && item.slug.toLowerCase() === targetIdStr);
  });

  if (!found) return [];

  if (type === 'tv' && found.sources && typeof found.sources === 'object' && !Array.isArray(found.sources)) {
    const epKey = `${season}-${episode}`;
    const epList = found.sources[epKey] || found.sources[`s${season}e${episode}`] || found.sources[`S${season}E${episode}`];
    return epList || [];
  }

  if (Array.isArray(found.sources)) {
    return found.sources;
  }

  return [];
};
