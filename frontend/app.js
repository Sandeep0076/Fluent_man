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
    categories: []
};

// --- API HELPER FUNCTIONS ---
async function apiCall(endpoint, options = {}) {
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
            const error = await response.json();
            console.error(`🔴 API Error Response:`, error);
            throw new Error(error.error || 'API request failed');
        }

        return await response.json();
    } catch (error) {
        console.error(`🔴 API Error for ${endpoint}:`, error);
        console.error('Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });

        // Check if offline
        if (!navigator.onLine) {
            state.isOnline = false;
            showOfflineWarning();
        }

        throw error;
    }
}

function showOfflineWarning() {
    const warning = document.createElement('div');
    warning.id = 'offline-warning';
    warning.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    warning.innerHTML = '⚠️ No connection to server. Please start the backend.';
    document.body.appendChild(warning);
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
    if (viewId === 'vocabulary') {
        loadCategories();
        loadVocabulary();
    }
    if (viewId === 'dashboard') loadDashboard();
    if (viewId === 'phrases') loadPhrases();
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
}

// --- DASHBOARD ---
let progressChartInstance = null;

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

        // Load chart data
        await loadChart();
    } catch (error) {
        console.error('Error loading dashboard:', error);
        document.getElementById('user-level').innerText = 'lvl 0';
    }
}

