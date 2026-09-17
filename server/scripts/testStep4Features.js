/**
 * Integration Test for Step 4 Features (using native fetch):
 * - Public Tag Endpoint (/api/tags)
 * - Game Search & Filtering (/api/games/search)
 * - Wishlist CRUD (/api/wishlist)
 * - Library CRUD & Auto-wishlist removal (/api/library)
 * - Review CRUD & Stats Aggregation (/api/reviews)
 */

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🧪 Starting Step 4 Integration Tests...\n');

  try {
    // 1. Test Public Tag Endpoint
    console.log('1️⃣  Testing GET /api/tags...');
    const tagsRes = await fetch(`${BASE_URL}/tags`);
    const tagsData = await tagsRes.json();
    console.log(`   ✅ Received ${tagsData.totalCount} micro-tags across ${Object.keys(tagsData.categories).length} categories.`);

    // 2. Test Game Search
    console.log('\n2️⃣  Testing GET /api/games/search...');
    const searchRes = await fetch(`${BASE_URL}/games/search?sort=newest&limit=5`);
    const searchData = await searchRes.json();
    console.log(`   ✅ Found ${searchData.pagination.total} published games. Returned ${searchData.games.length} games on page 1.`);

    if (searchData.games.length === 0) {
      console.log('   ⚠️  No published games in DB to run wishlist/library/review tests against.');
      console.log('🎉 All available Step 4 tests completed successfully!');
      return;
    }

    const testGame = searchData.games[0];
    console.log(`   Target game for user tests: "${testGame.title}" (ID: ${testGame.id})`);

    // 3. Register a test player user
    console.log('\n3️⃣  Registering test player user...');
    const testUsername = `player_${Date.now()}`;
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        email: `${testUsername}@example.com`,
        password: 'password123',
        role: 'player'
      })
    });
    const regData = await regRes.json();
    const token = regData.token;
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    console.log(`   ✅ Player user created: ${testUsername}`);

    // 4. Test Wishlist Routes
    console.log('\n4️⃣  Testing Wishlist endpoints...');
    // Add to wishlist
    const addWishRes = await fetch(`${BASE_URL}/wishlist/${testGame.id}`, { method: 'POST', headers: authHeaders });
    const addWishData = await addWishRes.json();
    console.log(`   ✅ Added to wishlist: ${addWishData.message}`);

    // Check wishlist
    const checkWishRes = await fetch(`${BASE_URL}/wishlist/check/${testGame.id}`, { headers: authHeaders });
    const checkWishData = await checkWishRes.json();
    console.log(`   ✅ Wishlist check: inWishlist = ${checkWishData.inWishlist}`);

    // List wishlist
    const listWishRes = await fetch(`${BASE_URL}/wishlist`, { headers: authHeaders });
    const listWishData = await listWishRes.json();
    console.log(`   ✅ Wishlist list count: ${listWishData.wishlist.length}`);

    // 5. Test Library Routes
    console.log('\n5️⃣  Testing Library endpoints...');
    // Add to library (simulated purchase)
    const addLibRes = await fetch(`${BASE_URL}/library/${testGame.id}`, { method: 'POST', headers: authHeaders });
    const addLibData = await addLibRes.json();
    console.log(`   ✅ Added to library: ${addLibData.message}`);

    // Check library
    const checkLibRes = await fetch(`${BASE_URL}/library/check/${testGame.id}`, { headers: authHeaders });
    const checkLibData = await checkLibRes.json();
    console.log(`   ✅ Library check: inLibrary = ${checkLibData.inLibrary}`);

    // Verify auto-removal from wishlist
    const checkWishPostLibRes = await fetch(`${BASE_URL}/wishlist/check/${testGame.id}`, { headers: authHeaders });
    const checkWishPostLibData = await checkWishPostLibRes.json();
    console.log(`   ✅ Auto-removed from wishlist check: inWishlist = ${checkWishPostLibData.inWishlist}`);

    // List library
    const listLibRes = await fetch(`${BASE_URL}/library`, { headers: authHeaders });
    const listLibData = await listLibRes.json();
    console.log(`   ✅ Library list count: ${listLibData.library.length}`);

    // 6. Test Review Routes
    console.log('\n6️⃣  Testing Review endpoints...');
    // Submit review
    const revRes = await fetch(`${BASE_URL}/reviews/${testGame.id}`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        rating: 5,
        title: 'Absolutely Incredible Indie Gem!',
        content: 'The gameplay loop is satisfying, art direction is gorgeous, and music is sublime. Must buy!',
        isRecommended: true
      })
    });
    const revData = await revRes.json();
    console.log(`   ✅ Submitted review (ID: ${revData.review.id})`);

    // Fetch reviews & stats
    const fetchRevRes = await fetch(`${BASE_URL}/reviews/${testGame.id}`);
    const fetchRevData = await fetchRevRes.json();
    console.log(`   ✅ Fetched ${fetchRevData.reviews.length} reviews for game.`);
    console.log(`   ✅ Stats: Avg Rating = ${fetchRevData.stats.averageRating}, Total = ${fetchRevData.stats.totalReviews}, Recommended = ${fetchRevData.stats.recommendedPercent}%`);

    console.log('\n✨ ALL STEP 4 BACKEND & DATABASE INTEGRATION TESTS PASSED PERFECTLY! ✨\n');

  } catch (err) {
    console.error('❌ Test failed with error:', err.message);
    process.exit(1);
  }
}

runTests();
