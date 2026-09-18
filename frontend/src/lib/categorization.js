/**
 * Builds a word frequency map from historical transactions.
 * Maps each word to an object of { item_id: frequency_count }
 */
export function trainCategorizer(transactions) {
  const wordFreq = {};

  if (!transactions) return wordFreq;

  for (const t of transactions) {
    if (t.type === 'expense' && t.item_id) {
      const text = `${t.note || ''} ${t.utr_id || ''}`.toLowerCase();
      // Tokenize by word boundaries, keeping words >= 3 chars
      const words = text.match(/\b[a-z0-9]{3,}\b/g) || [];
      
      for (const word of words) {
        if (!wordFreq[word]) wordFreq[word] = {};
        if (!wordFreq[word][t.item_id]) wordFreq[word][t.item_id] = 0;
        wordFreq[word][t.item_id]++;
      }
    }
  }

  return wordFreq;
}

/**
 * Predicts the most likely item_id given an input text string (note/utr).
 */
export function predictCategory(text, wordFreq) {
  if (!text || text.trim() === '') return null;
  
  const words = text.toLowerCase().match(/\b[a-z0-9]{3,}\b/g) || [];
  if (words.length === 0) return null;

  const itemScores = {};

  for (const word of words) {
    if (wordFreq[word]) {
      for (const [itemId, count] of Object.entries(wordFreq[word])) {
        if (!itemScores[itemId]) itemScores[itemId] = 0;
        // Weight exact matches higher if needed, but frequency count is usually a good baseline
        itemScores[itemId] += count;
      }
    }
  }

  // Find item with max score
  let maxScore = 0;
  let bestItem = null;

  for (const [itemId, score] of Object.entries(itemScores)) {
    if (score > maxScore) {
      maxScore = score;
      bestItem = itemId;
    }
  }

  // Only return if we have at least 1 historical match
  return maxScore >= 1 ? bestItem : null;
}
