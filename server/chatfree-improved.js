/**
 * Простая заглушка для ChatFree
 */

async function getChatFreeResponse(message, options = {}) {
  return {
    success: false,
    error: 'ChatFree improved временно недоступен'
  };
}

module.exports = {
  getChatFreeResponse
};