(() => {
  "use strict";
  const video = document.getElementById("commercial");
  const playButton = document.getElementById("play-commercial");
  const status = document.getElementById("watch-status");
  if (!video) return;
  let returning = false;
  function returnToWebsite() {
    if (returning) return;
    returning = true;
    if (status) status.textContent = "Returning to the Popz Bowling website…";
    // A reliable destination is better than history.back(), which might
    // leave the owner at a direct movie URL or a different site.
    window.location.replace("/features/#demo");
  }
  video.addEventListener("ended", returnToWebsite);
  // Older iPad Safari may use its own fullscreen controller. Once it exits
  // at the END (not if the user stopped early), return to the website.
  video.addEventListener("webkitendfullscreen", () => {
    if (video.ended || (Number.isFinite(video.duration) && video.duration > 0 &&
        video.currentTime >= video.duration - 0.35)) {
      returnToWebsite();
    }
  });
  video.addEventListener("error", () => {
    if (status) status.textContent = "Playback is unavailable in this player. Use the full-resolution direct-video link below.";
  });
  playButton?.addEventListener("click", () => {
    const attempt = video.play();
    if (attempt?.catch) attempt.catch(() => {
      if (status) status.textContent = "Tap Play on the video's built-in controls. You can also use the direct-video link below.";
    });
  });
})();
