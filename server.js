import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

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

// Serve frontend assets
app.use(express.static(__dirname));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
