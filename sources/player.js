/**
 * ========================================================================
 * NATIVE M3U8 / HLS & DIRECT VIDEO PLAYER ENGINE
 * ========================================================================
 * High performance HLS.js player with custom controls, quality switcher,
 * proxy fallback for CORS bypass, keyboard shortcuts & progress tracking.
 */

window.UrnPlayer = (() => {
  let activeHls = null;
  let activeVideo = null;
  let controlsTimer = null;
  let progressInterval = null;

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const s = Math.floor(seconds);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    const secStr = secs < 10 ? '0' + secs : secs;
    if (hrs > 0) {
      const minStr = mins < 10 ? '0' + mins : mins;
      return `${hrs}:${minStr}:${secStr}`;
    }
    return `${mins}:${secStr}`;
  }

  function destroy() {
    if (activeHls) {
      try { activeHls.destroy(); } catch (e) {}
      activeHls = null;
    }
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
    if (controlsTimer) {
      clearTimeout(controlsTimer);
      controlsTimer = null;
    }
    activeVideo = null;
  }

  function mount({
    container,
    streamUrl,
    title = '',
    poster = '',
    startTime = 0,
    autoplay = true,
    onProgress = null,
    onEnded = null,
    onTimeUpdate = null
  }) {
    destroy();
    if (!container) return null;

    container.innerHTML = `
      <div class="urn-custom-player" id="urn-custom-player" tabindex="0">
        <video id="urn-video-element" class="urn-video-element" playsinline poster="${poster || ''}" preload="auto"></video>
        
        <!-- Big Center Play Button Overlay -->
        <div class="urn-player-bigplay" id="urn-bigplay">
          <i class="fa-solid fa-play"></i>
        </div>

        <!-- Buffering Spinner -->
        <div class="urn-player-spinner" id="urn-spinner" style="display:none">
          <div class="urn-spin-icon"></div>
        </div>

        <!-- Custom Controls Overlay -->
        <div class="urn-player-controls" id="urn-controls">
          <!-- Timeline / Seekbar -->
          <div class="urn-timeline-wrap" id="urn-timeline-wrap">
            <div class="urn-timeline-track">
              <div class="urn-timeline-buffered" id="urn-buffered-bar"></div>
              <div class="urn-timeline-played" id="urn-played-bar"></div>
              <div class="urn-timeline-thumb" id="urn-timeline-thumb"></div>
            </div>
            <div class="urn-timeline-tooltip" id="urn-timeline-tooltip">0:00</div>
          </div>

          <!-- Bottom Control Bar -->
          <div class="urn-controls-bottom">
            <div class="urn-controls-left">
              <button class="urn-ctrl-btn" id="urn-btn-play" title="Play/Pause (Space)"><i class="fa-solid fa-play"></i></button>
              <button class="urn-ctrl-btn" id="urn-btn-rewind" title="Rewind 10s (←)"><i class="fa-solid fa-rotate-left"></i></button>
              <button class="urn-ctrl-btn" id="urn-btn-forward" title="Forward 10s (→)"><i class="fa-solid fa-rotate-right"></i></button>
              
              <div class="urn-volume-wrap">
                <button class="urn-ctrl-btn" id="urn-btn-mute" title="Mute/Unmute (M)"><i class="fa-solid fa-volume-high"></i></button>
                <input type="range" class="urn-volume-slider" id="urn-volume-slider" min="0" max="1" step="0.05" value="1">
              </div>

              <div class="urn-time-display" id="urn-time-display">
                <span id="urn-cur-time">0:00</span> / <span id="urn-dur-time">0:00</span>
              </div>
            </div>

            <div class="urn-controls-right">
              <span class="urn-stream-badge"><i class="fa-solid fa-bolt"></i> HLS M3U8</span>

              <!-- Quality Selector Dropdown -->
              <div class="urn-menu-wrapper" id="urn-quality-wrap">
                <button class="urn-ctrl-btn urn-text-btn" id="urn-btn-quality" title="Stream Quality">
                  <span id="urn-quality-label">Auto</span>
                </button>
                <div class="urn-player-dropdown" id="urn-quality-menu" hidden></div>
              </div>

              <!-- Speed Selector Dropdown -->
              <div class="urn-menu-wrapper" id="urn-speed-wrap">
                <button class="urn-ctrl-btn urn-text-btn" id="urn-btn-speed" title="Playback Speed">
                  <span id="urn-speed-label">1.0x</span>
                </button>
                <div class="urn-player-dropdown" id="urn-speed-menu" hidden>
                  <button class="urn-menu-opt" data-speed="0.5">0.5x</button>
                  <button class="urn-menu-opt" data-speed="0.75">0.75x</button>
                  <button class="urn-menu-opt active" data-speed="1">1.0x Normal</button>
                  <button class="urn-menu-opt" data-speed="1.25">1.25x</button>
                  <button class="urn-menu-opt" data-speed="1.5">1.5x</button>
                  <button class="urn-menu-opt" data-speed="2">2.0x</button>
                </div>
              </div>

              <button class="urn-ctrl-btn" id="urn-btn-pip" title="Picture-in-Picture"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
              <button class="urn-ctrl-btn" id="urn-btn-fullscreen" title="Fullscreen (F)"><i class="fa-solid fa-expand"></i></button>
            </div>
          </div>
        </div>
      </div>
    `;

    const playerEl = document.getElementById('urn-custom-player');
    const video = document.getElementById('urn-video-element');
    const playBtn = document.getElementById('urn-btn-play');
    const bigPlay = document.getElementById('urn-bigplay');
    const spinner = document.getElementById('urn-spinner');
    const muteBtn = document.getElementById('urn-btn-mute');
    const volSlider = document.getElementById('urn-volume-slider');
    const curTimeEl = document.getElementById('urn-cur-time');
    const durTimeEl = document.getElementById('urn-dur-time');
    const playedBar = document.getElementById('urn-played-bar');
    const bufferedBar = document.getElementById('urn-buffered-bar');
    const thumb = document.getElementById('urn-timeline-thumb');
    const timelineWrap = document.getElementById('urn-timeline-wrap');
    const tooltip = document.getElementById('urn-timeline-tooltip');
    const controls = document.getElementById('urn-controls');
    const rewindBtn = document.getElementById('urn-btn-rewind');
    const fwdBtn = document.getElementById('urn-btn-forward');
    const speedWrap = document.getElementById('urn-speed-wrap');
    const speedBtn = document.getElementById('urn-btn-speed');
    const speedMenu = document.getElementById('urn-speed-menu');
    const speedLabel = document.getElementById('urn-speed-label');
    const qualityWrap = document.getElementById('urn-quality-wrap');
    const qualityBtn = document.getElementById('urn-btn-quality');
    const qualityMenu = document.getElementById('urn-quality-menu');
    const qualityLabel = document.getElementById('urn-quality-label');
    const pipBtn = document.getElementById('urn-btn-pip');
    const fsBtn = document.getElementById('urn-btn-fullscreen');

    activeVideo = video;

    function showControls() {
      if (!controls) return;
      playerEl.classList.remove('user-idle');
      if (controlsTimer) clearTimeout(controlsTimer);
      if (!video.paused) {
        controlsTimer = setTimeout(() => {
          playerEl.classList.add('user-idle');
        }, 2800);
      }
    }

    playerEl.addEventListener('mousemove', showControls);
    playerEl.addEventListener('touchstart', showControls, { passive: true });

    function togglePlay() {
      if (video.paused || video.ended) {
        video.play().catch(e => console.warn('Play interrupted:', e));
      } else {
        video.pause();
      }
    }

    playBtn.onclick = togglePlay;
    bigPlay.onclick = togglePlay;
    video.onclick = togglePlay;

    rewindBtn.onclick = () => { video.currentTime = Math.max(0, video.currentTime - 10); };
    fwdBtn.onclick = () => { video.currentTime = Math.min(video.duration || 99999, video.currentTime + 10); };

    video.addEventListener('play', () => {
      playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      bigPlay.style.display = 'none';
      showControls();
    });

    video.addEventListener('pause', () => {
      playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      bigPlay.style.display = 'flex';
      playerEl.classList.remove('user-idle');
    });

    video.addEventListener('waiting', () => { spinner.style.display = 'flex'; });
    video.addEventListener('playing', () => { spinner.style.display = 'none'; });
    video.addEventListener('canplay', () => { spinner.style.display = 'none'; });

    video.addEventListener('timeupdate', () => {
      const cur = video.currentTime;
      const dur = video.duration || 0;
      curTimeEl.textContent = formatTime(cur);
      durTimeEl.textContent = formatTime(dur);

      if (dur > 0) {
        const pct = (cur / dur) * 100;
        playedBar.style.width = pct + '%';
        thumb.style.left = pct + '%';
      }

      // Update buffered bar
      if (video.buffered && video.buffered.length > 0 && dur > 0) {
        for (let i = 0; i < video.buffered.length; i++) {
          if (video.buffered.start(i) <= cur && cur <= video.buffered.end(i)) {
            bufferedBar.style.width = ((video.buffered.end(i) / dur) * 100) + '%';
            break;
          }
        }
      }

      if (onTimeUpdate) onTimeUpdate(cur, dur);
    });

    video.addEventListener('ended', () => {
      if (onEnded) onEnded();
    });

    // Seekbar scrubbing
    let isSeeking = false;
    function handleSeek(e) {
      const rect = timelineWrap.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      if (video.duration) {
        video.currentTime = pos * video.duration;
      }
    }

    timelineWrap.addEventListener('mousedown', (e) => {
      isSeeking = true;
      handleSeek(e);
      const onMove = (mv) => { if (isSeeking) handleSeek(mv); };
      const onUp = () => {
        isSeeking = false;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });

    timelineWrap.addEventListener('mousemove', (e) => {
      const rect = timelineWrap.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const hoverTime = pos * (video.duration || 0);
      tooltip.style.left = (pos * 100) + '%';
      tooltip.textContent = formatTime(hoverTime);
    });

    // Volume & Mute
    function updateVolumeIcon() {
      if (video.muted || video.volume === 0) {
        muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
      } else if (video.volume < 0.5) {
        muteBtn.innerHTML = '<i class="fa-solid fa-volume-low"></i>';
      } else {
        muteBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
      }
    }

    muteBtn.onclick = () => {
      video.muted = !video.muted;
      volSlider.value = video.muted ? 0 : video.volume;
      updateVolumeIcon();
    };

    volSlider.addEventListener('input', () => {
      video.volume = parseFloat(volSlider.value);
      video.muted = video.volume === 0;
      updateVolumeIcon();
    });

    // Speed Menu
    speedBtn.onclick = (e) => {
      e.stopPropagation();
      speedMenu.hidden = !speedMenu.hidden;
      qualityMenu.hidden = true;
    };

    speedMenu.querySelectorAll('.urn-menu-opt').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const spd = parseFloat(btn.dataset.speed);
        video.playbackRate = spd;
        speedLabel.textContent = spd === 1 ? '1.0x' : spd + 'x';
        speedMenu.querySelectorAll('.urn-menu-opt').forEach(b => b.classList.toggle('active', b === btn));
        speedMenu.hidden = true;
      };
    });

    // Fullscreen & PiP
    function toggleFs() {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (!fsEl) {
        const req = playerEl.requestFullscreen || playerEl.webkitRequestFullscreen;
        if (req) req.call(playerEl);
      } else {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) exit.call(document);
      }
    }

    fsBtn.onclick = toggleFs;

    pipBtn.onclick = async () => {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if (document.pictureInPictureEnabled && video !== document.pictureInPictureElement) {
          await video.requestPictureInPicture();
        }
      } catch (e) {
        console.warn('PiP not available:', e);
      }
    };

    document.addEventListener('fullscreenchange', () => {
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      fsBtn.innerHTML = isFs ? '<i class="fa-solid fa-compress"></i>' : '<i class="fa-solid fa-expand"></i>';
    });

    // Close dropdowns on outside click
    document.addEventListener('click', () => {
      if (speedMenu) speedMenu.hidden = true;
      if (qualityMenu) qualityMenu.hidden = true;
    });

    // Initialize Stream Loading
    function loadHlsStream(url, isProxyRetry = false) {
      spinner.style.display = 'flex';
      
      const isM3u8 = url.includes('.m3u8') || url.includes('/m3u8-proxy');

      if (isM3u8 && window.Hls && window.Hls.isSupported()) {
        const hls = new window.Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          xhrSetup: (xhr, u) => {
            xhr.withCredentials = false;
          }
        });

        activeHls = hls;
        hls.attachMedia(video);

        hls.on(window.Hls.Events.MEDIA_ATTACHED, () => {
          hls.loadSource(url);
        });

        hls.on(window.Hls.Events.MANIFEST_PARSED, (ev, data) => {
          spinner.style.display = 'none';
          
          // Build Quality Dropdown
          if (data.levels && data.levels.length > 1) {
            qualityWrap.style.display = 'inline-flex';
            qualityMenu.innerHTML = `
              <button class="urn-menu-opt active" data-level="-1">Auto (${data.levels[0].height || 'HD'}p)</button>
              ${data.levels.map((lvl, idx) => `
                <button class="urn-menu-opt" data-level="${idx}">${lvl.height ? lvl.height + 'p' : 'Level ' + (idx + 1)} ${lvl.bitrate ? '(' + Math.round(lvl.bitrate / 1000) + 'k)' : ''}</button>
              `).join('')}
            `;

            qualityBtn.onclick = (e) => {
              e.stopPropagation();
              qualityMenu.hidden = !qualityMenu.hidden;
              speedMenu.hidden = true;
            };

            qualityMenu.querySelectorAll('.urn-menu-opt').forEach(btn => {
              btn.onclick = (e) => {
                e.stopPropagation();
                const levelIdx = parseInt(btn.dataset.level);
                hls.currentLevel = levelIdx;
                qualityLabel.textContent = levelIdx === -1 ? 'Auto' : (data.levels[levelIdx].height + 'p');
                qualityMenu.querySelectorAll('.urn-menu-opt').forEach(b => b.classList.toggle('active', b === btn));
                qualityMenu.hidden = true;
              };
            });
          } else {
            qualityWrap.style.display = 'none';
          }

          if (startTime > 0) {
            video.currentTime = startTime;
          }

          if (autoplay) {
            video.play().catch(e => {
              console.warn('Autoplay prevented:', e);
              video.muted = true;
              video.play().catch(() => {});
            });
          }
        });

        hls.on(window.Hls.Events.ERROR, (event, errData) => {
          if (errData.fatal) {
            console.warn('HLS Fatal error:', errData.type, errData.details);
            switch (errData.type) {
              case window.Hls.ErrorTypes.NETWORK_ERROR:
                if (!isProxyRetry && !url.includes('/api/m3u8-proxy')) {
                  console.log('Attempting proxy fallback for stream URL...');
                  hls.destroy();
                  const proxiedUrl = `/api/m3u8-proxy?url=${encodeURIComponent(url)}`;
                  loadHlsStream(proxiedUrl, true);
                } else {
                  hls.startLoad();
                }
                break;
              case window.Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                break;
            }
          }
        });

      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native Safari HLS
        video.src = url;
        video.addEventListener('loadedmetadata', () => {
          spinner.style.display = 'none';
          if (startTime > 0) video.currentTime = startTime;
          if (autoplay) video.play().catch(() => {});
        });
      } else {
        // Direct MP4 / WebM / Media
        video.src = url;
        video.addEventListener('loadedmetadata', () => {
          spinner.style.display = 'none';
          if (startTime > 0) video.currentTime = startTime;
          if (autoplay) video.play().catch(() => {});
        });
      }
    }

    loadHlsStream(streamUrl);

    // Save Watching Progress every 5 seconds
    if (onProgress) {
      progressInterval = setInterval(() => {
        if (video && !video.paused && video.currentTime > 0) {
          onProgress(video.currentTime, video.duration);
        }
      }, 5000);
    }

    return {
      video,
      hls: activeHls,
      destroy
    };
  }

  return {
    mount,
    destroy,
    formatTime
  };
})();
