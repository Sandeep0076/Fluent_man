// API Base URL (Update the production URL after first deployment)
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8789'
    : 'https://deutschtagebuch-api.sandeeppathania-mail.workers.dev';

// Application State
const state = {
    currentView: 'dashboard',
    timer: 0,
    timerInterval: null,
    sessionStart: Date.now(),
    isOnline: true,
    editingEntryId: null,
    englishBullets: [],
    germanBullets: [],
    selectedCategoryId: 'all',
    categories: [],
    editingWordId: null,
    journeyMap: null,
    randomWords: [],
    wordOfTheDay: null,
    apiRetryCount: {}, // Track retry attempts per endpoint
    maxRetries: 3, // Maximum retry attempts
    // Swipe gesture state
    touchStartX: 0,
    touchStartY: 0,
    touchEndX: 0,
    touchEndY: 0
};

// Navigation order for swipe gestures
const navigationOrder = ['dashboard', 'journal', 'phrases', 'motivation'];

// --- API HELPER FUNCTIONS ---
async function apiCall(endpoint, options = {}) {
    // Initialize retry counter for this endpoint
    if (!state.apiRetryCount[endpoint]) {
        state.apiRetryCount[endpoint] = 0;
    }

    try {
        console.log(`🔵 API Call: ${API_BASE}${endpoint}`, options);
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        console.log(`🟢 Response status: ${response.status} for ${endpoint}`);

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error(`🔴 API Error Response:`, error);
            
            // Reset retry count on successful response (even if error status)
            state.apiRetryCount[endpoint] = 0;
            
            throw new Error(error.error || `API request failed with status ${response.status}`);
        }

        // Reset retry count on success
        state.apiRetryCount[endpoint] = 0;
        return await response.json();
    } catch (error) {
        console.error(`🔴 API Error for ${endpoint}:`, error);
        console.error('Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });

        // Increment retry count
        state.apiRetryCount[endpoint]++;
        
        // Check retry limit
        if (state.apiRetryCount[endpoint] >= state.maxRetries) {
            console.warn(`⚠️ Max retries (${state.maxRetries}) reached for ${endpoint}. Stopping retries.`);
            showPersistentError(`Failed to connect to server. Please check your connection and refresh the page.`);
            throw error;
        }

        // Check if offline
        if (!navigator.onLine) {
            state.isOnline = false;
            showOfflineWarning();
        }

        throw error;
    }
}

function showOfflineWarning() {
    // Remove existing warning first
    const existing = document.getElementById('offline-warning');
    if (existing) return; // Don't create duplicates
    
    const warning = document.createElement('div');
    warning.id = 'offline-warning';
    warning.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    warning.innerHTML = '⚠️ No connection to server. Please check your deployment.';
    document.body.appendChild(warning);
}

function showPersistentError(message) {
    // Remove existing error first
    const existing = document.getElementById('persistent-error');
    if (existing) existing.remove();
    
    const error = document.createElement('div');
    error.id = 'persistent-error';
    error.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-8 py-4 rounded-lg shadow-2xl z-50 max-w-md text-center';
    error.innerHTML = `
        <div class="font-bold mb-2">⚠️ Server Error</div>
        <div class="text-sm mb-3">${message}</div>
        <button onclick="window.location.reload()" class="bg-white text-red-600 px-4 py-2 rounded font-bold hover:bg-red-50 transition-colors">
            Refresh Page
        </button>
    `;
    document.body.appendChild(error);
}

function hideOfflineWarning() {
    const warning = document.getElementById('offline-warning');
    if (warning) warning.remove();
    state.isOnline = true;
}

// --- NAVIGATION ---
function navTo(viewId) {
    document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const btns = document.querySelectorAll('.nav-item');
    btns.forEach(btn => {
        if (btn.getAttribute('onclick').includes(viewId)) {
            btn.classList.add('active');
        }
    });

    document.getElementById('mobile-menu').classList.add('hidden');
    state.currentView = viewId;

    // Load data for specific views
    if (viewId === 'dashboard') {
        loadDashboard();
        if (state.journeyMap) {
            state.journeyMap.refresh();
        }
    }
    if (viewId === 'phrases') {
        loadPhraseCategories();
        loadPhrases();
    }
    if (viewId === 'journal') {
        initializeBulletPoints();
        loadJournalHistory();
    }
    if (viewId === 'motivation') loadNotes();
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('hidden');
}

