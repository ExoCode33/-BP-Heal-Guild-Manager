/**
 * Error Handler Middleware
 * 
 * Centralized error handling for Discord interactions.
 * Prevents crashes and provides consistent error responses.
 * 
 * Features:
 * - Automatic error recovery
 * - Consistent error messages
 * - Error logging
 * - Stack trace capture
 * - Retry logic for transient errors
 */

/**
 * Wrap a command handler with error handling
 */
export function wrapCommandHandler(handler) {
  return async (interaction) => {
    try {
      await handler(interaction);
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  };
}

/**
 * Wrap an interaction handler with error handling
 */
export function wrapInteractionHandler(handler) {
  return async (interaction) => {
    try {
      await handler(interaction);
    } catch (error) {
      await handleInteractionError(interaction, error);
    }
  };
}

/**
 * Wrap a modal handler with error handling
 */
export function wrapModalHandler(handler) {
  return async (interaction) => {
    try {
      await handler(interaction);
    } catch (error) {
      await handleModalError(interaction, error);
    }
  };
}

/**
 * Handle command errors
 */
async function handleCommandError(interaction, error) {
  const context = {
    command: interaction.commandName,
    subcommand: interaction.options?.getSubcommand?.(false),
    user: interaction.user?.id,
    guild: interaction.guild?.id,
    channel: interaction.channel?.id
  };
  
  // Log the error
  if (global.logger) {
    global.logger.logError('Command', `Command failed: /${interaction.commandName}`, error, context);
  } else {
    console.error('[ERROR HANDLER] Command error:', error);
    console.error('[ERROR HANDLER] Context:', context);
  }
  
  // Determine error message
  const errorMessage = getErrorMessage(error);
  
  // Send error response
  await sendErrorResponse(interaction, errorMessage);
}

/**
 * Handle interaction errors (buttons, select menus)
 */
async function handleInteractionError(interaction, error) {
  const context = {
    type: interaction.componentType,
    customId: interaction.customId,
    user: interaction.user?.id,
    guild: interaction.guild?.id,
    channel: interaction.channel?.id
  };
  
  // Log the error
  if (global.logger) {
    global.logger.logError('Interaction', `Interaction failed: ${interaction.customId}`, error, context);
  } else {
    console.error('[ERROR HANDLER] Interaction error:', error);
    console.error('[ERROR HANDLER] Context:', context);
  }
  
  // Determine error message
  const errorMessage = getErrorMessage(error);
  
  // Send error response
  await sendErrorResponse(interaction, errorMessage);
}

/**
 * Handle modal errors
 */
async function handleModalError(interaction, error) {
  const context = {
    customId: interaction.customId,
    user: interaction.user?.id,
    guild: interaction.guild?.id,
    channel: interaction.channel?.id,
    fields: interaction.fields?.fields?.size || 0
  };
  
  // Log the error
  if (global.logger) {
    global.logger.logError('Modal', `Modal submission failed: ${interaction.customId}`, error, context);
  } else {
    console.error('[ERROR HANDLER] Modal error:', error);
    console.error('[ERROR HANDLER] Context:', context);
  }
  
  // Determine error message
  const errorMessage = getErrorMessage(error);
  
  // Send error response
  await sendErrorResponse(interaction, errorMessage);
}

/**
 * Send error response to user
 */
async function sendErrorResponse(interaction, message) {
  try {
    const errorContent = {
      content: `❌ ${message}`,
      ephemeral: true
    };
    
    // Check if we can still respond
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply(errorContent);
    } else if (interaction.deferred) {
      await interaction.editReply(errorContent);
    } else {
      // Already replied, try followUp
      await interaction.followUp(errorContent);
    }
  } catch (sendError) {
    console.error('[ERROR HANDLER] Failed to send error response:', sendError);
  }
}

/**
 * Get user-friendly error message based on error type
 */
