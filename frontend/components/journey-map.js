/**
 * Journey Map Component
 * 30-Day gamified learning journey map with One Piece/nautical theme
 */

class JourneyMap {
  constructor(containerId, apiBase) {
    this.container = document.getElementById(containerId);
    this.apiBase = apiBase;
    this.journeyData = null;
    this.landmarks = null;
    this.achievements = null;
    this.updateInterval = null;
  }

  /**
   * Initialize the journey map - fetch data and render
   */
  async init() {
    try {
      await this.fetchJourneyData();
      this.render();
      this.startAutoRefresh();
    } catch (error) {
      console.error('Error initializing journey map:', error);
      this.renderError();
    }
  }

  /**
   * Fetch journey status from API
   */
  async fetchJourneyData() {
    try {
      const statusResponse = await fetch(`${this.apiBase}/journey/status`);
      const statusData = await statusResponse.json();
      
      if (!statusData.success) {
        throw new Error('Failed to fetch journey status');
      }
      
      this.journeyData = statusData.data;

      // Fetch landmarks
      const landmarksResponse = await fetch(`${this.apiBase}/journey/landmarks`);
      const landmarksData = await landmarksResponse.json();
      this.landmarks = landmarksData.success ? landmarksData.data : [];

      // Fetch achievements
      const achievementsResponse = await fetch(`${this.apiBase}/journey/achievements`);
      const achievementsData = await achievementsResponse.json();
      this.achievements = achievementsData.success ? achievementsData.data : { unlocked: [], locked: [] };
      
      return this.journeyData;
    } catch (error) {
      console.error('Error fetching journey data:', error);
      throw error;
    }
  }

  /**
   * Render the complete journey map
   */
  render() {
    if (!this.container) return;

    this.container.innerHTML = '';
    this.container.className = 'journey-map-container';

    // Create header
    const header = this.createHeader();
    this.container.appendChild(header);

    // Create main journey path
    const journeyPath = this.createJourneyPath();
    this.container.appendChild(journeyPath);

    // Create stats footer
    const statsFooter = this.createStatsFooter();
    this.container.appendChild(statsFooter);
  }

  /**
   * Create journey map header
   */
  createHeader() {
    const header = document.createElement('div');
    header.className = 'journey-header';
    
    const currentDay = this.journeyData.current_day;
    const percentage = this.journeyData.percentage;
    
    header.innerHTML = `
      <div class="journey-header-content">
        <h3 class="journey-title compass-accent op-font">
          <span class="journey-icon">🗺️</span>
          30-Day Grand Line Journey
        </h3>
        <div class="journey-day-badge">
          Day <span class="journey-day-number">${currentDay}</span> of 30
        </div>
      </div>
      <div class="journey-progress-bar-container">
        <div class="journey-progress-bar">
          <div class="journey-progress-fill" style="width: ${percentage}%">
            <span class="journey-progress-text">${percentage}%</span>
          </div>
        </div>
        <div class="journey-progress-label">
          ${this.journeyData.total_completed} / 30 Days Completed
        </div>
      </div>
    `;
    
    return header;
  }

  /**
   * Create the main journey path with waypoints
   */
  createJourneyPath() {
    const pathContainer = document.createElement('div');
    pathContainer.className = 'journey-path-container';
    
    // Create the winding path SVG background
    const pathSvg = this.createPathSvg();
    pathContainer.appendChild(pathSvg);
    
    // Create waypoints layer
    const waypointsLayer = document.createElement('div');
    waypointsLayer.className = 'journey-waypoints';
    
    // Generate 30 waypoints
    for (let day = 1; day <= 30; day++) {
      const waypoint = this.createWaypoint(day);
      waypointsLayer.appendChild(waypoint);
    }
    
    pathContainer.appendChild(waypointsLayer);
    
    // Add player avatar
    const avatar = this.createAvatar();
    pathContainer.appendChild(avatar);
    
    return pathContainer;
  }

