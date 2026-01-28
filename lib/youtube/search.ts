/**
 * YouTube Search Service for English Learning
 * Multi-tier fallback strategy to ensure reliability:
 * 1. RSS Feed (free, official, recommended)
 * 2. HTML scraping (free, lightweight fallback)
 * 3. YouTube API (optional, requires quota)
 */

/**
 * Fetch with timeout and retry mechanism
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = 10000,
  maxRetries: number = 2
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`);
        }
        throw error;
      }
    } catch (error: any) {
      lastError = error;
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt), 3000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }
  
  throw lastError || new Error('Fetch failed after retries');
}

export interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  duration?: string;
}

export interface YouTubeSearchResult {
  videos: YouTubeVideo[];
  source: 'rss' | 'html' | 'api' | 'cache';
  error?: string;
}

/**
 * Search YouTube using RSS Feed (free, official)
 * RSS Feed: https://www.youtube.com/feeds/videos.xml?search_query=...
 */
async function searchViaRSS(query: string): Promise<YouTubeVideo[]> {
  const tryOnce = async (q: string): Promise<YouTubeVideo[] | null> => {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?search_query=${encodeURIComponent(q)}`;
    const response = await fetchWithTimeout(
      rssUrl,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/atom+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      },
      10000, // 10 second timeout
      1 // 1 retry
    );
    
    if (!response.ok) return null;
    
    const xmlText = await response.text();
    const entryMatches = xmlText.matchAll(/<entry[^>]*>([\s\S]*?)<\/entry>/g);
    const videos: YouTubeVideo[] = [];

    for (const [, entryContent] of Array.from(entryMatches).slice(0, 6)) {
      try {
        const videoIdMatch = entryContent.match(/<yt:videoId>(.*?)<\/yt:videoId>/) ||
                            entryContent.match(/<videoId>(.*?)<\/videoId>/) ||
                            entryContent.match(/<link[^>]*href=["']([^"']*)["'][^>]*>/);
        
        let videoId: string | null = null;
        if (videoIdMatch && videoIdMatch[1]) {
          if (videoIdMatch[1].includes('youtube.com') || videoIdMatch[1].includes('youtu.be')) {
            videoId = extractVideoIdFromUrl(videoIdMatch[1]);
          } else {
            videoId = videoIdMatch[1];
          }
        }

        if (!videoId) continue;

        const titleMatch = entryContent.match(/<title[^>]*>(.*?)<\/title>/);
        const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/, '$1').trim() : '';

        const descMatch = entryContent.match(/<media:description[^>]*>(.*?)<\/media:description>/) ||
                         entryContent.match(/<description[^>]*>(.*?)<\/description>/);
        const description = descMatch ? descMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/, '$1').trim() : '';

        const publishedMatch = entryContent.match(/<published[^>]*>(.*?)<\/published>/) ||
                             entryContent.match(/<pubDate[^>]*>(.*?)<\/pubDate>/);
        const publishedAt = publishedMatch ? publishedMatch[1].trim() : new Date().toISOString();

        const authorMatch = entryContent.match(/<author[^>]*>[\s\S]*?<name[^>]*>(.*?)<\/name>[\s\S]*?<\/author>/) ||
                           entryContent.match(/<media:credit[^>]*>(.*?)<\/media:credit>/);
        const channelTitle = authorMatch ? authorMatch[1].trim() : 'Unknown';

        const thumbnailMatch = entryContent.match(/<media:thumbnail[^>]*url=["']([^"']*)["']/) ||
                               entryContent.match(/<thumbnail[^>]*url=["']([^"']*)["']/);
        const thumbnail = thumbnailMatch ? thumbnailMatch[1] : 
                         `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

        videos.push({
          videoId,
          title,
          description: description.substring(0, 200).trim(),
          thumbnail,
          channelTitle,
          publishedAt,
        });
      } catch (entryError) {
        console.warn('[YouTube RSS] Failed to parse entry:', entryError);
        continue;
      }
    }

    return videos;
  };

  try {
    // Try original query
    const v1 = await tryOnce(query);
    if (v1 && v1.length > 0) return v1;

    // Try sanitized query
    const sanitized = query
      .replace(/[^\p{L}\p{N}\s+_-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (sanitized) {
      const v2 = await tryOnce(sanitized);
      if (v2 && v2.length > 0) return v2;
    }

    // Try shortened query (first 3 words)
    const tokens = (sanitized || query).split(' ').filter(Boolean).slice(0, 3);
    const shortened = tokens.join(' ').slice(0, 60).trim();
    if (shortened) {
      const v3 = await tryOnce(shortened);
      if (v3 && v3.length > 0) return v3;
    }

    throw new Error('RSS feed returned no results');
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[YouTube RSS] Search failed:', error instanceof Error ? error.message : error);
    }
    throw error;
  }
}

/**
 * Extract video ID from YouTube URL
 */
function extractVideoIdFromUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Search YouTube using HTML scraping (fallback)
 */
