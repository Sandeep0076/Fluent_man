/**
 * Global Search Component
 * Provides unified search across vocabulary, journal entries, and phrases
 * Accessible from every page via keyboard shortcut (Cmd+K / Ctrl+K)
 */

class GlobalSearch {
  constructor(apiBase) {
    this.apiBase = apiBase;
    this.modal = null;
    this.searchInput = null;
    this.resultsContainer = null;
    this.isOpen = false;
    this.debounceTimer = null;
    this.debounceDelay = 300; // ms
  }

  /**
   * Initialize the global search component
   */
  init() {
    this.createModal();
    this.attachEventListeners();
    this.setupKeyboardShortcuts();
    console.log('✅ Global search initialized');
  }

  /**
   * Create the modal DOM structure
   */
  createModal() {
    const modal = document.createElement('div');
    modal.id = 'global-search-modal';
    modal.className = 'fixed inset-0 bg-black/70 backdrop-blur-md z-[200] hidden items-center justify-center p-4';
    modal.onclick = (e) => {
      if (e.target === modal) this.close();
    };

    modal.innerHTML = `
      <div class="glass-panel w-full max-w-3xl max-h-[80vh] flex flex-col rounded-3xl relative overflow-hidden"
           style="border: 4px solid var(--ocean-mid); box-shadow: 0 0 0 2px var(--bronze-light), 8px 8px 0 rgba(46, 99, 164, 0.3);"
           onclick="event.stopPropagation()">
        
        <!-- Decorative compass rose -->
        <div class="absolute top-4 right-4 text-4xl opacity-10 pointer-events-none" style="color: var(--ocean-mid);">🧭</div>
        
        <!-- Search Header -->
        <div class="p-6 pb-4 border-b-3" style="border-color: var(--bronze-dark);">
          <div class="flex items-center gap-4 mb-4">
            <span class="text-3xl">🔍</span>
            <h2 class="text-2xl font-black op-font compass-accent" style="color: var(--ship-wood);">
              Search Treasures
            </h2>
            <button onclick="window.globalSearch.close()"
                    class="ml-auto w-10 h-10 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all transform hover:scale-110"
                    title="Close (Esc)">
              ✕
            </button>
          </div>
          
          <!-- Search Input -->
          <div class="relative">
            <span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl" style="color: var(--ocean-mid);">🧭</span>
            <input type="text" 
                   id="global-search-input" 
                   placeholder="Search vocabulary, journal, phrases... (Cmd+K)"
                   class="w-full pl-12 pr-12 py-4 rounded-xl font-bold transition-all focus:outline-none focus:ring-4"
                   style="background: white; border: 3px solid var(--bronze-dark); color: var(--ship-wood); box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1); --tw-ring-color: rgba(255, 215, 0, 0.3);"
                   autocomplete="off">
            <button id="global-search-clear"
                    class="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors hidden"
                    onclick="window.globalSearch.clearSearch()">
              <span class="text-xl">✕</span>
            </button>
          </div>
        </div>

        <!-- Loading Spinner -->
        <div id="global-search-loading" class="hidden p-8 flex items-center justify-center">
          <div class="animate-spin text-4xl">⚓</div>
        </div>

        <!-- Results Container -->
        <div id="global-search-results" class="flex-1 overflow-y-auto p-6 space-y-6">
          <!-- Empty state -->
          <div id="search-empty-state" class="flex flex-col items-center justify-center py-16 text-slate-400">
            <div class="text-6xl mb-4 opacity-50">🗺️</div>
            <h3 class="text-xl font-bold mb-2">Start searching...</h3>
            <p class="text-sm">Search across vocabulary, journal entries, and phrases</p>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modal = modal;
    this.searchInput = document.getElementById('global-search-input');
    this.resultsContainer = document.getElementById('global-search-results');
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Search input with debouncing
    this.searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      
      // Show/hide clear button
      const clearBtn = document.getElementById('global-search-clear');
      if (query) {
        clearBtn.classList.remove('hidden');
      } else {
        clearBtn.classList.add('hidden');
      }

      // Debounced search
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        if (query.length > 0) {
          this.performSearch(query);
        } else {
          this.showEmptyState();
        }
      }, this.debounceDelay);
    });

    // ESC key to close
    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    });
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.open();
      }
    });
  }

  /**
   * Open the search modal
   */
  open() {
    this.modal.classList.remove('hidden');
    this.modal.classList.add('flex');
    this.searchInput.focus();
    this.isOpen = true;
  }

  /**
   * Close the search modal
   */
  close() {
    this.modal.classList.add('hidden');
    this.modal.classList.remove('flex');
    this.clearSearch();
    this.isOpen = false;
  }

  /**
   * Clear search input and results
   */
  clearSearch() {
    this.searchInput.value = '';
    document.getElementById('global-search-clear').classList.add('hidden');
    this.showEmptyState();
  }

  /**
   * Show empty state
   */
  showEmptyState() {
    this.resultsContainer.innerHTML = `
      <div id="search-empty-state" class="flex flex-col items-center justify-center py-16 text-slate-400">
        <div class="text-6xl mb-4 opacity-50">🗺️</div>
        <h3 class="text-xl font-bold mb-2">Start searching...</h3>
        <p class="text-sm">Search across vocabulary, journal entries, and phrases</p>
      </div>
    `;
  }

  /**
   * Show loading state
   */
  showLoading() {
    const loading = document.getElementById('global-search-loading');
    loading.classList.remove('hidden');
    this.resultsContainer.innerHTML = '';
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    const loading = document.getElementById('global-search-loading');
    loading.classList.add('hidden');
  }

  /**
   * Perform search via API
   */
  async performSearch(query) {
    try {
      this.showLoading();

      const response = await fetch(`${this.apiBase}/search?q=${encodeURIComponent(query)}`);
      const result = await response.json();

      this.hideLoading();

      if (result.success) {
        this.renderResults(result.data, query);
      } else {
        this.showError('Search failed. Please try again.');
      }
    } catch (error) {
      console.error('Search error:', error);
      this.hideLoading();
      this.showError('Unable to connect to server. Please check your connection.');
    }
  }

  /**
   * Render search results
   */
  renderResults(data, query) {
    const { vocabulary, journal_sentences, phrases, counts } = data;
    const totalResults = counts.vocabulary + counts.journal_sentences + counts.phrases;

    if (totalResults === 0) {
      this.resultsContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center py-16 text-slate-400">
          <div class="text-6xl mb-4 opacity-50">🔍</div>
          <h3 class="text-xl font-bold mb-2">No results found</h3>
          <p class="text-sm">Try searching for a different word or phrase</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="glass-card p-4 rounded-xl mb-6 !bg-blue-50/80 border-blue-200">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-slate-800">Search Results for "${query}"</h3>
            <p class="text-sm text-slate-600 mt-1">
              Found ${counts.vocabulary} word${counts.vocabulary !== 1 ? 's' : ''},
              ${counts.journal_sentences} journal sentence${counts.journal_sentences !== 1 ? 's' : ''},
              and ${counts.phrases} phrase${counts.phrases !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>
    `;

    // Vocabulary Results
    if (vocabulary.length > 0) {
      html += `
        <div class="mb-6">
          <h4 class="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
            <span class="text-2xl">📚</span>
            Vocabulary Words (${counts.vocabulary})
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${vocabulary.map(word => this.renderVocabularyCard(word)).join('')}
          </div>
        </div>
      `;
    }

    // Journal Results
    if (journal_sentences.length > 0) {
      html += `
        <div class="mb-6">
          <h4 class="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
            <span class="text-2xl">✍️</span>
            Journal Sentences (${counts.journal_sentences})
          </h4>
          <div class="space-y-3">
            ${journal_sentences.map(sentence => this.renderJournalCard(sentence)).join('')}
          </div>
        </div>
      `;
    }

    // Phrases Results
    if (phrases.length > 0) {
      html += `
        <div class="mb-6">
          <h4 class="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
            <span class="text-2xl">📢</span>
            Phrases (${counts.phrases})
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${phrases.map(phrase => this.renderPhraseCard(phrase)).join('')}
          </div>
        </div>
      `;
    }

    this.resultsContainer.innerHTML = html;
  }

