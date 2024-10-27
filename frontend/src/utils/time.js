export const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

export const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) {
    return `${hours}小时${mins > 0 ? ` ${mins}分钟` : ''}${remainingSeconds > 0 ? ` ${remainingSeconds}秒` : ''}`
  }
  if (mins > 0) {
    return `${mins}分钟${remainingSeconds > 0 ? ` ${remainingSeconds}秒` : ''}`
  }
  return `${remainingSeconds}秒`
}
