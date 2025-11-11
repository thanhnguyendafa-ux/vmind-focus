export const formatDuration = (totalSeconds: number): string => {
  if (totalSeconds <= 0) return '0 hours';
  if (totalSeconds < 60) return 'Less than a minute';

  const SECONDS_IN_HOUR = 3600;
  const SECONDS_IN_DAY = 86400; // 24 hours
  const SECONDS_IN_MONTH = 2592000; // 30 days
  const SECONDS_IN_YEAR = 31104000; // 360 days (12 * 30)

  let remainingSeconds = totalSeconds;

  const years = Math.floor(remainingSeconds / SECONDS_IN_YEAR);
  remainingSeconds %= SECONDS_IN_YEAR;

  const months = Math.floor(remainingSeconds / SECONDS_IN_MONTH);
  remainingSeconds %= SECONDS_IN_MONTH;

  const days = Math.floor(remainingSeconds / SECONDS_IN_DAY);
  remainingSeconds %= SECONDS_IN_DAY;

  const hours = Math.floor(remainingSeconds / SECONDS_IN_HOUR);

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  
  if (parts.length > 0) {
    return parts.join(' ');
  }

  // If less than an hour, show minutes.
  const minutes = Math.round(totalSeconds / 60);
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
};
