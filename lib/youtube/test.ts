/**
 * YouTube Search Test Utility
 * Simple test script to verify YouTube search functionality
 * Run this in development console or Node.js
 */

import { searchYouTube } from './search';

/**
 * Test YouTube search with various queries
 */
export async function testYouTubeSearch() {
  console.log('🧪 Testing YouTube Search Functionality\n');
  
  const testQueries = [
    'hello English pronunciation',
    'how are you English usage',
    'thank you English example',
  ];

  for (const query of testQueries) {
    console.log(`\n🔍 Testing: "${query}"`);
    console.log('─'.repeat(60));
    
    try {
      const result = await searchYouTube(query);
      
      if (result.error) {
        console.error(`❌ Error: ${result.error}`);
        continue;
      }
      
      console.log(`✅ Success! Found ${result.videos.length} videos`);
      console.log(`📡 Source: ${result.source}`);
      
      if (result.videos.length > 0) {
        console.log('\n📹 Videos:');
        result.videos.slice(0, 3).forEach((video, i) => {
          console.log(`  ${i + 1}. ${video.title}`);
          console.log(`     ID: ${video.videoId}`);
          console.log(`     Channel: ${video.channelTitle}`);
          console.log(`     URL: https://www.youtube.com/watch?v=${video.videoId}`);
        });
      }
    } catch (error) {
      console.error(`❌ Exception: ${error instanceof Error ? error.message : error}`);
    }
  }
  
  console.log('\n' + '─'.repeat(60));
  console.log('✅ Test completed!');
}

/**
 * Test a single query
 */
export async function testSingleQuery(query: string) {
  console.log(`🔍 Testing: "${query}"\n`);
  
  try {
    const result = await searchYouTube(query);
    
    if (result.error) {
      console.error(`❌ Error: ${result.error}`);
      return null;
    }
    
    console.log(`✅ Found ${result.videos.length} videos from ${result.source}`);
    return result;
  } catch (error) {
    console.error(`❌ Exception: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

// Export for console testing
if (typeof window !== 'undefined') {
  (window as any).testYouTubeSearch = testYouTubeSearch;
  (window as any).testSingleQuery = testSingleQuery;
}