async function searchViaHTML(query: string): Promise<YouTubeVideo[]> {
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    
    const response = await fetchWithTimeout(
      searchUrl,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
      10000, // 10 second timeout
      1 // 1 retry
    );

    if (!response.ok) {
      throw new Error(`HTML search returned ${response.status}`);
    }

    const html = await response.text();
    
    // Try to extract from initial data
    const initialDataMatch = html.match(/(?:var\s+ytInitialData|ytInitialData|window\["ytInitialData"\])\s*=\s*({[\s\S]*?});/);
    
    if (initialDataMatch) {
      try {
        const initialData = JSON.parse(initialDataMatch[1]);
        const videos = extractVideosFromInitialData(initialData);
        if (videos.length > 0) {
          return videos.slice(0, 6);
        }
      } catch (parseError) {
        console.warn('[YouTube HTML] Failed to parse initial data:', parseError);
      }
    }

    // Fallback: extract video IDs from HTML
    const videoMatches = html.matchAll(/watch\?v=([a-zA-Z0-9_-]{11})/g);
    const videoIds = Array.from(new Set(Array.from(videoMatches).map(m => m[1]))).slice(0, 6);
    
    if (videoIds.length === 0) {
      throw new Error('No videos found in HTML response');
    }

    return videoIds.map(videoId => ({
      videoId,
      title: `${query} - Video`,
      description: '',
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      channelTitle: 'YouTube',
      publishedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.error('[YouTube HTML] Search failed:', error);
    throw error;
  }
}

/**
 * Extract videos from YouTube's initial data JSON
 */
function extractVideosFromInitialData(data: any): YouTubeVideo[] {
  const videos: YouTubeVideo[] = [];
  
  function searchInObject(obj: any): void {
    if (!obj || typeof obj !== 'object') return;
    
    if (obj.videoId && obj.title?.runs?.[0]?.text) {
      const video: YouTubeVideo = {
        videoId: obj.videoId,
        title: obj.title.runs[0].text,
        description: obj.descriptionSnippet?.runs?.map((r: any) => r.text).join('')?.substring(0, 200) || '',
        thumbnail: obj.thumbnail?.thumbnails?.[obj.thumbnail.thumbnails.length - 1]?.url || 
                  `https://img.youtube.com/vi/${obj.videoId}/mqdefault.jpg`,
        channelTitle: obj.shortBylineText?.runs?.[0]?.text || 'Unknown',
        publishedAt: obj.publishedTimeText?.simpleText || new Date().toISOString(),
      };
      videos.push(video);
      return;
    }
    
    if (Array.isArray(obj)) {
      for (const item of obj) {
        searchInObject(item);
      }
    } else {
      for (const key in obj) {
        if (key !== 'videoId' && obj.hasOwnProperty(key)) {
          searchInObject(obj[key]);
        }
      }
    }
  }
  
  searchInObject(data);
  return videos;
}

/**
 * Search YouTube using official API (optional, requires API key)
 */
async function searchViaAPI(query: string): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    throw new Error('YouTube API key not configured');
  }

  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.set('key', apiKey);
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('q', query);
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('maxResults', '6');
  searchUrl.searchParams.set('order', 'relevance');
  searchUrl.searchParams.set('safeSearch', 'strict');
  searchUrl.searchParams.set('videoEmbeddable', 'true');

  const response = await fetchWithTimeout(
    searchUrl.toString(),
    {},
    10000, // 10 second timeout
    1 // 1 retry
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`YouTube API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  return (data.items || []).map((item: any) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
  }));
}

/**
 * Smart YouTube search with multi-tier fallback
 * Priority: RSS Feed -> HTML Scraping -> API
 */
export async function searchYouTube(query: string): Promise<YouTubeSearchResult> {
  const errors: string[] = [];
  
  // Try RSS Feed first (free, official, recommended)
  try {
    const rssVideos = await searchViaRSS(query);
    if (rssVideos.length > 0) {
      return {
        videos: rssVideos,
        source: 'rss',
      };
    }
  } catch (rssError) {
    const errorMsg = rssError instanceof Error ? rssError.message : 'RSS search failed';
    errors.push(`RSS: ${errorMsg}`);
    if (process.env.NODE_ENV === 'development') {
      console.log('[YouTube Search] RSS unavailable, trying HTML fallback');
    }
  }

  // Fallback to HTML scraping
  try {
    const htmlVideos = await searchViaHTML(query);
    if (htmlVideos.length > 0) {
      return {
        videos: htmlVideos,
        source: 'html',
      };
    }
  } catch (htmlError) {
    const errorMsg = htmlError instanceof Error ? htmlError.message : 'HTML search failed';
    errors.push(`HTML: ${errorMsg}`);
    if (process.env.NODE_ENV === 'development') {
      console.warn('[YouTube Search] HTML scraping failed, trying API:', htmlError);
    }
  }

  // Last resort: Use YouTube API (if available)
  try {
    const apiVideos = await searchViaAPI(query);
    if (apiVideos.length > 0) {
      return {
        videos: apiVideos,
        source: 'api',
      };
    }
  } catch (apiError) {
    const errorMsg = apiError instanceof Error ? apiError.message : 'API search failed';
    errors.push(`API: ${errorMsg}`);
    if (process.env.NODE_ENV === 'development') {
      console.error('[YouTube Search] API failed:', apiError);
    }
  }

  // All methods failed - return empty result with error info
  const errorMessage = errors.length > 0 
    ? `All search methods failed: ${errors.join('; ')}`
    : 'No videos found';
  
  return {
    videos: [],
    source: 'api',
    error: errorMessage,
  };
}