  /**
   * Render vocabulary card
   */
  renderVocabularyCard(word) {
    return `
      <div class="glass-card p-4 rounded-xl cursor-pointer hover:bg-white/90 transition-all"
           onclick="window.globalSearch.navigateToVocabulary(${word.id})">
        <div class="flex items-center gap-2 mb-1">
          <div class="font-bold text-lg text-slate-800">${word.word}</div>
        </div>
        <div class="text-sm text-slate-600 italic">${word.meaning || 'No meaning'}</div>
        ${word.frequency > 1 ? `<div class="text-xs text-blue-600 mt-2 font-mono font-bold">Used ${word.frequency}x</div>` : ''}
      </div>
    `;
  }

  /**
   * Render journal card
   */
  renderJournalCard(sentence) {
    const date = new Date(sentence.date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const languageLabel = sentence.language === 'german' ?
      '<span class="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-bold">🇩🇪 German</span>' :
      '<span class="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full font-bold">🇬🇧 English</span>';

    return `
      <div class="glass-card p-4 rounded-xl cursor-pointer hover:bg-white/90 transition-all"
           onclick="window.globalSearch.navigateToJournal(${sentence.entry_id})">
        <div class="flex justify-between items-start mb-2">
          <div class="text-xs text-slate-500 font-medium">${date}</div>
          ${languageLabel}
        </div>
        <p class="text-slate-700 leading-relaxed italic">
          "${sentence.sentence}"
        </p>
        <div class="mt-2 text-xs text-blue-500 font-medium opacity-70">
          Click to view full journal entry →
        </div>
      </div>
    `;
  }

  /**
   * Render phrase card
   */
  renderPhraseCard(phrase) {
    return `
      <div class="glass-card p-4 rounded-xl cursor-pointer hover:bg-white/90 transition-all"
           onclick="window.globalSearch.navigateToPhrase(${phrase.id})">
        <div class="font-bold text-base text-slate-800 mb-1">${phrase.german}</div>
        <div class="text-sm text-slate-600 italic">${phrase.english}</div>
      </div>
    `;
  }

  /**
   * Show error message
   */
  showError(message) {
    this.resultsContainer.innerHTML = `
      <div class="flex flex-col items-center justify-center py-16 text-red-500">
        <div class="text-6xl mb-4">⚠️</div>
        <h3 class="text-xl font-bold mb-2">Error</h3>
        <p class="text-sm">${message}</p>
      </div>
    `;
  }

  /**
   * Navigate to vocabulary page and highlight word
   */
  navigateToVocabulary(id) {
    this.close();
    navTo('vocabulary');
    
    // Wait for page to load, then scroll to word
    setTimeout(() => {
      const wordCard = document.querySelector(`[onclick*="toggleWordMeaning(${id}"]`)?.closest('.glass-card');
      if (wordCard) {
        wordCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        wordCard.classList.add('search-highlight');
        setTimeout(() => wordCard.classList.remove('search-highlight'), 2000);
      }
    }, 300);
  }

  /**
   * Navigate to journal page and load entry
   */
  navigateToJournal(entryId) {
    this.close();
    navTo('journal');
    
    // Wait for page to load, then open entry
    setTimeout(() => {
      if (typeof viewJournalEntry === 'function') {
        viewJournalEntry(entryId);
      }
    }, 300);
  }

  /**
   * Navigate to phrases page and highlight phrase
   */
  navigateToPhrase(id) {
    this.close();
    navTo('phrases');
    
    // Wait for page to load, then scroll to phrase
    setTimeout(() => {
      // Phrases don't have IDs in the onclick, so we'll need to find another way
      // For now, just navigate to the page
      console.log('Navigated to phrases page');
    }, 300);
  }

  /**
   * Destroy the component
   */
  destroy() {
    if (this.modal) {
      this.modal.remove();
    }
  }
}

// Make GlobalSearch available globally
if (typeof window !== 'undefined') {
  window.GlobalSearch = GlobalSearch;
}