function getErrorMessage(error) {
  // Discord API errors
  if (error.code === 10062) {
    return 'This interaction has expired. Please try again.';
  }
  
  if (error.code === 50013) {
    return 'I don\'t have permission to do that.';
  }
  
  if (error.code === 50035) {
    return 'Invalid input. Please check your data and try again.';
  }
  
  if (error.code === 10008) {
    return 'Message not found. It may have been deleted.';
  }
  
  if (error.code === 10003) {
    return 'Channel not found.';
  }
  
  // Database errors
  if (error.code === '23505') {
    return 'This entry already exists.';
  }
  
  if (error.code === '23503') {
    return 'Related data not found.';
  }
  
  if (error.code === '42P01') {
    return 'Database table not found. Please contact an administrator.';
  }
  
  // Network errors
  if (error.code === 'ECONNREFUSED') {
    return 'Could not connect to the database. Please try again later.';
  }
  
  if (error.code === 'ETIMEDOUT') {
    return 'Request timed out. Please try again.';
  }
  
  // Rate limit errors
  if (error.message?.includes('rate limit')) {
    return 'You\'re doing that too quickly. Please wait a moment.';
  }
  
  // Validation errors
  if (error.name === 'ValidationError') {
    return error.message || 'Invalid input provided.';
  }
  
  // Default error message
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Async wrapper with retry logic
 */
export async function withRetry(fn, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry certain errors
      if (isNonRetryableError(error)) {
        throw error;
      }
      
      // Wait before retrying
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError;
}

/**
 * Check if error should not be retried
 */
function isNonRetryableError(error) {
  // Don't retry validation errors
  if (error.name === 'ValidationError') return true;
  
  // Don't retry permission errors
  if (error.code === 50013) return true;
  
  // Don't retry not found errors
  if (error.code === 10008 || error.code === 10003) return true;
  
  // Don't retry expired interaction errors
  if (error.code === 10062) return true;
  
  return false;
}

/**
 * Safe async wrapper that never throws
 */
export async function safeAsync(fn, fallback = null) {
  try {
    return await fn();
  } catch (error) {
    console.error('[ERROR HANDLER] Safe async error:', error);
    return fallback;
  }
}

/**
 * Wrap multiple handlers at once
 */
export function wrapHandlers(handlers) {
  const wrapped = {};
  
  for (const [key, handler] of Object.entries(handlers)) {
    if (typeof handler === 'function') {
      wrapped[key] = wrapInteractionHandler(handler);
    } else {
      wrapped[key] = handler;
    }
  }
  
  return wrapped;
}

/**
 * Create error context object
 */
export function createErrorContext(interaction, additionalContext = {}) {
  return {
    command: interaction.commandName,
    customId: interaction.customId,
    type: interaction.type,
    user: interaction.user?.id,
    username: interaction.user?.username,
    guild: interaction.guild?.id,
    guildName: interaction.guild?.name,
    channel: interaction.channel?.id,
    channelName: interaction.channel?.name,
    timestamp: new Date().toISOString(),
    ...additionalContext
  };
}

/**
 * Log error with full context
 */
export function logError(error, context = {}) {
  if (global.logger) {
    global.logger.logError('General', 'Error occurred', error, context);
  } else {
    console.error('[ERROR HANDLER] Error:', error);
    console.error('[ERROR HANDLER] Context:', context);
  }
}

// Export default object with all functions
export default {
  wrapCommandHandler,
  wrapInteractionHandler,
  wrapModalHandler,
  withRetry,
  safeAsync,
  wrapHandlers,
  createErrorContext,
  logError
};

/**
 * Usage Examples:
 * 
 * // In command file:
 * import { wrapCommandHandler } from './middleware/errorHandler.js';
 * 
 * export default {
 *   data: new SlashCommandBuilder()...,
 *   execute: wrapCommandHandler(async (interaction) => {
 *     // Your command logic
 *   })
 * };
 * 
 * // In interaction handler:
 * import { wrapInteractionHandler } from './middleware/errorHandler.js';
 * 
 * export const handleButton = wrapInteractionHandler(async (interaction) => {
 *   // Your button logic
 * });
 * 
 * // With retry:
 * import { withRetry } from './middleware/errorHandler.js';
 * 
 * const result = await withRetry(async () => {
 *   return await db.query('SELECT * FROM users');
 * }, 3, 1000);
 */