// --- TIMER LOGIC ---
function startTimer() {
    state.timerInterval = setInterval(() => {
        state.timer++;
        updateTimerDisplay();
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(state.timer / 60);
    const seconds = state.timer % 60;
    const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    document.getElementById('desktop-timer').innerText = formatted;
    document.getElementById('mobile-timer').innerText = formatted;

    const dashTime = document.getElementById('dash-time');
    if (dashTime) dashTime.innerText = minutes;

    const percentage = Math.min((state.timer / 3600) * 100, 100);
    document.getElementById('timer-bar').style.width = `${percentage}%`;

    // Update journey activity every minute
    if (state.timer > 0 && state.timer % 60 === 0) {
        updateJourneyActivity({ minutes_practiced: 1 });
    }
}

// --- WORD OF THE DAY FUNCTIONALITY ---

/**
 * Load random words from JSON file
 */
async function loadRandomWords() {
    try {
        const response = await fetch('data/Random_words.json');
        if (!response.ok) {
            throw new Error('Failed to load random words');
        }
        state.randomWords = await response.json();
        console.log(`✅ Loaded ${state.randomWords.length} random words`);
        return state.randomWords;
    } catch (error) {
        console.error('Error loading random words:', error);
        return [];
    }
}

/**
 * Get word of the day using deterministic seed based on current date
 */
function getWordOfTheDay() {
    if (!state.randomWords || state.randomWords.length === 0) {
        return null;
    }

    // Get current date as seed (YYYY-MM-DD format)
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    
    // Create a simple hash from the date string
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
        hash = ((hash << 5) - hash) + dateString.charCodeAt(i);
        hash = hash & hash; // Convert to 32bit integer
    }
    
    // Use hash to select a word
    const index = Math.abs(hash) % state.randomWords.length;
    const wordData = state.randomWords[index];
    
    console.log(`📅 Word of the day (${dateString}): ${wordData.word}`);
    return wordData;
}

/**
 * Display word of the day in Robin's Secret Message
 */
function displayWordOfTheDay() {
    const wordData = state.wordOfTheDay;
    
    if (!wordData) {
        console.warn('No word of the day available');
        return;
    }

    // Update the HTML elements
    const wordElement = document.querySelector('#dashboard .text-3xl.lg\\:text-4xl.font-black.mb-2.op-font');
    const meaningElement = document.querySelector('#dashboard .text-base.lg\\:text-lg.mb-6.font-bold.italic');
    const exampleGermanElement = document.querySelector('#dashboard .font-black.text-base.lg\\:text-lg.op-font');
    const exampleEnglishElement = document.querySelector('#dashboard .text-sm.mt-2.font-black');
    
    if (wordElement) {
        wordElement.textContent = wordData.word;
    }
    
    if (meaningElement) {
        // Remove existing category badge before updating
        const existingBadge = meaningElement.querySelector('.text-xs.bg-blue-100');
        if (existingBadge) {
            existingBadge.remove();
        }
        meaningElement.textContent = wordData.meaning;
    }
    
    if (exampleGermanElement) {
        exampleGermanElement.textContent = `"${wordData.example_german}"`;
    }
    
    if (exampleEnglishElement) {
        exampleEnglishElement.textContent = wordData.example_english;
    }
    
    // Add category badge if available
    if (wordData.category) {
        const categoryBadge = document.createElement('span');
        categoryBadge.className = 'text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded-full font-bold ml-2';
        categoryBadge.textContent = wordData.category;
        
        if (meaningElement && !meaningElement.querySelector('.text-xs.bg-blue-100')) {
            meaningElement.appendChild(categoryBadge);
        }
    }
}

/**
 * Shuffle to a random word (triggered by dice button)
 */
function shuffleRandomWord() {
    if (!state.randomWords || state.randomWords.length === 0) {
        console.warn('No random words available');
        return;
    }
    
    // Get a truly random word (not date-based)
    const randomIndex = Math.floor(Math.random() * state.randomWords.length);
    const newWord = state.randomWords[randomIndex];
    
    // Update state
    state.wordOfTheDay = newWord;
    
    // Display the new word with a subtle animation
    const wordCard = document.querySelector('#dashboard .glass-card.p-6.flex.flex-col');
    if (wordCard) {
        wordCard.style.transform = 'scale(0.98)';
        wordCard.style.opacity = '0.7';
        
        setTimeout(() => {
            displayWordOfTheDay();
            wordCard.style.transform = 'scale(1)';
            wordCard.style.opacity = '1';
        }, 150);
    } else {
        displayWordOfTheDay();
    }
    
    console.log(`🎲 Shuffled to random word: ${newWord.word}`);
}

// --- DASHBOARD ---

// Helper function to update user level
async function updateUserLevel() {
    try {
        const activeDays = await apiCall('/progress/active-days');
        const levelElement = document.getElementById('user-level');
        if (levelElement && activeDays.data) {
            const level = activeDays.data.activeDays;
            levelElement.innerText = `lvl ${level}`;
            console.log(`🎯 Level updated to: ${level} (${level} active days)`);
        }
    } catch (error) {
        console.error('Error updating user level:', error);
    }
}

async function loadDashboard() {
    try {
        console.log('📊 Loading dashboard data...');

        // Load statistics
        const stats = await apiCall('/progress/stats');
        const streak = await apiCall('/progress/streak');
        const vocabStats = await apiCall('/vocabulary/stats');
        const activeDays = await apiCall('/progress/active-days');

        // Update UI
        document.getElementById('stat-vocab-count').innerText = stats.data.vocabulary.total;
        document.getElementById('stat-vocab-new').innerText = stats.data.vocabulary.thisWeek;
        document.getElementById('stat-entries').innerText = stats.data.entries.total;

        // Update user level based on active days
        const levelElement = document.getElementById('user-level');
        if (levelElement && activeDays.data) {
            const level = activeDays.data.activeDays;
            levelElement.innerText = `lvl ${level}`;
            console.log(`🎯 User level updated to: ${level} (based on ${level} active days)`);
        }

        // Update streak
        const streakEl = document.querySelector('#dashboard .text-4xl.font-bold.text-amber-600');
        if (streakEl) {
            streakEl.innerHTML = `${streak.data.current} Day${streak.data.current !== 1 ? 's' : ''}`;
        }
        const bestStreakEl = streakEl?.nextElementSibling;
        if (bestStreakEl) {
            bestStreakEl.innerHTML = `Personal Best: ${streak.data.longest} Days`;
        }

        // Display word of the day
        displayWordOfTheDay();

        // Initialize journey map if not already initialized
        if (!state.journeyMap) {
            initJourneyMap();
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        document.getElementById('user-level').innerText = 'lvl 0';
    }
}

// --- BULLET POINT MANAGEMENT ---
function createBulletInput(container, language, initialText = '') {
    const bulletDiv = document.createElement('div');
    bulletDiv.className = 'flex flex-col gap-2 group relative'; // Changed to flex-col to accommodate preview

    const mainRow = document.createElement('div');
    mainRow.className = 'flex items-start gap-2';

    const bullet = document.createElement('span');
    bullet.className = 'text-slate-400 mt-2 select-none';
    bullet.textContent = '•';

    const input = document.createElement('textarea');
    input.className = 'flex-1 bg-transparent border-none outline-none resize-none text-lg leading-relaxed placeholder-slate-300 min-h-[2rem] text-slate-700';
    input.placeholder = language === 'english' ? 'Write a sentence...' : 'Schreiben Sie einen Satz...';
    input.value = initialText;
    input.rows = 1;

    // Special display for German bullets to allow clicking words
    let displayDiv = null;
    if (language === 'german') {
        displayDiv = document.createElement('div');
        displayDiv.className = 'flex-1 text-lg leading-relaxed text-slate-700 min-h-[2rem] py-1 hidden cursor-default';
        mainRow.appendChild(displayDiv);

        // Toggle view on focus/blur
        input.addEventListener('blur', function () {
            if (this.value.trim()) {
                updateGermanDisplay(this.value, displayDiv);
                this.classList.add('hidden');
                displayDiv.classList.remove('hidden');
            }
        });

        displayDiv.addEventListener('click', function () {
            this.classList.add('hidden');
            input.classList.remove('hidden');
            input.focus();
        });

        if (initialText) {
            updateGermanDisplay(initialText, displayDiv);
            input.classList.add('hidden');
            displayDiv.classList.remove('hidden');
        }
    }

    // Auto-resize textarea
    input.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    });

    // Handle Enter key to create new bullet
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (this.value.trim()) {
                addBulletPoint(language, '', true); // Focus the new bullet when user presses Enter
            }
        }
    });

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2 text-xl ml-2';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        const allBullets = container.querySelectorAll('.flex.flex-col.gap-2.group');
        if (allBullets.length > 1) {
            bulletDiv.remove();
        } else {
            input.value = '';
            if (displayDiv) {
                displayDiv.innerHTML = '';
                displayDiv.classList.add('hidden');
                input.classList.remove('hidden');
            }
        }
    };

    mainRow.appendChild(bullet);
    mainRow.appendChild(input);
    mainRow.appendChild(deleteBtn);
    bulletDiv.appendChild(mainRow);

    return bulletDiv;
}

function updateGermanDisplay(text, container) {
    container.innerHTML = '';
    // Split by words and punctuation, keeping track of them
    const tokens = text.split(/(\s+|[.,!?;:()])/);

    tokens.forEach(token => {
        if (token.trim().length > 0 && !/[.,!?;:()]/.test(token)) {
            const span = document.createElement('span');
            span.className = 'hover:text-blue-600 hover:bg-blue-50 px-0.5 rounded transition-colors cursor-pointer inline-block';
            span.textContent = token;
            span.onclick = (e) => {
                e.stopPropagation();
                addWordFromJournal(token);
            };
            container.appendChild(span);
        } else {
            const textNode = document.createTextNode(token);
            container.appendChild(textNode);
        }
    });
}