  /**
   * Create SVG path background
   */
  createPathSvg() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'journey-path-svg');
    svg.setAttribute('viewBox', '0 0 1200 400');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    
    // Create winding path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const pathData = this.generateWindingPath();
    path.setAttribute('d', pathData);
    path.setAttribute('class', 'journey-path-line');
    
    svg.appendChild(path);
    return svg;
  }

  /**
   * Generate winding path data for SVG
   */
  generateWindingPath() {
    // Create a winding treasure map style path
    const points = [];
    const segments = 6;
    const width = 1200;
    const height = 400;
    
    for (let i = 0; i <= segments; i++) {
      const x = (width / segments) * i;
      const y = height / 2 + Math.sin(i * 0.8) * 80 + (i % 2 === 0 ? 40 : -40);
      points.push({ x, y });
    }
    
    let pathData = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1];
      const currPoint = points[i];
      const cp1x = prevPoint.x + (currPoint.x - prevPoint.x) / 3;
      const cp1y = prevPoint.y;
      const cp2x = prevPoint.x + 2 * (currPoint.x - prevPoint.x) / 3;
      const cp2y = currPoint.y;
      pathData += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${currPoint.x} ${currPoint.y}`;
    }
    
    return pathData;
  }

  /**
   * Create a single waypoint marker
   */
  createWaypoint(day) {
    const waypoint = document.createElement('div');
    waypoint.className = 'journey-waypoint';
    waypoint.dataset.day = day;
    
    const completedDays = this.journeyData.completed_days || [];
    const currentDay = this.journeyData.current_day;
    const isCompleted = completedDays.includes(day);
    const isCurrent = day === currentDay;
    const isLandmark = [7, 14, 21, 30].includes(day);
    
    // Determine state
    let state = 'upcoming';
    if (isCompleted) state = 'completed';
    else if (isCurrent) state = 'current';
    
    waypoint.classList.add(`waypoint-${state}`);
    if (isLandmark) waypoint.classList.add('waypoint-landmark');
    
    // Position waypoint along path
    const position = this.calculateWaypointPosition(day);
    waypoint.style.left = `${position.x}%`;
    waypoint.style.top = `${position.y}%`;
    
    // Create waypoint content
    const icon = this.getWaypointIcon(day, state, isLandmark);
    const landmarkInfo = isLandmark ? this.getLandmarkInfo(day) : null;
    
    waypoint.innerHTML = `
      <div class="waypoint-marker">
        <div class="waypoint-icon">${icon}</div>
        <div class="waypoint-day">${day}</div>
      </div>
      ${landmarkInfo ? `<div class="waypoint-landmark-label">${landmarkInfo.name}</div>` : ''}
    `;
    
    // Add tooltip
    this.addWaypointTooltip(waypoint, day, state, isLandmark);
    
    // Add click handler
    if (isCurrent) {
      waypoint.style.cursor = 'pointer';
      waypoint.addEventListener('click', () => this.handleWaypointClick(day));
    }
    
    return waypoint;
  }

  /**
   * Calculate waypoint position along the path
   */
  calculateWaypointPosition(day) {
    // Distribute waypoints along a winding path
    const totalDays = 30;
    const progress = (day - 1) / (totalDays - 1);
    
    // Create a winding effect
    const rows = 3;
    const waypointsPerRow = Math.ceil(totalDays / rows);
    const row = Math.floor((day - 1) / waypointsPerRow);
    const col = (day - 1) % waypointsPerRow;
    const colsInRow = Math.min(waypointsPerRow, totalDays - row * waypointsPerRow);
    
    // Alternate row direction for winding effect
    const isReverse = row % 2 === 1;
    const actualCol = isReverse ? (colsInRow - 1 - col) : col;
    
    const x = 10 + (actualCol / (colsInRow - 1 || 1)) * 80; // 10-90% range
    const y = 20 + row * 30 + Math.sin(actualCol * 0.5) * 8; // Add wave effect
    
    return { x, y };
  }

  /**
   * Get icon for waypoint based on state and type
   */
  getWaypointIcon(day, state, isLandmark) {
    if (isLandmark) {
      const landmarkIcons = {
        7: '⚓',
        14: '🏝️',
        21: '⚔️',
        30: '💎'
      };
      return landmarkIcons[day] || '🏴‍☠️';
    }
    
    if (state === 'completed') return '✓';
    if (state === 'current') return '🚢';
    return day;
  }

  /**
   * Get landmark information
   */
  getLandmarkInfo(day) {
    const landmarkMap = {
      7: { name: 'Grammar Fort', icon: '⚓' },
      14: { name: 'Vocab Island', icon: '🏝️' },
      21: { name: 'Quiz Bridge', icon: '⚔️' },
      30: { name: 'Treasure Island', icon: '💎' }
    };
    return landmarkMap[day] || null;
  }

  /**
   * Add tooltip to waypoint
   */
  addWaypointTooltip(waypoint, day, state, isLandmark) {
    const tooltip = document.createElement('div');
    tooltip.className = 'waypoint-tooltip';
    
    let tooltipContent = `<strong>Day ${day}</strong><br>`;
    
    if (state === 'completed') {
      tooltipContent += `<span class="tooltip-status completed">✓ Completed</span>`;
    } else if (state === 'current') {
      const activity = this.journeyData.today_activity || {};
      tooltipContent += `<span class="tooltip-status current">📍 Current Position</span><br>`;
      tooltipContent += `⏱️ ${activity.minutes_practiced || 0} mins<br>`;
      tooltipContent += `✍️ ${activity.journal_entries_count || 0} entries<br>`;
      tooltipContent += `📚 ${activity.vocabulary_added_count || 0} words`;
    } else {
      tooltipContent += `<span class="tooltip-status upcoming">🔒 Locked</span>`;
    }
    
    if (isLandmark) {
      const landmarkInfo = this.getLandmarkInfo(day);
      tooltipContent += `<br><span class="tooltip-landmark">🗺️ ${landmarkInfo.name}</span>`;
    }
    
    tooltip.innerHTML = tooltipContent;
    waypoint.appendChild(tooltip);
    
    // Show/hide on hover
    waypoint.addEventListener('mouseenter', () => {
      tooltip.classList.add('visible');
    });
    waypoint.addEventListener('mouseleave', () => {
      tooltip.classList.remove('visible');
    });
  }

  /**
   * Create player avatar
   */
  createAvatar() {
    const avatar = document.createElement('div');
    avatar.className = 'journey-avatar';
    avatar.id = 'journey-avatar';
    
    const currentDay = this.journeyData.current_day;
    const position = this.calculateWaypointPosition(currentDay);
    
    avatar.style.left = `${position.x}%`;
    avatar.style.top = `${position.y}%`;
    
    avatar.innerHTML = `
      <div class="avatar-ship">
        <img src="assets/straw_hat_icon.png" alt="Ship" />
      </div>
    `;
    
    return avatar;
  }

  /**
   * Create stats footer
   */
  createStatsFooter() {
    // Stats footer removed - no longer displaying the four stat blocks
    const footer = document.createElement('div');
    footer.className = 'journey-stats-footer';
    footer.style.display = 'none';
    return footer;
  }

  /**
   * Handle waypoint click (mark day as complete)
   */
  async handleWaypointClick(day) {
    if (day !== this.journeyData.current_day) return;
    
    // Check if all daily tasks are completed
    try {
      const tasksResponse = await fetch(`${this.apiBase}/daily-tasks/progress`);
      const tasksData = await tasksResponse.json();
      
      if (tasksData.success && !tasksData.data.all_completed) {
        this.showNotification('⚡ Complete all 6 daily tasks before advancing to the next day!', 'warning');
        return;
      }
    } catch (error) {
      console.error('Error checking daily tasks:', error);
      // Continue with old logic if daily tasks check fails
    }
    
    const activity = this.journeyData.today_activity || {};
    const canComplete = activity.minutes_practiced >= 10 ||
                        activity.journal_entries_count >= 1 ||
                        activity.vocabulary_added_count >= 5;
    
    if (!canComplete) {
      this.showNotification('⏱️ Complete 10+ minutes of practice or 1 journal entry to finish today!', 'warning');
      return;
    }
    
    if (!confirm(`Complete Day ${day}? This will advance your journey to the next day.`)) {
      return;
    }
    
    try {
      const response = await fetch(`${this.apiBase}/journey/complete-day`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          minutes_practiced: activity.minutes_practiced,
          journal_entries: activity.journal_entries_count,
          vocabulary_added: activity.vocabulary_added_count
        })
      });
      
      const result = await response.json();
      
      if (result.success && result.day_completed) {
        this.showCelebration(day, result);
        await this.refresh();
      } else {
        this.showNotification(result.message || 'Could not complete day', 'error');
      }
    } catch (error) {
      console.error('Error completing day:', error);
      this.showNotification('Failed to complete day', 'error');
    }
  }

  /**
   * Show celebration animation
   */
  showCelebration(day, result) {
    const isMilestone = result.milestone_reached;
    const achievements = result.achievements_unlocked || [];
    
    if (isMilestone && achievements.length > 0) {
      this.showMilestoneCelebration(day, achievements);
    } else {
      this.showDayCompleteCelebration(day);
    }
  }

  /**
   * Show day complete celebration
   */
  showDayCompleteCelebration(day) {
    this.showNotification(`🎉 Day ${day} Complete! Keep sailing!`, 'success');
    this.createConfetti();
  }

  /**
   * Show milestone celebration
   */
  showMilestoneCelebration(day, achievements) {
    const modal = document.createElement('div');
    modal.className = 'journey-celebration-modal';
    
    const achievementsList = achievements.map(ach => 
      `<div class="achievement-item">
        <span class="achievement-icon">${ach.icon_emoji}</span>
        <div>
          <div class="achievement-title">${ach.title}</div>
          <div class="achievement-desc">${ach.description}</div>
        </div>
      </div>`
    ).join('');
    
    modal.innerHTML = `
      <div class="celebration-content">
        <div class="celebration-header">
          <h2>🎊 Milestone Reached! 🎊</h2>
          <h3>Day ${day} Complete</h3>
        </div>
        <div class="celebration-body">
          <div class="achievements-unlocked">
            <h4>Achievements Unlocked:</h4>
            ${achievementsList}
          </div>
        </div>
        <button class="celebration-close" onclick="this.closest('.journey-celebration-modal').remove()">
          Continue Journey
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.createFireworks();
  }

  /**
   * Create confetti effect
   */
  createConfetti() {
    const colors = ['#FFD700', '#FFA500', '#FF6347', '#4169E1', '#32CD32'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = Math.random() * 3 + 's';
      document.body.appendChild(confetti);
      
      setTimeout(() => confetti.remove(), 4000);
    }
  }

  /**
   * Create fireworks effect
   */
  createFireworks() {
    const fireworksContainer = document.createElement('div');
    fireworksContainer.className = 'fireworks-container';
    
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const firework = document.createElement('div');
        firework.className = 'firework';
        firework.style.left = (20 + Math.random() * 60) + '%';
        firework.style.top = (20 + Math.random() * 40) + '%';
        fireworksContainer.appendChild(firework);
        
        setTimeout(() => firework.remove(), 1500);
      }, i * 300);
    }
    
    document.body.appendChild(fireworksContainer);
    setTimeout(() => fireworksContainer.remove(), 3000);
  }

  /**
   * Show notification toast
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `journey-notification journey-notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('visible'), 10);
    setTimeout(() => {
      notification.classList.remove('visible');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Refresh journey data and re-render
   */
  async refresh() {
    try {
      await this.fetchJourneyData();
      this.render();
    } catch (error) {
      console.error('Error refreshing journey map:', error);
    }
  }

  /**
   * Start auto-refresh interval
   */
  startAutoRefresh() {
    // Refresh every 30 seconds to update today's activity
    this.updateInterval = setInterval(() => {
      this.refresh();
    }, 30000);
  }

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Render error state
   */
  renderError() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="journey-error">
        <div class="error-icon">⚠️</div>
        <h3>Unable to load journey map</h3>
        <p>Please check your connection and try again.</p>
        <button onclick="window.journeyMap.init()" class="retry-button">Retry</button>
      </div>
    `;
  }

  /**
   * Destroy component and cleanup
   */
  destroy() {
    this.stopAutoRefresh();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
  module.exports = JourneyMap;
}