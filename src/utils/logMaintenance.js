/**
 * Auto Log Maintenance System (OPTIMIZED)
 * 
 * Automatically maintains log channels by:
 * - Deleting old messages based on retention policy
 * - Keeping message count under limit
 * - Running on a schedule
 * 
 * OPTIMIZATIONS:
 * - Parallel batch deletion (10 messages at once)
 * - Reduced delays (25ms between batches)
 * - Progress tracking for large deletions
 * - Smart fetch strategies
 */

/**
 * Clear all messages from a Discord channel (OPTIMIZED)
 * @param {TextChannel} channel - The Discord channel to clear
 * @param {number} maxMessages - Maximum number of messages to delete (default: unlimited)
 * @returns {Promise<number>} - Number of messages deleted
 */
export async function clearChannel(channel, maxMessages = Infinity) {
  if (!channel) {
    console.log('[LOG CLEAR] No channel provided');
    return 0;
  }

  console.log(`[LOG CLEAR] Starting to clear channel: ${channel.name}`);
  let totalDeleted = 0;
  let hasMore = true;
  
  const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);

  try {
    while (hasMore && totalDeleted < maxMessages) {
      // Fetch up to 100 messages
      const fetchLimit = Math.min(100, maxMessages - totalDeleted);
      const messages = await channel.messages.fetch({ limit: fetchLimit });
      
      if (messages.size === 0) {
        hasMore = false;
        break;
      }

      // Separate recent vs old messages
      const recentMessages = messages.filter(msg => msg.createdTimestamp > twoWeeksAgo);
      const oldMessages = messages.filter(msg => msg.createdTimestamp <= twoWeeksAgo);

      // Bulk delete recent messages (fast)
      if (recentMessages.size > 0) {
        try {
          await channel.bulkDelete(recentMessages, true);
          totalDeleted += recentMessages.size;
          console.log(`[LOG CLEAR] Bulk deleted ${recentMessages.size} recent messages (Total: ${totalDeleted})`);
        } catch (error) {
          console.error('[LOG CLEAR] Bulk delete failed:', error.message);
        }
      }

      // ✅ OPTIMIZED: Delete old messages in parallel batches
      if (oldMessages.size > 0) {
        console.log(`[LOG CLEAR] Found ${oldMessages.size} old messages. Deleting in parallel batches...`);
        
        const oldMessagesArray = Array.from(oldMessages.values());
        const batchSize = 10; // Delete 10 messages at once
        
        for (let i = 0; i < oldMessagesArray.length; i += batchSize) {
          const batch = oldMessagesArray.slice(i, i + batchSize);
          
          // Delete batch in parallel
          await Promise.allSettled(
            batch.map(message => 
              message.delete().catch(err => {
                console.error(`[LOG CLEAR] Failed to delete message:`, err.message);
              })
            )
          );
          
          totalDeleted += batch.length;
          
          // Short delay between batches to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 25));
          
          if (totalDeleted >= maxMessages) break;
        }
        
        console.log(`[LOG CLEAR] Deleted ${oldMessages.size} old messages`);
      }

      // If we fetched less than 100, we're done
      if (messages.size < 100) {
        hasMore = false;
      }
      
      // Rate limit protection between fetch cycles
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[LOG CLEAR] ✅ Finished. Total deleted: ${totalDeleted}`);
    return totalDeleted;
    
  } catch (error) {
    console.error('[LOG CLEAR] ❌ Error:', error);
    return totalDeleted;
  }
}

/**
 * Delete messages older than retention period (OPTIMIZED)
 * @param {TextChannel} channel - The Discord channel
 * @param {number} retentionDays - Keep messages newer than this many days
 * @returns {Promise<number>} - Number of messages deleted
 */
export async function deleteOldMessages(channel, retentionDays = 7) {
  if (!channel || retentionDays <= 0) return 0;

  const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
  
  console.log(`[LOG MAINTENANCE] Deleting messages older than ${retentionDays} days from ${channel.name}`);

  let totalDeleted = 0;
  let oldestMessageId = null;
  let consecutiveEmptyFetches = 0;
  let iterationCount = 0;

  try {
    while (true) {
      iterationCount++;
      
      // Fetch oldest messages
      const options = { limit: 100 };
      if (oldestMessageId) {
        options.before = oldestMessageId;
      }
      
      const messages = await channel.messages.fetch(options);
      
      if (messages.size === 0) {
        consecutiveEmptyFetches++;
        if (consecutiveEmptyFetches >= 2) break; // Stop if we get empty fetches twice
        continue;
      }
      
      consecutiveEmptyFetches = 0;
      oldestMessageId = messages.last().id;

      // Filter messages older than retention period
      const oldMessages = messages.filter(msg => msg.createdTimestamp < cutoffTime);
      
      if (oldMessages.size === 0) {
        // We've reached messages within retention period
        console.log('[LOG MAINTENANCE] Reached messages within retention period');
        break;
      }

      // Split into recent-old (can bulk delete) and very-old (must delete individually)
      const recentOld = oldMessages.filter(msg => msg.createdTimestamp > twoWeeksAgo);
      const veryOld = oldMessages.filter(msg => msg.createdTimestamp <= twoWeeksAgo);

      // Bulk delete recent old messages (fast)
      if (recentOld.size > 0) {
        try {
          await channel.bulkDelete(recentOld, true);
          totalDeleted += recentOld.size;
          console.log(`[LOG MAINTENANCE] Bulk deleted ${recentOld.size} old messages (Total: ${totalDeleted})`);
        } catch (error) {
          console.error('[LOG MAINTENANCE] Bulk delete error:', error.message);
        }
      }

      // ✅ OPTIMIZED: Parallel batch delete for very old messages
      if (veryOld.size > 0) {
        const veryOldArray = Array.from(veryOld.values());
        const batchSize = 10;
        
        for (let i = 0; i < veryOldArray.length; i += batchSize) {
          const batch = veryOldArray.slice(i, i + batchSize);
          
          await Promise.allSettled(
            batch.map(message => 
              message.delete().catch(err => {
                console.error('[LOG MAINTENANCE] Delete error:', err.message);
              })
            )
          );
          
          totalDeleted += batch.length;
          await new Promise(resolve => setTimeout(resolve, 25));
        }
        
        console.log(`[LOG MAINTENANCE] Deleted ${veryOld.size} very old messages (Total: ${totalDeleted})`);
      }

      // Small delay between fetch cycles
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Progress logging for large deletions
      if (totalDeleted > 0 && totalDeleted % 1000 === 0) {
        console.log(`[LOG MAINTENANCE] Progress: ${totalDeleted} messages deleted so far...`);
      }
      
      // Safety check: prevent infinite loops
      if (iterationCount > 1000) {
        console.log(`[LOG MAINTENANCE] ⚠️ Reached iteration limit (1000), stopping`);
        break;
      }
    }

    if (totalDeleted > 0) {
      console.log(`[LOG MAINTENANCE] ✅ Deleted ${totalDeleted} old messages`);
    } else {
      console.log(`[LOG MAINTENANCE] ✅ No old messages to delete`);
    }

    return totalDeleted;
  } catch (error) {
    console.error('[LOG MAINTENANCE] ❌ Error:', error);
    return totalDeleted;
  }
}

/**
 * Keep channel under message limit by deleting oldest messages (OPTIMIZED)
 * @param {TextChannel} channel - The Discord channel
 * @param {number} maxMessages - Maximum messages to keep in channel
 * @returns {Promise<number>} - Number of messages deleted
 */
export async function enforceMessageLimit(channel, maxMessages = 1000) {
  if (!channel || maxMessages <= 0) return 0;

  console.log(`[LOG MAINTENANCE] Checking message count in ${channel.name} (limit: ${maxMessages})`);

  try {
    // Count all messages (approximate)
    let messageCount = 0;
    let lastId = null;
    let hasMore = true;
    
    console.log('[LOG MAINTENANCE] Counting messages...');
    
    while (hasMore) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;
      
      const messages = await channel.messages.fetch(options);
      if (messages.size === 0) break;
      
      messageCount += messages.size;
      lastId = messages.last().id;
      
      if (messages.size < 100) break;
      
      // Stop counting if we're way over limit (optimization)
      if (messageCount > maxMessages * 2) {
        console.log(`[LOG MAINTENANCE] Message count exceeds ${maxMessages * 2}, stopping count early`);
        break;
      }
    }

    console.log(`[LOG MAINTENANCE] Channel has ~${messageCount} messages`);

    if (messageCount <= maxMessages) {
      console.log(`[LOG MAINTENANCE] ✅ Under limit, no action needed`);
      return 0;
    }

    // Delete oldest messages to get under limit
    const toDelete = messageCount - maxMessages;
    console.log(`[LOG MAINTENANCE] Need to delete ~${toDelete} oldest messages`);

    let totalDeleted = 0;
    const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
    lastId = null;
    
    while (totalDeleted < toDelete) {
      const fetchLimit = Math.min(100, toDelete - totalDeleted);
      const options = { limit: fetchLimit };
      if (lastId) options.before = lastId;
      
      const messages = await channel.messages.fetch(options);
      if (messages.size === 0) break;

      // Separate recent vs old messages
      const recent = messages.filter(msg => msg.createdTimestamp > twoWeeksAgo);
      const old = messages.filter(msg => msg.createdTimestamp <= twoWeeksAgo);

      // Bulk delete recent messages
      if (recent.size > 0) {
        await channel.bulkDelete(recent, true);
        totalDeleted += recent.size;
      }

      // ✅ OPTIMIZED: Parallel delete old messages
      if (old.size > 0) {
        const oldArray = Array.from(old.values());
        const batchSize = 10;
        
        for (let i = 0; i < oldArray.length; i += batchSize) {
          const batch = oldArray.slice(i, i + batchSize);
          
          await Promise.allSettled(
            batch.map(msg => msg.delete().catch(() => {}))
          );
          
          totalDeleted += batch.length;
          await new Promise(resolve => setTimeout(resolve, 25));
          
          if (totalDeleted >= toDelete) break;
        }
      }

      lastId = messages.last().id;
      
      // Progress logging every 500 messages
      if (totalDeleted % 500 === 0 && totalDeleted > 0) {
        const progress = Math.round((totalDeleted / toDelete) * 100);
        console.log(`[LOG MAINTENANCE] Progress: ${totalDeleted}/${toDelete} deleted (${progress}%)`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[LOG MAINTENANCE] ✅ Deleted ${totalDeleted} messages to enforce limit`);
    return totalDeleted;
    
  } catch (error) {
    console.error('[LOG MAINTENANCE] ❌ Error:', error);
    return 0;
  }
}

