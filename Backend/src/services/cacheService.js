const { prisma } = require('../config/database');

/**
 * Retrieves a cached triage result by its unique cache key.
 */
async function getCachedTriage(cacheKey) {
  if (!cacheKey) {
    return null;
  }

  try {
    const cachedEntry = await prisma.triageCache.findUnique({
      where: { cacheKey },
      select: {
        category: true,
        priority: true,
        summary: true
      }
    });

    return cachedEntry;
  } catch (error) {
    console.warn(`Cache reading cache for key ${cacheKey}:`, error.message);
    return null;
  }
}

/**
 * Stores a validated triage result in the triage_cache table.
 *
 */
async function setCachedTriage(cacheKey, triageResult) {
  if (!cacheKey || !triageResult) {
    return null;
  }

  try {
    return await prisma.triageCache.upsert({
      where: { cacheKey },
      update: {
        category: triageResult.category,
        priority: triageResult.priority,
        summary: triageResult.summary
      },
      create: {
        cacheKey,
        category: triageResult.category,
        priority: triageResult.priority,
        summary: triageResult.summary
      }
    });
  } catch (error) {
    console.warn(`Writing cache for key ${cacheKey}:`, error.message);
    return null;
  }
}

module.exports = {
  getCachedTriage,
  setCachedTriage
};

