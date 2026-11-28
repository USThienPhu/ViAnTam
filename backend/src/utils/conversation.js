// conversationId của cuộc trò chuyện 1-1: id hai người sắp xếp rồi nối bằng "_".
function makeConversationId(a, b) {
  return [String(a), String(b)].sort().join('_');
}

module.exports = { makeConversationId };