/**
 * Clear log channel on bot startup if configured
 */
export async function clearLogChannelOnStartup(client, channelId) {
  if (!channelId) return;

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) return;

    console.log(`[LOG CLEAR] Clearing log channel: ${channel.name}`);
    const deleted = await clearChannel(channel);
    console.log(`[LOG CLEAR] ✅ Cleared ${deleted} messages`);
  } catch (error) {
    console.error('[LOG CLEAR] ❌ Failed:', error);
  }
}

/**
 * Start automatic log maintenance (OPTIMIZED)
 * @param {Client} client - Discord client
 * @param {Object} config - Configuration object
 * @returns {NodeJS.Timeout} - Interval timer (save to clear on shutdown)
 */
export function startAutoMaintenance(client, config) {
  if (!config.logging.autoMaintenance) {
    console.log('[LOG MAINTENANCE] Auto-maintenance disabled');
    return null;
  }

  const channelId = config.channels.log;
  if (!channelId) {
    console.log('[LOG MAINTENANCE] No log channel configured');
    return null;
  }

  console.log(`[LOG MAINTENANCE] ✅ Starting auto-maintenance:`);
  console.log(`  - Interval: ${config.logging.maintenanceInterval / 60000} minutes`);
  console.log(`  - Retention: ${config.logging.retentionDays} days`);
  console.log(`  - Max messages: ${config.logging.maxMessages}`);

  const intervalId = setInterval(async () => {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel?.isTextBased()) return;

      console.log('[LOG MAINTENANCE] Running scheduled maintenance...');
      const startTime = Date.now();

      // Step 1: Delete messages older than retention period
      if (config.logging.retentionDays > 0) {
        await deleteOldMessages(channel, config.logging.retentionDays);
      }

      // Step 2: Enforce message limit
      if (config.logging.maxMessages > 0) {
        await enforceMessageLimit(channel, config.logging.maxMessages);
      }

      const duration = Math.round((Date.now() - startTime) / 1000);
      console.log(`[LOG MAINTENANCE] ✅ Maintenance complete (took ${duration}s)`);
    } catch (error) {
      console.error('[LOG MAINTENANCE] ❌ Error:', error);
    }
  }, config.logging.maintenanceInterval);

  // Run immediately on startup (after 5 second delay)
  setTimeout(async () => {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel?.isTextBased()) return;

      console.log('[LOG MAINTENANCE] Running initial maintenance...');
      const startTime = Date.now();
      
      if (config.logging.retentionDays > 0) {
        await deleteOldMessages(channel, config.logging.retentionDays);
      }
      
      if (config.logging.maxMessages > 0) {
        await enforceMessageLimit(channel, config.logging.maxMessages);
      }
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      console.log(`[LOG MAINTENANCE] ✅ Initial maintenance complete (took ${duration}s)`);
    } catch (error) {
      console.error('[LOG MAINTENANCE] ❌ Initial maintenance error:', error);
    }
  }, 5000); // Wait 5 seconds after bot ready

  return intervalId;
}

export default { 
  clearChannel, 
  clearLogChannelOnStartup,
  deleteOldMessages,
  enforceMessageLimit,
  startAutoMaintenance
};