async function addWordFromJournal(germanWord) {
    if (!confirm(`Add "${germanWord}" to Crew Chants (phrases)?`)) return;

    try {
        console.log(`Adding word "${germanWord}" to phrases...`);
        
        // Fetch English translation first
        const translationResult = await apiCall('/translate/reverse', {
            method: 'POST',
            body: JSON.stringify({ text: germanWord })
        });

        const englishMeaning = translationResult.data.translated;
        console.log(`Translation received: "${englishMeaning}"`);

        // Add to phrases - backend will auto-generate examples using Gemini
        await apiCall('/phrases', {
            method: 'POST',
            body: JSON.stringify({
                english: englishMeaning,
                german: germanWord
            })
        });

    console.log(`Successfully added "${germanWord}" (${englishMeaning}) to Crew Chants!`);

        // Show success
        const feedback = document.getElementById('feedback-area');
        feedback.classList.remove('hidden');
    feedback.querySelector('span').innerHTML = `🎵 Added "<b>${germanWord}</b>" → "<i>${englishMeaning}</i>" to Crew Chants with examples!`;

        // Refresh phrases if on that page
        if (state.currentView === 'phrases') loadPhrases();
        if (state.currentView === 'dashboard') {
            loadDashboard();
        } else {
            await updateUserLevel();
        }

    } catch (error) {
        console.error(`Error adding word "${germanWord}" from journal:`, error);
        console.error('Full error details:', error);
        alert(`Failed to add phrase "${germanWord}": ${error.message}`);
    }
}

