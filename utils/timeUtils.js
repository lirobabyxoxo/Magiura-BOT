function parseDuration(duration) {
  if (!duration) return 0;
  
  const timeRegex = /(\d+)([smhd])/g;
  let totalMs = 0;
  let match;
  
  while ((match = timeRegex.exec(duration)) !== null) {
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 's':
        totalMs += value * 1000;
        break;
      case 'm':
        totalMs += value * 60 * 1000;
        break;
      case 'h':
        totalMs += value * 60 * 60 * 1000;
        break;
      case 'd':
        totalMs += value * 24 * 60 * 60 * 1000;
        break;
    }
  }
  
  return totalMs;
}

function formatDuration(ms) {
  if (!ms || ms <= 0) return "0s";
  
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((ms % (60 * 1000)) / 1000);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);
  
  return parts.join(' ') || "0s";
}

function formatMarriageTime(dateString) {
  const marriageDate = new Date(dateString);
  const now = new Date();
  const diff = now - marriageDate;
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return `${days.toString().padStart(2, '0')}/${hours.toString().padStart(2, '0')}/${seconds.toString().padStart(2, '0')}`;
}

module.exports = {
  parseDuration,
  formatDuration,
  formatMarriageTime
};