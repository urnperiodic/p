import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Helper function to normalize 4kHdHub URLs
function normalizeHubUrl(inputUrl) {
  if (!inputUrl) return '';
  let str = inputUrl.trim();

  // If input contains a full 4kHdHub URL, extract it directly
  const urlMatch = str.match(/https?:\/\/[^\s"'<>]+/i);
  if (urlMatch) {
    let u = urlMatch[0];
    if (!u.endsWith('/') && !u.includes('?') && !u.includes('#')) {
      u += '/';
    }
    return u;
  }

  // If it's a slug like i-would-rather-die-series-8257
  const slugMatch = str.match(/([a-z0-9-]+-(?:series|movie)-\d+)/i);
  if (slugMatch) {
    return 'https://4khdhub.one/' + slugMatch[1] + '/';
  }

  if (!str.startsWith('http://') && !str.startsWith('https://')) {
    str = 'https://4khdhub.one/' + str.replace(/^\//, '');
  }
  if (!str.endsWith('/') && !str.includes('?') && !str.includes('#')) {
    str += '/';
  }
  return str;
}

// 1. API: Parse 4kHdHub detail page (movies or series)
app.get('/api/4khdhub/parse', async (req, res) => {
  try {
    const rawUrl = req.query.url || req.query.slug;
    if (!rawUrl) {
      return res.status(400).json({ error: 'Missing url or slug parameter' });
    }

    const targetUrl = normalizeHubUrl(rawUrl);
    const fetchRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!fetchRes.ok) {
      return res.status(fetchRes.status).json({ error: `4kHdHub returned status ${fetchRes.status}` });
    }

    const html = await fetchRes.text();

    // Extract Title
    let title = '';
    const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1].replace(/<[^>]+>/g, '').replace(/- 4K-?HDHub/i, '').trim();
    }

    // Extract Year
    let year = '';
    const yearMatch = title.match(/\((\d{4})\)/) || html.match(/class=\"movie-year\"[^>]*>(\d{4})<\/span>/i);
    if (yearMatch) year = yearMatch[1];

    // Extract Poster & Description
    const ogImg = (html.match(/<meta\s+property=[\"']og:image[\"']\s+content=[\"']([^\"']+)[\"']/i) || [])[1] || '';
    const desc = (html.match(/<meta\s+property=[\"']og:description[\"']\s+content=[\"']([^\"']+)[\"']/i) || [])[1] || '';

    // Check if it is a TV series or movie
    const isSeries = targetUrl.includes('-series-') || 
                     html.includes('Download Individual Episodes') || 
                     html.includes('season-item') || 
                     html.includes('Download Complete Season');

    // Parse Complete Seasons (Zip files)
    const completeSeasons = [];
    const seasonRegex = /<div class=\"download-item[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
    let sm;
    while ((sm = seasonRegex.exec(html)) !== null) {
      const block = sm[1];
      const sNum = (block.match(/class=\"episode-number[^\"]*\">([^<]+)<\/div>/i) || [])[1] || 'Season';
      const headerText = (block.match(/class=\"flex-1[^\"]*\">([\s\S]*?)<\/div>/i) || [])[1] || '';
      const cleanHeader = headerText
        .replace(/<span[^>]*class=\"badge\"[^>]*>([\s\S]*?)<\/span>/gi, '[$1]')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const fileTitle = (block.match(/class=\"file-title\"[^>]*>([^<]+)<\/div>/i) || [])[1] || '';

      const links = [];
      const linkRegex = /<a\s+[^>]*href=[\"']([^\"']+)[\"'][^>]*>([\s\S]*?)<\/a>/gi;
      let lm;
      while ((lm = linkRegex.exec(block)) !== null) {
        if (lm[1].includes('greenmotors') || lm[1].includes('hub') || lm[1].includes('drive') || lm[1].includes('download')) {
          let linkName = lm[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
          links.push({
            name: linkName || 'Download',
            url: lm[1]
          });
        }
      }

      const badges = [];
      const badgeRegex = /<span\s+class=\"badge\"[^>]*>([^<]+)<\/span>/gi;
      let bm;
      while ((bm = badgeRegex.exec(block)) !== null) {
        const text = bm[1].trim();
        if (text && !badges.includes(text)) badges.push(text);
      }

      // Quality tag
      let qualityTag = 'HD';
      if (/2160p|4K|UHD/i.test(cleanHeader + ' ' + fileTitle)) qualityTag = '4K 2160p';
      else if (/1080p/i.test(cleanHeader + ' ' + fileTitle)) qualityTag = '1080p FHD';
      else if (/720p/i.test(cleanHeader + ' ' + fileTitle)) qualityTag = '720p HD';

      if (links.length > 0 || fileTitle) {
        completeSeasons.push({
          season: sNum.trim(),
          title: cleanHeader || fileTitle,
          fileTitle: fileTitle.trim(),
          qualityTag,
          badges,
          links
        });
      }
    }

    // Parse Quality & Episode Groups
    const episodeGroups = [];
    const epGroupRegex = /<div class=\"season-item episode-item[^>]*>([\s\S]*?)(?=<div class=\"season-item episode-item|<div class=\"how-to-download|<footer|<\/main|$)/gi;
    let gm;
    while ((gm = epGroupRegex.exec(html)) !== null) {
      const groupBlock = gm[1];
      const qualityTitle = (groupBlock.match(/class=\"episode-title\"[^>]*>([^<]+)<\/h3>/i) || [])[1] || '';
      const seasonNum = (groupBlock.match(/class=\"episode-number\"[^>]*>([^<]+)<\/div>/i) || [])[1] || '';

      const groupBadges = [];
      const gBadgeRegex = /<span\s+class=\"badge\"[^>]*>([^<]+)<\/span>/gi;
      let gbm;
      const headerPart = groupBlock.split(/class=\"episode-downloads\"/i)[0] || '';
      while ((gbm = gBadgeRegex.exec(headerPart)) !== null) {
        const t = gbm[1].trim();
        if (t && !groupBadges.includes(t)) groupBadges.push(t);
      }

      const episodes = [];
      const epItemRegex = /<div class=\"episode-download-item\"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
      let em;
      while ((em = epItemRegex.exec(groupBlock)) !== null) {
        const epBlock = em[1];
        const epFileTitle = (epBlock.match(/class=\"episode-file-title\"[^>]*>([^<]+)<\/div>/i) || [])[1] || '';
        const epLinks = [];
        const epLinkRegex = /<a\s+[^>]*href=[\"']([^\"']+)[\"'][^>]*>([\s\S]*?)<\/a>/gi;
        let elm;
        while ((elm = epLinkRegex.exec(epBlock)) !== null) {
          if (elm[1].includes('greenmotors') || elm[1].includes('hub') || elm[1].includes('drive') || elm[1].includes('download')) {
            let linkName = elm[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
            epLinks.push({
              name: linkName || 'Download',
              url: elm[1]
            });
          }
        }

        if (epFileTitle || epLinks.length > 0) {
          const epCodeMatch = epFileTitle.match(/S\d+E\d+/i) || epFileTitle.match(/EP?\d+/i);
          episodes.push({
            fileTitle: epFileTitle.trim(),
            epCode: epCodeMatch ? epCodeMatch[0].toUpperCase() : 'EP',
            links: epLinks
          });
        }
      }

      if (qualityTitle || episodes.length > 0) {
        episodeGroups.push({
          season: seasonNum.trim(),
          quality: qualityTitle.trim(),
          badges: groupBadges,
          episodes
        });
      }
    }

    // Parse Movie Downloads
    const movieDownloads = [];
    if (!isSeries || completeSeasons.length > 0) {
      // Movie items are already in completeSeasons or standalone download items
      completeSeasons.forEach(item => {
        movieDownloads.push(item);
      });
    }

    res.json({
      success: true,
      title: title.replace(/\(\d{4}\)/, '').trim(),
      fullTitle: title,
      year,
      poster: ogImg,
      description: desc,
      url: targetUrl,
      type: isSeries ? 'series' : 'movie',
      completeSeasons,
      episodeGroups,
      movieDownloads
    });
  } catch (err) {
    console.error('Error parsing 4kHdHub page:', err);
    res.status(500).json({ error: 'Failed to parse 4kHdHub page: ' + err.message });
  }
});

const searchCache = new Map();
const SEARCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clean search query to prevent encoding issues & handle pasted URLs
function cleanSearchQuery(input) {
  if (!input) return '';
  let str = input.trim();
  // If user pasted a URL or slug, extract title keywords
  if (str.includes('4khdhub') || str.includes('http') || str.includes('-series-') || str.includes('-movie-')) {
    const slugMatch = str.match(/([a-z0-9-]+)-(?:series|movie)-\d+/i);
    if (slugMatch) {
      return slugMatch[1].replace(/-/g, ' ');
    }
    str = str.replace(/https?:\/\/[^\/]+\/?/i, '').replace(/[-_]/g, ' ');
  }
  // Strip out unwanted punctuation that breaks search: colons, quotes, etc.
  return str.replace(/[:"']/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseHubSearchResults(html) {
  const results = [];
  const regex = /<a\s+[^>]*href=[\"']([^\"']+)[\"'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  const seenHrefs = new Set();

  while ((m = regex.exec(html)) !== null) {
    const href = m[1];
    const innerHtml = m[2];

    if (
      (href.startsWith('/') || href.includes('4khdhub.one')) &&
      !href.includes('category') &&
      !href.includes('tag') &&
      !href.includes('page') &&
      !href.includes('about') &&
      !href.includes('contact') &&
      !href.includes('privacy') &&
      !href.includes('dmca') &&
      href !== '/' &&
      href !== 'https://4khdhub.one/'
    ) {
      const fullUrl = href.startsWith('http') ? href : 'https://4khdhub.one' + href;
      if (!seenHrefs.has(fullUrl)) {
        seenHrefs.add(fullUrl);

        const imgMatch = innerHtml.match(/<img[^>]*src=[\"']([^\"']+)[\"']/i) || 
                         innerHtml.match(/data-src=[\"']([^\"']+)[\"']/i) ||
                         innerHtml.match(/srcset=[\"']([^\"'\s,]+)/i);
        const poster = imgMatch ? imgMatch[1] : '';

        const textContent = innerHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (!textContent || textContent.length < 3) continue;

        const yearMatch = textContent.match(/\b(19\d\d|20\d\d)\b/);
        const year = yearMatch ? yearMatch[1] : '';

        const seasonMatch = textContent.match(/S\d+(\.\d+)?(-S\d+(\.\d+)?)?/i);
        const seasonInfo = seasonMatch ? seasonMatch[0] : '';

        const badges = [];
        if (/2160p|4K|UHD/i.test(textContent)) badges.push('4K 2160p');
        if (/HDR/i.test(textContent)) badges.push('HDR');
        if (/1080p/i.test(textContent)) badges.push('1080p');
        if (/720p/i.test(textContent)) badges.push('720p');
        if (/Hindi/i.test(textContent)) badges.push('Hindi');
        if (/English/i.test(textContent)) badges.push('English');
        if (/Series/i.test(textContent) || href.includes('-series-')) badges.push('Series');
        else badges.push('Movie');

        let cleanTitle = textContent;
        const titleLineMatch = innerHtml.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i) || 
                               innerHtml.match(/class=\"[^\"]*title[^\"]*\"[^>]*>([\s\S]*?)<\/[^>]+>/i);
        if (titleLineMatch) {
          cleanTitle = titleLineMatch[1].replace(/<[^>]+>/g, '').trim();
        } else {
          const parts = textContent.split(/\b(19\d\d|20\d\d)\b/);
          if (parts.length > 1) {
            cleanTitle = parts[0].trim() || parts[1].trim();
          }
        }

        results.push({
          url: fullUrl,
          slug: href.replace(/^\//, '').replace(/\/$/, ''),
          rawTitle: textContent,
          title: cleanTitle || textContent,
          year,
          seasonInfo,
          poster,
          badges,
          isSeries: href.includes('-series-') || /series/i.test(textContent)
        });
      }
    }
  }
  return results;
}

// Resilient multi-attempt search against 4kHdHub
async function fetchHubSearch(query) {
  const cleanQ = query.trim();
  const searchUrls = [
    `https://4khdhub.one/?s=${encodeURIComponent(cleanQ)}`,
    `https://4khdhub.one/?s=${encodeURIComponent(cleanQ.replace(/[^\w\s]/g, ' ').trim().replace(/\s+/g, '+'))}`
  ];

  for (const u of searchUrls) {
    try {
      const res = await fetch(u, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://4khdhub.one/'
        },
        signal: AbortSignal.timeout(9000)
      });
      if (res.ok) {
        const html = await res.text();
        const results = parseHubSearchResults(html);
        if (results.length > 0) return results;
      }
    } catch (e) {
      console.warn('Search attempt failed for URL:', u, e.message);
    }
  }

  // If query had multiple words and 0 results found, try first 2-3 significant words
  const words = cleanQ.split(/\s+/).filter(w => w.length > 2 && !/^(the|and|for|with|from|this|allow|downloads)$/i.test(w));
  if (words.length > 1) {
    const simplified = words.slice(0, 3).join(' ');
    try {
      const res = await fetch(`https://4khdhub.one/?s=${encodeURIComponent(simplified)}`, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://4khdhub.one/'
        },
        signal: AbortSignal.timeout(8000)
      });
      if (res.ok) {
        const html = await res.text();
        const results = parseHubSearchResults(html);
        if (results.length > 0) return results;
      }
    } catch (e) {
      console.warn('Fallback simplified search failed:', e.message);
    }
  }

  return [];
}

// 2. API: Search 4kHdHub
app.get('/api/4khdhub/search', async (req, res) => {
  try {
    const rawQ = req.query.q || '';
    const cleanQ = cleanSearchQuery(rawQ);

    if (!cleanQ) {
      return res.json({
        success: true,
        query: rawQ,
        count: 0,
        results: []
      });
    }

    const cacheKey = cleanQ.toLowerCase();
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
      return res.json({
        success: true,
        query: cleanQ,
        count: cached.results.length,
        results: cached.results,
        cached: true
      });
    }

    const results = await fetchHubSearch(cleanQ);

    searchCache.set(cacheKey, {
      results,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      query: cleanQ,
      count: results.length,
      results
    });
  } catch (err) {
    console.error('Error searching 4kHdHub:', err);
    // Never fail with 500! Gracefully return empty results so frontend handles it cleanly
    res.json({
      success: true,
      query: req.query.q || '',
      count: 0,
      results: [],
      error: err.message
    });
  }
});

// 3. API: Latest releases from 4kHdHub
app.get('/api/4khdhub/latest', async (req, res) => {
  try {
    const category = req.query.category || '';
    let targetUrl = 'https://4khdhub.one/';
    if (category === '2160p') targetUrl = 'https://4khdhub.one/category/2160p/';
    else if (category === '1080p') targetUrl = 'https://4khdhub.one/category/1080p/';
    else if (category === 'series') targetUrl = 'https://4khdhub.one/category/series/';

    const fetchRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!fetchRes.ok) {
      return res.status(fetchRes.status).json({ error: `4kHdHub returned ${fetchRes.status}` });
    }

    const html = await fetchRes.text();
    const results = [];
    const regex = /<a\s+[^>]*href=[\"']([^\"']+)[\"'][^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    const seenHrefs = new Set();

    while ((m = regex.exec(html)) !== null) {
      const href = m[1];
      const innerHtml = m[2];

      if (
        (href.startsWith('/') || href.includes('4khdhub.one')) &&
        !href.includes('category') &&
        !href.includes('tag') &&
        !href.includes('page') &&
        !href.includes('about') &&
        !href.includes('contact') &&
        !href.includes('privacy') &&
        !href.includes('dmca') &&
        href !== '/' &&
        href !== 'https://4khdhub.one/'
      ) {
        const fullUrl = href.startsWith('http') ? href : 'https://4khdhub.one' + href;
        if (!seenHrefs.has(fullUrl)) {
          seenHrefs.add(fullUrl);

          const textContent = innerHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          if (!textContent || textContent.length < 3) continue;

          const imgMatch = innerHtml.match(/<img[^>]*src=[\"']([^\"']+)[\"']/i) || 
                           innerHtml.match(/data-src=[\"']([^\"']+)[\"']/i) ||
                           innerHtml.match(/srcset=[\"']([^\"'\s,]+)/i);
          const poster = imgMatch ? imgMatch[1] : '';

          const yearMatch = textContent.match(/\b(19\d\d|20\d\d)\b/);
          const year = yearMatch ? yearMatch[1] : '';

          const badges = [];
          if (/2160p|4K|UHD/i.test(textContent)) badges.push('4K');
          if (/HDR/i.test(textContent)) badges.push('HDR');
          if (/1080p/i.test(textContent)) badges.push('1080p');
          if (/Series/i.test(textContent) || href.includes('-series-')) badges.push('Series');
          else badges.push('Movie');

          results.push({
            url: fullUrl,
            slug: href.replace(/^\//, '').replace(/\/$/, ''),
            rawTitle: textContent,
            title: textContent.replace(/\s+/g, ' '),
            year,
            poster,
            badges,
            isSeries: href.includes('-series-') || /series/i.test(textContent)
          });
        }
      }
    }

    res.json({
      success: true,
      category,
      count: results.length,
      results: results.slice(0, 36)
    });
  } catch (err) {
    console.error('Error fetching latest 4kHdHub releases:', err);
    res.status(500).json({ error: 'Failed to fetch latest releases: ' + err.message });
  }
});

// Ensure /public directory exists
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  try {
    fs.mkdirSync(publicDir, { recursive: true });
  } catch (e) {
    console.error('Failed to create public dir:', e);
  }
}

// 7. API: Scan /public folder for M3U8 files, channels.json, or M3U playlists
app.get(['/api/public/channels', '/api/public-channels'], (req, res) => {
  try {
    if (!fs.existsSync(publicDir)) {
      return res.json({ success: true, count: 0, channels: [] });
    }

    const channels = [];
    const seenUrls = new Set();

    // 1. Check public/channels.json
    const channelsJsonPath = path.join(publicDir, 'channels.json');
    if (fs.existsSync(channelsJsonPath)) {
      try {
        const raw = fs.readFileSync(channelsJsonPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((c, idx) => {
            if (c && (c.url || c.file)) {
              let url = c.url || c.file;
              if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
                url = `/public/${url}`;
              }
              const slug = c.slug || c.id || `public-${idx}-${path.basename(url, path.extname(url)).toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
              channels.push({
                id: slug,
                slug,
                name: c.name || `Public Channel ${idx + 1}`,
                url,
                cat: c.cat || 'public',
                catName: c.catName || 'Local & Public',
                icon: c.icon || 'fa-solid fa-play',
                desc: c.desc || `Channel from /public/channels.json (${url})`,
                isPublic: true,
                isM3u8: true
              });
              seenUrls.add(url);
            }
          });
        }
      } catch (e) {
        console.warn('Failed parsing channels.json:', e);
      }
    }

    // 2. Scan for any .m3u8 files in public/ (including subdirectories)
    function scanDir(dir, relPath = '') {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const rel = relPath ? `${relPath}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          scanDir(fullPath, rel);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.m3u8')) {
          const streamUrl = `/public/${rel}`;
          if (!seenUrls.has(streamUrl)) {
            seenUrls.add(streamUrl);
            const baseName = path.basename(entry.name, path.extname(entry.name));
            const formattedName = baseName
              .replace(/[-_.]+/g, ' ')
              .replace(/\b\w/g, l => l.toUpperCase());
            const slug = `public-${rel.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
            channels.push({
              id: slug,
              slug,
              name: formattedName + ' (Local M3U8)',
              url: streamUrl,
              cat: 'public',
              catName: 'Local & Public',
              icon: 'fa-solid fa-satellite-dish',
              desc: `Local stream file in public/${rel}`,
              isPublic: true,
              isM3u8: true
            });
          }
        }
      }
    }
    scanDir(publicDir);

    // 3. Scan for any .m3u playlists in public/
    try {
      const entries = fs.readdirSync(publicDir);
      for (const file of entries) {
        if (file.toLowerCase().endsWith('.m3u') && !file.toLowerCase().endsWith('.m3u8')) {
          const content = fs.readFileSync(path.join(publicDir, file), 'utf8');
          const lines = content.split('\n');
          let currentName = '';
          let currentLogo = '';
          let currentGroup = '';
          for (let line of lines) {
            line = line.trim();
            if (line.startsWith('#EXTINF:')) {
              const nameMatch = line.match(/,(.+)$/);
              currentName = nameMatch ? nameMatch[1].trim() : 'M3U Channel';
              const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
              currentLogo = logoMatch ? logoMatch[1] : '';
              const groupMatch = line.match(/group-title="([^"]+)"/i);
              currentGroup = groupMatch ? groupMatch[1] : 'Public Playlist';
            } else if (line && !line.startsWith('#')) {
              let url = line;
              if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = url.startsWith('/') ? url : `/public/${url}`;
              }
              if (!seenUrls.has(url)) {
                seenUrls.add(url);
                const slug = `m3u-${channels.length}-${currentName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
                channels.push({
                  id: slug,
                  slug,
                  name: currentName,
                  url,
                  logo: currentLogo,
                  cat: 'public',
                  catName: currentGroup || 'Local & Public',
                  icon: 'fa-solid fa-tv',
                  desc: `Stream from ${file}`,
                  isPublic: true,
                  isM3u8: true
                });
              }
              currentName = '';
              currentLogo = '';
              currentGroup = '';
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error reading M3U playlists:', e);
    }

    res.json({ success: true, count: channels.length, channels });
  } catch (err) {
    console.error('Error scanning public channels:', err);
    res.status(500).json({ error: err.message, channels: [] });
  }
});

// 7b. API: List all files in /public folder
app.get('/api/public/files', (req, res) => {
  try {
    if (!fs.existsSync(publicDir)) {
      return res.json({ success: true, files: [] });
    }
    const files = [];
    function walk(dir, relPath = '') {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        const rel = relPath ? `${relPath}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          walk(full, rel);
        } else if (entry.isFile()) {
          const stats = fs.statSync(full);
          const ext = path.extname(entry.name).toLowerCase();
          files.push({
            name: entry.name,
            relPath: rel,
            url: `/public/${rel}`,
            size: stats.size,
            mtime: stats.mtime,
            isM3u8: ext === '.m3u8',
            isM3u: ext === '.m3u',
            isJson: ext === '.json'
          });
        }
      }
    }
    walk(publicDir);
    res.json({ success: true, files });
  } catch (err) {
    res.status(500).json({ error: err.message, files: [] });
  }
});

// 7c. API: Save / upload a file into /public folder
app.post('/api/public/save', (req, res) => {
  try {
    const { filename, content } = req.body;
    if (!filename || content === undefined) {
      return res.status(400).json({ error: 'Missing filename or content parameter' });
    }
    const safeName = path.basename(filename.replace(/\\/g, '/')).trim();
    if (!safeName || safeName === '.' || safeName === '..') {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    const dest = path.join(publicDir, safeName);
    fs.writeFileSync(dest, typeof content === 'string' ? content : JSON.stringify(content, null, 2), 'utf8');
    res.json({
      success: true,
      message: `File saved to /public/${safeName}`,
      url: `/public/${safeName}`,
      filename: safeName
    });
  } catch (err) {
    console.error('Error saving file in /public:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7d. API: Add a channel reference directly into public/channels.json
app.post('/api/public/add-channel', (req, res) => {
  try {
    const { name, url, cat, icon, desc } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }
    const channelsJsonPath = path.join(publicDir, 'channels.json');
    let channels = [];
    if (fs.existsSync(channelsJsonPath)) {
      try {
        const raw = fs.readFileSync(channelsJsonPath, 'utf8');
        channels = JSON.parse(raw);
        if (!Array.isArray(channels)) channels = [];
      } catch (e) {
        channels = [];
      }
    }

    let resolvedUrl = url.trim();
    if (!resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://') && !resolvedUrl.startsWith('/')) {
      resolvedUrl = `/public/${resolvedUrl}`;
    }

    const slug = 'pub-' + Date.now();
    const newCh = {
      id: slug,
      name: name || path.basename(resolvedUrl, path.extname(resolvedUrl)) || 'Public Channel',
      url: resolvedUrl,
      cat: cat || 'public',
      icon: icon || 'fa-solid fa-satellite-dish',
      desc: desc || `Live stream from ${resolvedUrl}`
    };

    channels.push(newCh);
    fs.writeFileSync(channelsJsonPath, JSON.stringify(channels, null, 2), 'utf8');
    res.json({ success: true, channel: newCh, total: channels.length });
  } catch (err) {
    console.error('Error saving channel to public/channels.json:', err);
    res.status(500).json({ error: err.message });
  }
});

// 8. API: Stream CORS Proxy for external M3U8 streams when needed
app.get('/api/stream/proxy', async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('Missing url param');
    
    let parsedUrl;
    try {
      parsedUrl = new URL(targetUrl);
    } catch (e) {
      return res.status(400).send('Invalid url: ' + e.message);
    }

    const streamRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': parsedUrl.origin
      }
    });

    if (!streamRes.ok) {
      return res.status(streamRes.status).send(`Failed to fetch stream: ${streamRes.statusText}`);
    }

    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    const contentType = streamRes.headers.get('content-type') || 'application/vnd.apple.mpegurl';
    res.setHeader('Content-Type', contentType);

    // If it's an M3U8 text playlist, rewrite relative segment paths
    if (contentType.includes('mpegurl') || contentType.includes('text') || targetUrl.includes('.m3u8')) {
      const body = await streamRes.text();
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
      const lines = body.split('\n').map(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
            const absolute = new URL(trimmed, baseUrl).href;
            return `/api/stream/proxy?url=${encodeURIComponent(absolute)}`;
          } else {
            return `/api/stream/proxy?url=${encodeURIComponent(trimmed)}`;
          }
        }
        return line;
      });
      return res.send(lines.join('\n'));
    }

    // Binary chunks (e.g. .ts video packets)
    const buffer = Buffer.from(await streamRes.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    console.error('Stream proxy error:', err);
    res.status(500).send('Proxy error: ' + err.message);
  }
});

// Serve /public folder with CORS & explicit M3U8 / TS MIME types
app.use('/public', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  if (req.path.endsWith('.m3u8')) {
    res.type('application/vnd.apple.mpegurl');
  } else if (req.path.endsWith('.ts')) {
    res.type('video/mp2t');
  } else if (req.path.endsWith('.m3u')) {
    res.type('application/x-mpegurl');
  }
  next();
}, express.static(publicDir));

// Also serve public files at root fallback
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  if (req.path.endsWith('.m3u8')) {
    res.type('application/vnd.apple.mpegurl');
  } else if (req.path.endsWith('.ts')) {
    res.type('video/mp2t');
  }
  next();
}, express.static(publicDir));

// Serve general frontend assets
app.use(express.static(__dirname));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