async function loadChart() {
    try {
        const chartData = await apiCall('/progress/chart-data?days=7');

        const ctx = document.getElementById('progressChart').getContext('2d');

        if (progressChartInstance) {
            progressChartInstance.destroy();
        }

        progressChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.data.labels,
                datasets: [{
                    label: 'Words Learned',
                    data: chartData.data.datasets.words,
                    borderColor: '#2563eb', // Blue-600
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#2563eb',
                    pointBorderColor: '#ffffff',
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        titleColor: '#1e293b',
                        bodyColor: '#475569',
                        borderColor: 'rgba(0, 0, 0, 0.1)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        cornerRadius: 12,
                        titleFont: { family: 'Outfit', size: 14 },
                        bodyFont: { family: 'Outfit', size: 13 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { borderDash: [4, 4], color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: { font: { family: 'Outfit' }, color: '#64748b' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { family: 'Outfit' }, color: '#64748b' }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading chart:', error);
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
                addBulletPoint(language);
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
    if (!confirm(`Do you want to add "${germanWord}" to your vocabulary bank?`)) return;

    try {
        // Fetch English translation first
        const translationResult = await apiCall('/translate/reverse', {
            method: 'POST',
            body: JSON.stringify({ text: germanWord })
        });

        const englishMeaning = translationResult.data.translated;

        // Show confirm with translation
        if (!confirm(`Translated as: "${englishMeaning}". Add this to vocabulary?`)) return;

        await apiCall('/vocabulary', {
            method: 'POST',
            body: JSON.stringify({
                word: englishMeaning, // Backend POST /api/vocabulary expects English 'word' and auto-translates or takes 'meaning' as German
                meaning: germanWord   // Based on existing backend logic in vocabulary.js POST
            })
        });

        // Show success
        const feedback = document.getElementById('feedback-area');
        feedback.classList.remove('hidden');
        feedback.querySelector('span').innerHTML = `🎉 Added "<b>${germanWord}</b>" (<i>${englishMeaning}</i>) to vocabulary!`;

        // Refresh vocabulary if on that page
        if (state.currentView === 'vocabulary') loadVocabulary();
        if (state.currentView === 'dashboard') {
            loadDashboard();
        } else {
            await updateUserLevel();
        }

    } catch (error) {
        console.error('Error adding word from journal:', error);
        alert('Failed to add word: ' + error.message);
    }
}

function addBulletPoint(language, text = '') {
    const container = language === 'english'
        ? document.getElementById('english-bullets-container')
        : document.getElementById('german-bullets-container');

    const bulletInput = createBulletInput(container, language, text);
    container.appendChild(bulletInput);

    // Focus the new input
    const textarea = bulletInput.querySelector('textarea');
    textarea.focus();

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

    // Add initial bullet points
    addBulletPoint('english');
    addBulletPoint('german');
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
        bullets.forEach(text => addBulletPoint(language, text));
    } else {
        addBulletPoint(language);
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

// --- VOCABULARY ---
async function loadVocabulary() {
    try {
        const searchText = document.getElementById('vocab-search').value;
        const sortMode = document.getElementById('vocab-sort').value;

        // If there's a search query, use the unified search endpoint
        if (searchText && searchText.trim().length > 0) {
            const result = await apiCall(`/search?q=${encodeURIComponent(searchText)}`);
            renderSearchResults(result.data, searchText);
        } else {
            // Otherwise, load all vocabulary with sorting
            const categoryParam = state.selectedCategoryId && state.selectedCategoryId !== 'all' ? `&category_id=${state.selectedCategoryId}` : '';
            const result = await apiCall(`/vocabulary?sort=${sortMode}${categoryParam}`);
            renderVocabulary(result.data);
        }
    } catch (error) {
        console.error('Error loading vocabulary:', error);
    }
}

function renderVocabulary(words) {
    const container = document.getElementById('vocab-grid');
    container.innerHTML = '';

    if (words.length === 0) {
        document.getElementById('empty-vocab-state').classList.remove('hidden');
    } else {
        document.getElementById('empty-vocab-state').classList.add('hidden');
        words.forEach(item => {
            const div = document.createElement('div');
            div.className = 'glass-card p-6 rounded-xl relative cursor-pointer group hover:bg-[#fff9e6] transition-all border-2 border-[var(--op-wood)] shadow-[4px_4px_0px_#5d3615]';

            const date = new Date(item.first_seen).toLocaleDateString();
            const frequency = item.frequency > 1 ? `<div class="text-[10px] bg-[var(--op-blue)] text-white px-2 py-0.5 rounded-full inline-block mt-2 font-bold font-mono">ENCOUNTERED ${item.frequency}x</div>` : '';

            div.innerHTML = `
                <div onclick="toggleWordMeaning(${item.id}, event)" class="cursor-pointer">
                    <div class="op-title text-xs text-[var(--op-red)] mb-1">ARREST WARRANT</div>
                    <div class="font-black text-2xl text-slate-800 mb-1 op-font tracking-wide">${item.word}</div>
                    <div class="text-[10px] text-slate-500 uppercase font-black tracking-tighter">Seen: ${date}</div>
                    ${frequency}
                    <div id="meaning-${item.id}" class="hidden mt-4 pt-4 border-t-2 border-dashed border-[#5d3615]">
                        <div class="text-[10px] text-[var(--op-blue)] font-black uppercase tracking-widest mb-1">Deciphered Meaning</div>
                        <div class="text-md text-slate-700 italic font-medium" id="meaning-text-${item.id}">
                            ${item.meaning || '<span class="text-slate-400">Consulting Robin...</span>'}
                        </div>
                    </div>
                </div>
                <button onclick="deleteWord(${item.id})" class="absolute top-2 right-2 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-2xl font-black">✕</button>
            `;
            container.appendChild(div);
        });
    }
}

function renderSearchResults(searchData, searchTerm) {
    const container = document.getElementById('vocab-grid');
    container.innerHTML = '';

    const { vocabulary, journal_sentences, counts } = searchData;
    const totalResults = counts.vocabulary + counts.journal_sentences;

    if (totalResults === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-20 text-slate-400">
                <div class="text-6xl mb-4 grayscale opacity-50">🔍</div>
                <h3 class="text-2xl font-bold mb-2">No results found</h3>
                <p>Try searching for a different word or phrase</p>
            </div>
        `;
        document.getElementById('empty-vocab-state').classList.add('hidden');
        return;
    }

    document.getElementById('empty-vocab-state').classList.add('hidden');

    // Add search results header
    const header = document.createElement('div');
    header.className = 'col-span-full glass-card p-6 rounded-[24px] !bg-blue-50/80 border-blue-100';
    header.innerHTML = `
        <div class="flex items-center justify-between">
            <div>
                <h3 class="text-lg font-bold text-slate-800 mb-1">Search Results for "${searchTerm}"</h3>
                <p class="text-sm text-slate-600">
                    Found ${counts.vocabulary} vocabulary word${counts.vocabulary !== 1 ? 's' : ''}
                    and ${counts.journal_sentences} sentence${counts.journal_sentences !== 1 ? 's' : ''} from journals
                </p>
            </div>
            <button onclick="clearSearch()" class="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-medium transition-all">
                Clear Search
            </button>
        </div>
    `;
    container.appendChild(header);

    // Render vocabulary results
    if (vocabulary.length > 0) {
        const vocabHeader = document.createElement('div');
        vocabHeader.className = 'col-span-full mt-4';
        vocabHeader.innerHTML = `
            <h4 class="text-md font-bold text-slate-700 mb-3 flex items-center gap-2">
                <span class="text-xl">📚</span> Vocabulary Words (${counts.vocabulary})
            </h4>
        `;
        container.appendChild(vocabHeader);

        vocabulary.forEach(item => {
            const div = document.createElement('div');
            div.className = 'glass-card p-4 rounded-[20px] relative cursor-pointer group hover:bg-white/90 transition-all !bg-white/50 border border-white/60';

            const date = new Date(item.first_seen).toLocaleDateString();
            const frequency = item.frequency > 1 ? `<div class="text-xs text-blue-600 mt-2 font-mono font-bold">Used ${item.frequency}x</div>` : '';

            div.innerHTML = `
                <div onclick="toggleWordMeaning(${item.id}, event)" class="cursor-pointer">
                    <div class="font-bold text-xl text-slate-800 mb-1">${item.word}</div>
                    <div class="text-xs text-slate-500 opacity-80">Added: ${date}</div>
                    ${frequency}
                    <div id="meaning-${item.id}" class="hidden mt-3 pt-3 border-t border-slate-200">
                        <div class="text-xs text-blue-500 font-bold uppercase tracking-wide mb-1">Meaning</div>
                        <div class="text-sm text-slate-700 italic" id="meaning-text-${item.id}">
                            ${item.meaning || '<span class="text-slate-400">Loading...</span>'}
                        </div>
                    </div>
                </div>
                <button onclick="deleteWord(${item.id})" class="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xl">×</button>
            `;
            container.appendChild(div);
        });
    }

    // Render journal sentence results
    if (journal_sentences.length > 0) {
        const journalHeader = document.createElement('div');
        journalHeader.className = 'col-span-full mt-6';
        journalHeader.innerHTML = `
            <h4 class="text-md font-bold text-slate-700 mb-3 flex items-center gap-2">
                <span class="text-xl">✍️</span> Journal Sentences (${counts.journal_sentences})
            </h4>
        `;
        container.appendChild(journalHeader);

        journal_sentences.forEach(item => {
            const div = document.createElement('div');
            div.className = 'glass-card p-5 rounded-[20px] hover:bg-white/90 transition-all !bg-white/70 border border-white/60 cursor-pointer group';
            div.onclick = () => viewJournalEntry(item.entry_id);

            const date = new Date(item.date).toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            const languageLabel = item.language === 'german' ?
                '<span class="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-bold">🇩🇪 German</span>' :
                '<span class="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full font-bold">🇬🇧 English</span>';

            div.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div class="text-xs text-slate-500 font-medium">${date}</div>
                    ${languageLabel}
                </div>
                <p class="text-slate-700 leading-relaxed italic group-hover:text-slate-900 transition-colors">
                    "${item.sentence}"
                </p>
                <div class="mt-3 text-xs text-blue-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to view full journal entry →
                </div>
            `;
            container.appendChild(div);
        });
    }
}

function clearSearch() {
    document.getElementById('vocab-search').value = '';
    loadVocabulary();
}

function filterVocab() {
    loadVocabulary();
}

function sortVocab() {
    loadVocabulary();
}

async function toggleWordMeaning(id, event) {
    event.stopPropagation();

    const meaningDiv = document.getElementById(`meaning-${id}`);
    const meaningText = document.getElementById(`meaning-text-${id}`);

    if (meaningDiv.classList.contains('hidden')) {
        meaningDiv.classList.remove('hidden');

        // If meaning is not loaded, fetch it
        if (meaningText.innerHTML.includes('Loading...') || meaningText.innerHTML.includes('text-slate-400')) {
            try {
                const result = await apiCall(`/vocabulary/${id}/meaning`);
                meaningText.innerHTML = result.data.meaning || '<span class="text-slate-400">No meaning available</span>';
            } catch (error) {
                console.error('Error fetching meaning:', error);
                meaningText.innerHTML = '<span class="text-red-400">Failed to load meaning</span>';
            }
        }
    } else {
        meaningDiv.classList.add('hidden');
    }
}

async function addWord() {
    const wordInput = document.getElementById('new-word-input');
    const meaningInput = document.getElementById('new-word-meaning');
    const categorySelect = document.getElementById('new-word-category');

    const word = wordInput.value.trim();
    const meaning = meaningInput.value.trim();
    const category_id = categorySelect.value;

    if (!word) {
        alert('Please enter a word!');
        return;
    }

    try {
        const payload = { word };
        if (meaning) {
            payload.meaning = meaning;
        }
        if (category_id) {
            payload.category_id = category_id;
        }

        await apiCall('/vocabulary', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        // Clear inputs
        wordInput.value = '';
        meaningInput.value = '';

        // Reload vocabulary
        await loadVocabulary();

        // Show success feedback
        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
        successMsg.innerHTML = '✓ Word added successfully!';
        document.body.appendChild(successMsg);

        setTimeout(() => successMsg.remove(), 3000);

        // Update dashboard if visible
        if (state.currentView === 'dashboard') {
            await loadDashboard();
        }
    } catch (error) {
        if (error.message.includes('already exists')) {
            alert('This word is already in your vocabulary!');
        } else {
            alert('Failed to add word: ' + error.message);
        }
    }
}

async function deleteWord(id) {
    try {
        await apiCall(`/vocabulary/${id}`, { method: 'DELETE' });
        await loadVocabulary();
        if (state.currentView === 'dashboard') {
            await loadDashboard();
        }
    } catch (error) {
        alert('Failed to delete word: ' + error.message);
    }
}

// --- VOCABULARY CATEGORIES ---
async function loadCategories() {
    try {
        const result = await apiCall('/vocabulary/categories');
        state.categories = result.data;
        renderCategories();
        updateCategorySelect();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function renderCategories() {
    const container = document.getElementById('category-list');
    if (!container) return;

    // Keep "All Words" button
    container.innerHTML = `
        <button onclick="selectCategory('all')" id="cat-all"
            class="w-full text-left px-4 py-3 rounded-xl transition-all font-medium ${state.selectedCategoryId === 'all' ? 'bg-blue-600 text-white font-bold shadow-md' : 'bg-white/50 text-slate-600 hover:bg-white hover:shadow-sm'}">
            📁 All Words
        </button>
    `;

    state.categories.forEach(cat => {
        const isActive = state.selectedCategoryId == cat.id;
        const btn = document.createElement('button');
        btn.onclick = () => selectCategory(cat.id);
        btn.id = `cat-${cat.id}`;
        btn.className = `w-full text-left px-4 py-3 rounded-xl transition-all font-medium flex justify-between items-center group ${isActive ? 'bg-blue-600 text-white font-bold shadow-md' : 'bg-white/50 text-slate-600 hover:bg-white hover:shadow-sm'}`;

        btn.innerHTML = `
            <span>📁 ${cat.name}</span>
            <span onclick="deleteCategory(event, ${cat.id})" class="opacity-0 group-hover:opacity-100 text-xs bg-red-400 hover:bg-red-500 text-white p-1 rounded-md transition-all">✕</span>
        `;
        container.appendChild(btn);
    });
}

function updateCategorySelect() {
    const select = document.getElementById('new-word-category');
    if (!select) return;

    const currentVal = select.value;
    select.innerHTML = '<option value="">No Category</option>';

    state.categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        select.appendChild(option);
    });

    select.value = currentVal;
}

function selectCategory(id) {
    state.selectedCategoryId = id;
    renderCategories();
    loadVocabulary();
}

function showAddCategoryModal() {
    const modal = document.getElementById('add-category-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('new-category-name').focus();
}

function hideAddCategoryModal() {
    const modal = document.getElementById('add-category-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.getElementById('new-category-name').value = '';
}

async function addCategory() {
    const nameInput = document.getElementById('new-category-name');
    const name = nameInput.value.trim();

    if (!name) {
        alert('Please enter a folder name!');
        return;
    }

    try {
        await apiCall('/vocabulary/categories', {
            method: 'POST',
            body: JSON.stringify({ name })
        });

        hideAddCategoryModal();
        await loadCategories();

        // Show success feedback
        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-[110] animate-fade-in';
        successMsg.innerHTML = '✓ Folder created successfully!';
        document.body.appendChild(successMsg);
        setTimeout(() => successMsg.remove(), 3000);

    } catch (error) {
        alert('Failed to add folder: ' + error.message);
    }
}

async function deleteCategory(event, id) {
    event.stopPropagation();
    if (!confirm('Are you sure you want to delete this folder? Words inside will not be deleted but will no longer have a folder.')) return;

    try {
        await apiCall(`/vocabulary/categories/${id}`, { method: 'DELETE' });

        if (state.selectedCategoryId == id) {
            state.selectedCategoryId = 'all';
        }

        await loadCategories();
        await loadVocabulary();
    } catch (error) {
        alert('Failed to delete folder: ' + error.message);
    }
}

// --- PHRASES ---
async function loadPhrases() {
    try {
        const result = await apiCall('/phrases');
        renderPhrases(result.data);
    } catch (error) {
        console.error('Error loading phrases:', error);
    }
}

function renderPhrases(phrases) {
    const container = document.getElementById('phrases-container');
    container.innerHTML = '';

    phrases.forEach((phrase, index) => {
        const div = document.createElement('div');
        div.className = 'glass-card rounded-2xl overflow-hidden cursor-pointer group hover:scale-[1.01] transition-all border-2 border-[var(--op-wood)] shadow-[4px_4px_0px_#5d3615] bg-[#fffcf0]';
        div.onclick = () => toggleTranslation(index);

        const customBadge = !phrase.builtin ? '<span class="text-[10px] bg-[var(--op-blue)] text-white px-2 py-0.5 rounded-full font-black uppercase">Pirated Copy</span>' : '';

        div.innerHTML = `
            <div class="p-8">
                <div class="flex justify-between items-start mb-4">
                    <span class="text-[10px] font-black text-[var(--op-blue)] uppercase tracking-widest op-font">English Melody</span>
                    <div class="flex gap-2 items-center">
                        ${customBadge}
                        <span class="text-[10px] text-slate-400 group-hover:text-[var(--op-red)] transition-colors font-black uppercase">Play Note</span>
                    </div>
                </div>
                <p class="text-2xl text-slate-800 font-bold leading-relaxed op-font">${phrase.english}</p>
            </div>
            <div id="phrase-de-${index}" class="bg-[var(--op-yellow)]/20 p-8 border-t-2 border-dashed border-[#5d3615] hidden">
                <div class="text-[10px] font-black text-[var(--op-red)] uppercase tracking-widest mb-2 op-font">Brook's Translation (Deutsch)</div>
                <p class="text-3xl font-black text-[#5d3615] tracking-tight op-font">${phrase.german}</p>
                <div class="mt-4 text-[10px] text-slate-500 italic">Yo-ho-ho-ho! 🎻</div>
            </div>
        `;
        container.appendChild(div);
    });
}

function toggleTranslation(index) {
    const el = document.getElementById(`phrase-de-${index}`);
    el.classList.toggle('hidden');
}

// --- NOTES (formerly MOTIVATION) ---
let editingNoteId = null;

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
                <p class="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">${note.content}</p>
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

    // Monitor online/offline status
    window.addEventListener('online', () => {
        hideOfflineWarning();
        loadDashboard();
    });

    window.addEventListener('offline', () => {
        showOfflineWarning();
    });
};