function addBulletPoint(language, text = '', shouldFocus = true) {
    const container = language === 'english'
        ? document.getElementById('english-bullets-container')
        : document.getElementById('german-bullets-container');

    const bulletInput = createBulletInput(container, language, text);
    container.appendChild(bulletInput);

    const textarea = bulletInput.querySelector('textarea');
    
    // Only focus if explicitly requested (e.g., when user manually adds a bullet)
    // Don't auto-focus on initial load or navigation to prevent keyboard popup on mobile
    if (shouldFocus) {
        textarea.focus();
    }

    // Trigger auto-resize
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

function initializeBulletPoints() {
    // Clear existing
    const enContainer = document.getElementById('english-bullets-container');
    const deContainer = document.getElementById('german-bullets-container');

    if (enContainer) enContainer.innerHTML = '';
    if (deContainer) deContainer.innerHTML = '';

    // Add initial bullet points without auto-focus to prevent keyboard popup on mobile
    addBulletPoint('english', '', false);
    addBulletPoint('german', '', false);
}

function getBulletsText(language) {
    const container = language === 'english'
        ? document.getElementById('english-bullets-container')
        : document.getElementById('german-bullets-container');

    if (!container) return [];

    const inputs = container.querySelectorAll('textarea');
    const bullets = Array.from(inputs)
        .map(input => input.value.trim())
        .filter(text => text.length > 0);

    return bullets;
}

function setBullets(language, bullets) {
    const container = language === 'english'
        ? document.getElementById('english-bullets-container')
        : document.getElementById('german-bullets-container');

    if (!container) return;

    container.innerHTML = '';

    if (bullets && bullets.length > 0) {
        bullets.forEach(text => addBulletPoint(language, text, false));
    } else {
        addBulletPoint(language, '', false);
    }
}

// --- JOURNAL ---
function clearJournal() {
    state.editingEntryId = null;
    initializeBulletPoints();

    // Reset save button text
    const saveBtn = document.querySelector('button[onclick="processEntry()"]');
    if (saveBtn) saveBtn.innerHTML = '<span>✨</span> Save Entry';
}

async function translateText() {
    const englishBullets = getBulletsText('english');

    if (englishBullets.length === 0) {
        alert('Please write something in English first!');
        return;
    }

    const translateBtn = event.target.closest('button');
    const originalText = translateBtn.innerHTML;
    translateBtn.innerHTML = '<span>⏳</span> Translating...';
    translateBtn.disabled = true;

    try {
        // Join all bullets with newlines for single translation
        const combinedText = englishBullets.join('\n');

        const result = await apiCall('/translate', {
            method: 'POST',
            body: JSON.stringify({
                text: combinedText,
                multiSentence: true
            })
        });

        // Split the translated text back into bullets
        const translatedBullets = result.data.translated
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        // Set the translated bullets
        setBullets('german', translatedBullets);
    } catch (error) {
        alert('Translation failed: ' + error.message);
    } finally {
        translateBtn.innerHTML = originalText;
        translateBtn.disabled = false;
    }
}

async function processEntry() {
    const enBullets = getBulletsText('english');
    const deBullets = getBulletsText('german');

    const enText = enBullets.join('\n');
    const deText = deBullets.join('\n');

    if (!deText.trim()) {
        alert('Bitte schreiben Sie etwas auf Deutsch!');
        return;
    }

    if (!enText.trim()) {
        alert('Please write something in English!');
        return;
    }

    const saveBtn = event.target.closest('button');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span>⏳</span> Saving...';
    saveBtn.disabled = true;

    try {
        const sessionDuration = Math.floor(state.timer / 60);
        let result;

        if (state.editingEntryId) {
            // Update existing entry
            result = await apiCall(`/journal/entry/${state.editingEntryId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    english_text: enText,
                    german_text: deText
                })
            });
        } else {
            // Create new entry
            result = await apiCall('/journal/entry', {
                method: 'POST',
                body: JSON.stringify({
                    english_text: enText,
                    german_text: deText,
                    session_duration: sessionDuration
                })
            });
        }

        // Show success feedback
        showWantedPoster(); // NEW: Trigger One Piece style notification

        // Update journey activity
        await updateJourneyActivity({ journal_entries: 1 });

        // Clear inputs
        clearJournal();

        // Reload dashboard if visible, otherwise just update level
        if (state.currentView === 'dashboard') {
            await loadDashboard();
        } else {
            await updateUserLevel();
        }

        // Reload journal history
        await loadJournalHistory();
    } catch (error) {
        alert('Failed to save entry: ' + error.message);
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// --- JOURNAL HISTORY ---
async function loadJournalHistory() {
    try {
        const sort = document.getElementById('journal-sort').value;
        const result = await apiCall(`/journal/entries?title=&sort=${sort}&limit=50`);
        renderJournalHistory(result.data);
    } catch (error) {
        console.error('Error loading journal history:', error);
        document.getElementById('journal-history-list').innerHTML =
            '<div class="text-center py-10 opacity-50 text-sm text-red-500">Failed to load history</div>';
    }
}

function renderJournalHistory(entries) {
    const container = document.getElementById('journal-history-list');
    container.innerHTML = '';

    if (entries.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10 opacity-50">
                <div class="text-4xl mb-2">📝</div>
                <div class="text-sm">No entries yet</div>
            </div>`;
        return;
    }

    entries.forEach(entry => {
        const date = new Date(entry.created_at);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
        const dateString = date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

        // Preview text from first bullet (German preferred, fallback to English)
        const germanBullets = entry.german_bullets || [];
        const englishBullets = entry.english_bullets || [];
        const firstBullet = germanBullets[0] || englishBullets[0] || '';
        const previewText = firstBullet.substring(0, 50) + (firstBullet.length > 50 ? '...' : '');

        const div = document.createElement('div');
        div.className = 'p-3 rounded-lg bg-white/60 border border-slate-200 hover:bg-white hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group';
        div.onclick = () => viewJournalEntry(entry.id);

        div.innerHTML = `
            <div class="flex justify-between items-start mb-1.5">
                <div class="flex-1 min-w-0">
                    <div class="text-[10px] font-black text-blue-600 tracking-wider mb-0.5">${dayName}</div>
                    <div class="text-xs font-bold text-slate-700 truncate">${dateString}</div>
                </div>
                <div class="flex items-center gap-1.5 ml-2 flex-shrink-0">
                    <span class="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono">${entry.word_count} words</span>
                    <button onclick="deleteJournalEntry(event, ${entry.id})" class="text-slate-300 hover:text-red-500 transition-colors text-sm" title="Delete Entry">🗑️</button>
                </div>
            </div>
            <p class="text-[11px] text-slate-500 italic leading-snug line-clamp-2 group-hover:text-slate-700 transition-colors">
                "${previewText}"
            </p>
        `;
        container.appendChild(div);
    });
}

async function viewJournalEntry(id) {
    try {
        // Option to verify if user wants to overwrite current unsaved text? 
        // For now, we assume viewing history overwrites or we could ask.
        // Let's just load it.
        const result = await apiCall(`/journal/entry/${id}`);
        const entry = result.data;

        // Populate bullet points
        const enBullets = entry.english_bullets || (entry.english_text ? entry.english_text.split('\n') : []);
        const deBullets = entry.german_bullets || (entry.german_text ? entry.german_text.split('\n') : []);

        setBullets('english', enBullets);
        setBullets('german', deBullets);

        // Scroll to top of journal inputs on mobile if needed
        if (window.innerWidth < 1024) {
            document.getElementById('english-bullets-container').scrollIntoView({ behavior: 'smooth' });
        }

        // Set editing state
        state.editingEntryId = id;
        const saveBtn = document.querySelector('button[onclick="processEntry()"]');
        if (saveBtn) saveBtn.innerHTML = '<span>🔄</span> Update Entry';

    } catch (error) {
        console.error('Error loading entry:', error);
        alert('Failed to load entry');
    }
}

async function deleteJournalEntry(event, id) {
    event.stopPropagation();

    if (!confirm('Are you sure you want to delete this journal entry?')) return;

    try {
        await apiCall(`/journal/entry/${id}`, { method: 'DELETE' });

        // If we deleted the currently edited entry, clear the form
        if (state.editingEntryId === id) {
            clearJournal();
        }

        await loadJournalHistory();

        // Refresh dashboard stats if active
        if (state.currentView === 'dashboard') {
            await loadDashboard();
        }
    } catch (error) {
        console.error('Error deleting entry:', error);
        alert('Failed to delete entry');
    }
}

// --- TEXT-TO-SPEECH FOR GERMAN WORDS/PHRASES ---
function speakGermanWord(event, word, wordId) {
    event.stopPropagation();
    
    // Check if browser supports speech synthesis
    if (!('speechSynthesis' in window)) {
        alert('Sorry, your browser does not support text-to-speech. Please try a modern browser like Chrome, Firefox, or Edge.');
        return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Create speech utterance
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'de-DE'; // German language
    utterance.rate = 0.85; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Get the speaker button
    const speakerBtn = document.getElementById(`speaker-${wordId}`);
    
    // Visual feedback - animate button while speaking
    if (speakerBtn) {
        speakerBtn.classList.add('animate-pulse');
        speakerBtn.style.transform = 'scale(1.1)';
    }
    
    // Reset button when speech ends
    utterance.onend = () => {
        if (speakerBtn) {
            speakerBtn.classList.remove('animate-pulse');
            speakerBtn.style.transform = 'scale(1)';
        }
    };
    
    // Handle errors
    utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        if (speakerBtn) {
            speakerBtn.classList.remove('animate-pulse');
            speakerBtn.style.transform = 'scale(1)';
        }
        alert('Failed to pronounce the word. Please try again.');
    };
    
    // Speak the word
    window.speechSynthesis.speak(utterance);
}

// --- PHRASES ---
let selectedPhraseCategoryId = 'all';
let phraseCategories = [];
let editingPhraseId = null;
let donePhraseCategory = null;

function toggleAddPhraseSection() {
    console.log('🔍 DEBUG: toggleAddPhraseSection called');
    const section = document.getElementById('add-phrase-section');
    const toggleBtn = document.getElementById('toggle-add-phrase-btn');
    const isHidden = section.classList.contains('hidden');

    if (isHidden) {
        section.classList.remove('hidden');
        if (toggleBtn) {
            toggleBtn.querySelector('span').innerHTML = '✕';
            toggleBtn.classList.replace('bg-blue-600', 'bg-slate-600');
            toggleBtn.classList.replace('hover:bg-blue-700', 'hover:bg-slate-700');
        }
    } else {
        section.classList.add('hidden');
        if (toggleBtn) {
            toggleBtn.querySelector('span').innerHTML = '+';
            toggleBtn.classList.replace('bg-slate-600', 'bg-blue-600');
            toggleBtn.classList.replace('hover:bg-slate-700', 'hover:bg-blue-700');
        }

        // Clear form when hiding
        document.getElementById('new-phrase-english').value = '';
        document.getElementById('new-phrase-german').value = '';
        document.getElementById('new-phrase-category').value = '';
    }
}

// DEBUG: Verify function is globally accessible
console.log('🔍 DEBUG: toggleAddPhraseSection defined?', typeof toggleAddPhraseSection);
console.log('🔍 DEBUG: toggleAddPhraseSection on window?', typeof window.toggleAddPhraseSection);

async function loadPhrases() {
    try {
        // Get Done category ID
        const doneCategory = phraseCategories.find(cat => cat.name.toLowerCase() === 'done');
        const doneCategoryId = doneCategory ? doneCategory.id : null;
        
        // If viewing "All Phrases", exclude Done category
        // If viewing a specific category, show only that category
        let categoryParam = '';
        if (selectedPhraseCategoryId && selectedPhraseCategoryId !== 'all') {
            categoryParam = `?category_id=${selectedPhraseCategoryId}`;
        } else if (doneCategoryId) {
            // Exclude Done category from "All Phrases" view
            categoryParam = `?exclude_category_id=${doneCategoryId}`;
        }
        
        const result = await apiCall(`/phrases${categoryParam}`);
        renderPhrases(result.data);
    } catch (error) {
        console.error('Error loading phrases:', error);
    }
}

function renderPhrases(phrases) {
    const container = document.getElementById('phrases-container');
    container.innerHTML = '';

    if (phrases.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-20 text-slate-400 opacity-60">
                <div class="text-6xl mb-4 grayscale opacity-50">📢</div>
                <h3 class="text-2xl font-bold">No phrases yet</h3>
                <p>Add your first phrase to get started.</p>
            </div>
        `;
        return;
    }

    phrases.forEach((phrase, index) => {
        const div = document.createElement('div');
        div.className = 'glass-card rounded-2xl overflow-hidden cursor-pointer group hover:scale-[1.01] transition-all border-2 border-[var(--op-wood)] shadow-[4px_4px_0px_#5d3615] bg-[#fffcf0] relative';

        // All phrases are now from the database and can be edited/deleted
        const actionButtons = `
            <div class="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
                <button onclick="showEditPhraseModal(event, ${phrase.id})"
                    class="w-8 h-8 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all shadow-md hover:scale-110"
                    title="Edit Phrase">✏️</button>
                <button onclick="deletePhrase(event, ${phrase.id}, ${phrase.builtin})"
                    class="w-8 h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all shadow-md hover:scale-110"
                    title="Delete Phrase">💀</button>
            </div>
        `;

        // Use phrase field (German) or fallback to german field
        const germanPhrase = phrase.phrase || phrase.german;
        const meaning = phrase.meaning || phrase.english;
        const exampleGerman = phrase.example_german || germanPhrase;
        const exampleEnglish = phrase.example_english || `For example: ${phrase.english}`;

        div.innerHTML = `
            ${actionButtons}
            <div class="p-6" onclick="toggleTranslation(${index})">
                <div class="flex justify-between items-start mb-3">
                    <span class="text-[10px] font-black text-[var(--op-blue)] uppercase tracking-widest op-font">German Phrase</span>
                    <span class="text-[10px] text-slate-400 group-hover:text-[var(--op-red)] transition-colors font-black uppercase">View Details</span>
                </div>
                <p class="text-2xl text-slate-800 font-bold leading-relaxed op-font mb-3">${germanPhrase}</p>
                <div class="text-sm text-slate-600 italic">${meaning}</div>
            </div>
            <div id="phrase-de-${index}" class="bg-[var(--op-yellow)]/20 p-6 border-t-2 border-dashed border-[#5d3615] hidden" onclick="toggleTranslation(${index})">
                <div class="space-y-4">
                    <div>
                        <div class="text-[10px] font-black text-[var(--op-red)] uppercase tracking-widest mb-2 op-font">🇩🇪 German Example</div>
                        <div class="flex items-center gap-2">
                            <p class="text-lg font-bold text-[#5d3615] op-font flex-1">${exampleGerman}</p>
                            <button onclick="speakGermanWord(event, '${exampleGerman.replace(/'/g, "\\'")}', ${phrase.id})"
                                id="speaker-${phrase.id}"
                                class="w-8 h-8 flex items-center justify-center bg-[var(--ocean-mid)] hover:bg-[var(--ocean-deep)] text-white rounded-lg transition-all shadow-md hover:scale-110 flex-shrink-0"
                                title="Pronounce phrase">
                                🔊
                            </button>
                        </div>
                    </div>
                    <div>
                        <div class="text-[10px] font-black text-[var(--op-blue)] uppercase tracking-widest mb-2 op-font">🇬🇧 English Example</div>
                        <p class="text-lg font-medium text-slate-700">${exampleEnglish}</p>
                    </div>
                </div>
                <div class="mt-4 text-[10px] text-slate-500 italic text-center">Yo-ho-ho-ho! 🎻</div>
            </div>
            <button onclick="markPhraseAsDone(event, ${phrase.id})"
                class="absolute bottom-2 right-2 w-6 h-6 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white rounded-full transition-all shadow-md hover:scale-110 opacity-70 hover:opacity-100 text-xs"
                title="Mark as done">
                ✓
            </button>
        `;
        container.appendChild(div);
    });
}

function toggleTranslation(index) {
    const el = document.getElementById(`phrase-de-${index}`);
    el.classList.toggle('hidden');
}

async function addPhrase() {
    const englishInput = document.getElementById('new-phrase-english');
    const germanInput = document.getElementById('new-phrase-german');
    const categorySelect = document.getElementById('new-phrase-category');

    const english = englishInput.value.trim();
    const german = germanInput.value.trim();
    const category_id = categorySelect.value;

    if (!english) {
        alert('Please enter an English phrase!');
        return;
    }

    // Show loading state
    const addBtn = event?.target?.closest('button') || document.querySelector('button[onclick="addPhrase()"]');
    const originalText = addBtn?.innerHTML;
    if (addBtn) {
        addBtn.innerHTML = '<span>⏳</span> Translating & Adding...';
        addBtn.disabled = true;
    }

    try {
        const payload = { english };
        if (german) {
            payload.german = german;
        }
        if (category_id) {
            payload.category_id = category_id;
        }

        await apiCall('/phrases', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        // Clear inputs
        englishInput.value = '';
        germanInput.value = '';
        categorySelect.value = '';

        // Reload phrases
        await loadPhrases();

        // Show success feedback
        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
        successMsg.innerHTML = '✓ Phrase added successfully with auto-translation!';
        document.body.appendChild(successMsg);

        setTimeout(() => successMsg.remove(), 3000);

        // Update dashboard if visible
        if (state.currentView === 'dashboard') {
            await loadDashboard();
        }
    } catch (error) {
        alert('Failed to add phrase: ' + error.message);
    } finally {
        if (addBtn) {
            addBtn.innerHTML = originalText;
            addBtn.disabled = false;
        }
    }
}

// Ensure "Done" phrase category exists, create if not
async function ensureDonePhraseCategory() {
    const doneCategory = phraseCategories.find(cat => cat.name.toLowerCase() === 'done');
    
    if (!doneCategory) {
        try {
            await apiCall('/phrases/categories', {
                method: 'POST',
                body: JSON.stringify({ name: 'Done' })
            });
            
            // Reload categories to get the new one
            const result = await apiCall('/phrases/categories');
            phraseCategories = result.data;
            donePhraseCategory = phraseCategories.find(cat => cat.name.toLowerCase() === 'done');
            console.log('✅ "Done" phrase category created automatically');
        } catch (error) {
            console.error('Error creating Done phrase category:', error);
        }
    } else {
        donePhraseCategory = doneCategory;
    }
    
    return donePhraseCategory;
}

// Mark phrase as done (move to Done category)
async function markPhraseAsDone(event, phraseId) {
    event.stopPropagation();
    
    try {
        // Ensure Done category exists
        const doneCategory = await ensureDonePhraseCategory();
        
        if (!doneCategory) {
            alert('Done category not found. Please refresh the page.');
            return;
        }
        
        // Update phrase to move it to Done category
        await apiCall(`/phrases/${phraseId}`, {
            method: 'PUT',
            body: JSON.stringify({
                category_id: doneCategory.id
            })
        });
        
        // Show success feedback with animation
        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
        successMsg.innerHTML = '✓ Phrase marked as done!';
        document.body.appendChild(successMsg);
        
        setTimeout(() => successMsg.remove(), 2000);
        
        // Reload phrases (phrase will disappear from main view)
        await loadPhrases();
        
        // Update dashboard if visible
        if (state.currentView === 'dashboard') {
            await loadDashboard();
        }
    } catch (error) {
        console.error('Error marking phrase as done:', error);
        alert('Failed to mark phrase as done: ' + error.message);
    }
}

// --- PHRASE CATEGORIES ---
async function loadPhraseCategories() {
    try {
        const result = await apiCall('/phrases/categories');
        phraseCategories = result.data;
        
        // Ensure "Done" category exists
        await ensureDonePhraseCategory();
        
        renderPhraseCategories();
        updatePhraseCategorySelects();
    } catch (error) {
        console.error('Error loading phrase categories:', error);
    }
}

function renderPhraseCategories() {
    const container = document.getElementById('phrase-category-list');
    if (!container) return;

    // Keep "All Phrases" button
    container.innerHTML = `
        <button onclick="selectPhraseCategory('all')" id="phrase-cat-all"
            class="w-full text-left px-4 py-3 rounded-xl transition-all font-medium ${selectedPhraseCategoryId === 'all' ? 'bg-blue-600 text-white font-bold shadow-md' : 'bg-white/50 text-slate-600 hover:bg-white hover:shadow-sm'}">
            📁 All Phrases
        </button>
    `;

    phraseCategories.forEach(cat => {
        const isActive = selectedPhraseCategoryId == cat.id;
        const btn = document.createElement('button');
        btn.onclick = () => selectPhraseCategory(cat.id);
        btn.id = `phrase-cat-${cat.id}`;
        btn.className = `w-full text-left px-4 py-3 rounded-xl transition-all font-medium flex justify-between items-center group ${isActive ? 'bg-blue-600 text-white font-bold shadow-md' : 'bg-white/50 text-slate-600 hover:bg-white hover:shadow-sm'}`;

        btn.innerHTML = `
            <span>📁 ${cat.name}</span>
            <span onclick="deletePhraseCategory(event, ${cat.id})" class="opacity-0 group-hover:opacity-100 text-xs bg-red-400 hover:bg-red-500 text-white p-1 rounded-md transition-all">✕</span>
        `;
        container.appendChild(btn);
    });
}

function updatePhraseCategorySelects() {
    const selects = ['new-phrase-category', 'edit-phrase-category'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;

        const currentVal = select.value;
        select.innerHTML = '<option value="">No Category</option>';

        phraseCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            select.appendChild(option);
        });

        select.value = currentVal;
    });
}

function selectPhraseCategory(id) {
    selectedPhraseCategoryId = id;
    renderPhraseCategories();
    loadPhrases();
}

function showAddPhraseCategoryModal() {
    const modal = document.getElementById('add-phrase-category-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('new-phrase-category-name').focus();
}

function hideAddPhraseCategoryModal() {
    const modal = document.getElementById('add-phrase-category-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.getElementById('new-phrase-category-name').value = '';
}

async function addPhraseCategory() {
    const nameInput = document.getElementById('new-phrase-category-name');
    const name = nameInput.value.trim();

    if (!name) {
        alert('Please enter a category name!');
        return;
    }

    try {
        await apiCall('/phrases/categories', {
            method: 'POST',
            body: JSON.stringify({ name })
        });

        hideAddPhraseCategoryModal();
        await loadPhraseCategories();

        // Show success feedback
        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-[110] animate-fade-in';
        successMsg.innerHTML = '✓ Category created successfully!';
        document.body.appendChild(successMsg);
        setTimeout(() => successMsg.remove(), 3000);

    } catch (error) {
        alert('Failed to add category: ' + error.message);
    }
}

async function deletePhraseCategory(event, id) {
    event.stopPropagation();
    if (!confirm('Are you sure you want to delete this category? Phrases inside will not be deleted but will no longer have a category.')) return;

    try {
        await apiCall(`/phrases/categories/${id}`, { method: 'DELETE' });

        if (selectedPhraseCategoryId == id) {
            selectedPhraseCategoryId = 'all';
        }

        await loadPhraseCategories();
        await loadPhrases();
    } catch (error) {
        alert('Failed to delete category: ' + error.message);
    }
}

/**
 * Delete a phrase (custom or built-in)
 */
async function deletePhrase(event, phraseId, isBuiltin = false) {
    event.stopPropagation();
    
    const confirmMessage = isBuiltin
        ? 'Are you sure you want to delete this built-in phrase? You can always add it back later as a custom phrase.'
        : 'Are you sure you want to delete this phrase? This action cannot be undone.';
    
    if (!confirm(confirmMessage)) {
        return;
    }

    try {
        await apiCall(`/phrases/${phraseId}`, { method: 'DELETE' });

        // Show success feedback
        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
        successMsg.innerHTML = '✓ Phrase deleted successfully!';
        document.body.appendChild(successMsg);

        setTimeout(() => successMsg.remove(), 3000);

        // Reload phrases
        await loadPhrases();
    } catch (error) {
        console.error('Error deleting phrase:', error);
        alert('Failed to delete phrase: ' + error.message);
    }
}

// --- EDIT PHRASE ---
async function showEditPhraseModal(event, phraseId) {
    event.stopPropagation();
    
    try {
        // Fetch the phrase details
        const result = await apiCall(`/phrases/${phraseId}`);
        const phrase = result.data;

        // Populate the modal with all fields
        document.getElementById('edit-phrase-english').value = phrase.english || '';
        document.getElementById('edit-phrase-german').value = phrase.german || '';
        document.getElementById('edit-phrase-example-english').value = phrase.example_english || '';
        document.getElementById('edit-phrase-example-german').value = phrase.example_german || '';
        document.getElementById('edit-phrase-category').value = phrase.category_id || '';

        editingPhraseId = phraseId;

        // Show modal
        const modal = document.getElementById('edit-phrase-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    } catch (error) {
        console.error('Error loading phrase:', error);
        alert('Failed to load phrase details');
    }
}

function hideEditPhraseModal() {
    const modal = document.getElementById('edit-phrase-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    
    // Clear all form fields
    document.getElementById('edit-phrase-english').value = '';
    document.getElementById('edit-phrase-german').value = '';
    document.getElementById('edit-phrase-example-english').value = '';
    document.getElementById('edit-phrase-example-german').value = '';
    document.getElementById('edit-phrase-category').value = '';
    editingPhraseId = null;
}

async function updatePhrase() {
    if (!editingPhraseId) return;

    const english = document.getElementById('edit-phrase-english').value.trim();
    const german = document.getElementById('edit-phrase-german').value.trim();
    const exampleEnglish = document.getElementById('edit-phrase-example-english').value.trim();
    const exampleGerman = document.getElementById('edit-phrase-example-german').value.trim();
    const category_id = document.getElementById('edit-phrase-category').value;

    if (!english) {
        alert('Please enter an English phrase!');
        return;
    }

    if (!german) {
        alert('Please enter a German translation!');
        return;
    }

    // Show loading state
    const updateBtn = event?.target?.closest('button') || document.querySelector('button[onclick="updatePhrase()"]');
    const originalText = updateBtn?.innerHTML;
    if (updateBtn) {
        updateBtn.innerHTML = '<span>⏳</span> Updating...';
        updateBtn.disabled = true;
    }

    try {
        const payload = {
            english,
            german,
            meaning: english,
            example_english: exampleEnglish || `For example: ${english}`,
            example_german: exampleGerman || german
        };
        if (category_id) {
            payload.category_id = category_id;
        }

        await apiCall(`/phrases/${editingPhraseId}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        hideEditPhraseModal();
        await loadPhrases();

        // Show success feedback
        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
        successMsg.innerHTML = '✓ Phrase updated successfully!';
        document.body.appendChild(successMsg);

        setTimeout(() => successMsg.remove(), 3000);
    } catch (error) {
        alert('Failed to update phrase: ' + error.message);
    } finally {
        if (updateBtn) {
            updateBtn.innerHTML = originalText;
            updateBtn.disabled = false;
        }
    }
}

// --- NOTES (formerly MOTIVATION) ---
let editingNoteId = null;

// Helper function to make URLs clickable in text
function linkifyUrls(text) {
    // Regular expression to match URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    // Replace URLs with clickable anchor tags
    return text.replace(urlRegex, function(url) {
        // Remove trailing punctuation that shouldn't be part of the URL
        let cleanUrl = url;
        let trailingPunctuation = '';
        const punctuation = /[.,;:!?)]+$/;
        const match = url.match(punctuation);
        if (match) {
            trailingPunctuation = match[0];
            cleanUrl = url.slice(0, -trailingPunctuation.length);
        }
        
        return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline hover:no-underline transition-colors">${cleanUrl}</a>${trailingPunctuation}`;
    });
}

function toggleAddNote() {
    const section = document.getElementById('add-note-section');
    const toggleBtn = document.getElementById('toggle-note-btn');
    const isHidden = section.classList.contains('hidden');

    if (isHidden) {
        section.classList.remove('hidden');
        if (toggleBtn) {
            toggleBtn.querySelector('span').innerHTML = '✕';
            toggleBtn.classList.replace('bg-blue-600', 'bg-slate-600');
        }
    } else {
        section.classList.add('hidden');
        if (toggleBtn) {
            toggleBtn.querySelector('span').innerHTML = '+';
            toggleBtn.classList.replace('bg-slate-600', 'bg-blue-600');
        }

        // Clear form
        document.getElementById('new-note-title').value = '';
        document.getElementById('new-note-content').value = '';
        editingNoteId = null;
        const addBtn = document.querySelector('button[onclick="addNote()"]');
        if (addBtn) addBtn.innerHTML = '+ Add Note';
    }
}

async function loadNotes() {
    try {
        const sortMode = document.getElementById('notes-sort').value;
        const result = await apiCall(`/notes?sort=${sortMode}`);
        renderNotes(result.data);
    } catch (error) {
        console.error('Error loading notes:', error);
    }
}

function renderNotes(notes) {
    const container = document.getElementById('notes-grid');
    container.innerHTML = '';

    if (notes.length === 0) {
        document.getElementById('empty-notes-state').classList.remove('hidden');
    } else {
        document.getElementById('empty-notes-state').classList.add('hidden');

        // Define border colors for variety
        const opColors = ['border-[var(--op-red)]', 'border-[var(--op-yellow)]', 'border-[var(--op-blue)]', 'border-[var(--op-wood)]'];

        notes.forEach((note, index) => {
            const div = document.createElement('div');
            const borderColor = opColors[index % opColors.length];
            div.className = `glass-card p-8 rounded-2xl border-t-8 ${borderColor} bg-[#fffcf0] relative group shadow-[4px_4px_0px_#5d3615]`;

            const date = new Date(note.created_at).toLocaleDateString();

            div.innerHTML = `
                <div class="flex justify-between items-start mb-4">
                    <h3 class="font-black text-2xl text-slate-800 flex-1 pr-2 op-font">${note.title}</h3>
                    <div class="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="editNote(${note.id})" class="text-[var(--op-blue)] hover:text-blue-800 transition-colors text-xl" title="Edit Meat">🍖</button>
                        <button onclick="deleteNote(${note.id})" class="text-[var(--op-red)] hover:text-red-800 transition-colors text-xl" title="Throw Away">🗑️</button>
                    </div>
                </div>
                <p class="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">${linkifyUrls(note.content)}</p>
                <div class="text-[10px] text-slate-500 mt-6 font-black uppercase tracking-widest">Logged by Sanji: ${date}</div>
            `;
            container.appendChild(div);
        });
    }
}

async function addNote() {
    const titleInput = document.getElementById('new-note-title');
    const contentInput = document.getElementById('new-note-content');

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (!title) {
        alert('Please enter a note title!');
        return;
    }

    if (!content) {
        alert('Please enter note content!');
        return;
    }

    try {
        if (editingNoteId) {
            // Update existing note
            await apiCall(`/notes/${editingNoteId}`, {
                method: 'PUT',
                body: JSON.stringify({ title, content })
            });
            editingNoteId = null;

            // Reset button text
            const addBtn = document.querySelector('button[onclick="addNote()"]');
            addBtn.innerHTML = '+ Add Note';
        } else {
            // Create new note
            await apiCall('/notes', {
                method: 'POST',
                body: JSON.stringify({ title, content })
            });
        }

        // Clear inputs
        titleInput.value = '';
        contentInput.value = '';

        // Hide section and reset button
        const section = document.getElementById('add-note-section');
        const toggleBtn = document.getElementById('toggle-note-btn');
        section.classList.add('hidden');
        if (toggleBtn) {
            toggleBtn.querySelector('span').innerHTML = '+';
            toggleBtn.classList.replace('bg-slate-600', 'bg-blue-600');
        }

        // Reload notes
        await loadNotes();

        // Show success feedback
        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
        successMsg.innerHTML = editingNoteId ? '✓ Note updated successfully!' : '✓ Note added successfully!';
        document.body.appendChild(successMsg);

        setTimeout(() => successMsg.remove(), 3000);
    } catch (error) {
        alert('Failed to save note: ' + error.message);
    }
}

async function editNote(id) {
    try {
        const result = await apiCall(`/notes/${id}`);
        const note = result.data;

        document.getElementById('new-note-title').value = note.title;
        document.getElementById('new-note-content').value = note.content;

        editingNoteId = id;

        // Update button text
        const addBtn = document.querySelector('button[onclick="addNote()"]');
        addBtn.innerHTML = '💾 Update Note';

        // Show section if hidden and update button
        const section = document.getElementById('add-note-section');
        const toggleBtn = document.getElementById('toggle-note-btn');
        section.classList.remove('hidden');
        if (toggleBtn) {
            toggleBtn.querySelector('span').innerHTML = '✕';
            toggleBtn.classList.replace('bg-blue-600', 'bg-slate-600');
        }

        // Scroll to form
        document.getElementById('new-note-title').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (error) {
        console.error('Error loading note:', error);
        alert('Failed to load note');
    }
}

async function deleteNote(id) {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
        await apiCall(`/notes/${id}`, { method: 'DELETE' });

        // If we deleted the currently edited note, clear the form
        if (editingNoteId === id) {
            document.getElementById('new-note-title').value = '';
            document.getElementById('new-note-content').value = '';
            editingNoteId = null;

            const addBtn = document.querySelector('button[onclick="addNote()"]');
            addBtn.innerHTML = '+ Add Note';
        }

        await loadNotes();
    } catch (error) {
        console.error('Error deleting note:', error);
        alert('Failed to delete note');
    }
}

function sortNotes() {
    loadNotes();
}


// --- JOURNEY MAP INTEGRATION ---
function initJourneyMap() {
    try {
        // Create journey map container if not exists in dashboard
        let container = document.getElementById('journey-map-widget');
        if (!container) {
            const dashboardSection = document.getElementById('dashboard');
            const journeyCard = dashboardSection?.querySelector('.glass-card.p-6.rounded-3xl');
            if (journeyCard) {
                // Replace the simple timeline with full journey map
                container = document.createElement('div');
                container.id = 'journey-map-widget';
                journeyCard.innerHTML = '';
                journeyCard.appendChild(container);
            }
        }

        if (container && typeof JourneyMap !== 'undefined') {
            state.journeyMap = new JourneyMap('journey-map-widget', API_BASE);
            state.journeyMap.init();
            console.log('✅ Journey map initialized');
        }
    } catch (error) {
        console.error('Error initializing journey map:', error);
    }
}

async function updateJourneyActivity(activity) {
    try {
        await apiCall('/journey/update-activity', {
            method: 'POST',
            body: JSON.stringify(activity)
        });

        // Refresh journey map if active
        if (state.journeyMap && state.currentView === 'dashboard') {
            await state.journeyMap.refresh();
        }
    } catch (error) {
        console.error('Error updating journey activity:', error);
    }
}

// --- WANTED POSTER SYSTEM ---
function showWantedPoster() {
    const modal = document.getElementById('wanted-modal');
    const bountyEl = document.getElementById('wanted-bounty');

    // Calculate a "bounty" based on total vocab count (simulated for now)
    const vocabCount = parseInt(document.getElementById('stat-vocab-count').innerText) || 100;
    const bounty = (vocabCount * 1250000).toLocaleString();

    bountyEl.innerText = bounty;
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // Play a sound effect if you like (optional)
}

function hideWantedModal() {
    const modal = document.getElementById('wanted-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// --- SWIPE GESTURE HANDLING ---
function handleTouchStart(e) {
    state.touchStartX = e.changedTouches[0].screenX;
    state.touchStartY = e.changedTouches[0].screenY;
}

function handleTouchEnd(e) {
    state.touchEndX = e.changedTouches[0].screenX;
    state.touchEndY = e.changedTouches[0].screenY;
    handleSwipeGesture();
}

function handleSwipeGesture() {
    const minSwipeDistance = 50; // Minimum distance for a swipe to register
    const maxVerticalDistance = 100; // Maximum vertical movement to still count as horizontal swipe
    
    const deltaX = state.touchEndX - state.touchStartX;
    const deltaY = Math.abs(state.touchEndY - state.touchStartY);
    
    // Check if it's a horizontal swipe (not too much vertical movement)
    if (deltaY > maxVerticalDistance) {
        return; // Too much vertical movement, ignore
    }
    
    // Swipe right (previous section)
    if (deltaX > minSwipeDistance) {
        navigateToPrevious();
    }
    // Swipe left (next section)
    else if (deltaX < -minSwipeDistance) {
        navigateToNext();
    }
}

function navigateToNext() {
    const currentIndex = navigationOrder.indexOf(state.currentView);
    if (currentIndex < navigationOrder.length - 1) {
        const nextView = navigationOrder[currentIndex + 1];
        navTo(nextView);
        showSwipeIndicator('Next: ' + getViewDisplayName(nextView), 'left');
    }
}

function navigateToPrevious() {
    const currentIndex = navigationOrder.indexOf(state.currentView);
    if (currentIndex > 0) {
        const prevView = navigationOrder[currentIndex - 1];
        navTo(prevView);
        showSwipeIndicator('Previous: ' + getViewDisplayName(prevView), 'right');
    }
}

function getViewDisplayName(viewId) {
    const displayNames = {
    'dashboard': 'Captain’s Deck',
    'journal': 'Logbook',
    'phrases': 'Crew Chants',
    'motivation': 'Ship Notes'
    };
    return displayNames[viewId] || viewId;
}

function showSwipeIndicator(message, direction) {
    // Remove existing indicator if any
    const existing = document.getElementById('swipe-indicator');
    if (existing) existing.remove();
    
    const indicator = document.createElement('div');
    indicator.id = 'swipe-indicator';
    indicator.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg z-50 animate-bounce-in font-bold';
    indicator.style.animation = 'fade-in 0.3s ease-out';
    indicator.innerHTML = `
        <div class="flex items-center gap-2">
            <span>${direction === 'left' ? '←' : '→'}</span>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(indicator);
    
    setTimeout(() => {
        indicator.style.opacity = '0';
        indicator.style.transition = 'opacity 0.3s ease-out';
        setTimeout(() => indicator.remove(), 300);
    }, 1500);
}

// --- INITIALIZATION ---
window.onload = async function () {
    // Check server connection
    try {
        const healthCheck = await apiCall('/health');
        console.log('✅ Server connected:', healthCheck);
        hideOfflineWarning();
    } catch (error) {
        console.error('❌ Server connection failed:', error);
        showOfflineWarning();
    }

    // Load random words and set word of the day
    await loadRandomWords();
    state.wordOfTheDay = getWordOfTheDay();

    // Start timer
    startTimer();

    // Load initial data
    try {
        await loadDashboard();
        await loadPhrases();
        // If we successfully loaded data, hide any warning that might have appeared
        hideOfflineWarning();
    } catch (error) {
        console.error('Failed to load initial data:', error);
    }

    // Setup mobile menu
    document.getElementById('mobile-menu-btn').addEventListener('click', toggleMobileMenu);

    // Setup swipe gestures on main content area
    const mainContent = document.querySelector('main');
    if (mainContent) {
        mainContent.addEventListener('touchstart', handleTouchStart, { passive: true });
        mainContent.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    // Initialize global search
    if (typeof GlobalSearch !== 'undefined') {
        window.globalSearch = new GlobalSearch(API_BASE);
        window.globalSearch.init();
        console.log('✅ Global search initialized');
    } else {
        console.warn('⚠️ GlobalSearch component not loaded');
    }

    // Monitor online/offline status
    window.addEventListener('online', () => {
        hideOfflineWarning();
        loadDashboard();
    });

    window.addEventListener('offline', () => {
        showOfflineWarning();
    });
};