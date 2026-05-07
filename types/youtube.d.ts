// YouTube IFrame Player API global tip tanımları

declare namespace YT {
  interface PlayerVars {
    autoplay?: 0 | 1
    loop?: 0 | 1
    controls?: 0 | 1 | 2
    mute?: 0 | 1
    playlist?: string
    modestbranding?: 0 | 1
    rel?: 0 | 1
    showinfo?: 0 | 1
    iv_load_policy?: 1 | 3
    disablekb?: 0 | 1
    fs?: 0 | 1
    playsinline?: 0 | 1
    vq?: string
  }

  interface PlayerOptions {
    videoId?: string
    width?: number | string
    height?: number | string
    playerVars?: PlayerVars
    events?: {
      onReady?: (event: PlayerEvent) => void
      onStateChange?: (event: OnStateChangeEvent) => void
      onError?: (event: PlayerEvent) => void
      onPlaybackQualityChange?: (event: OnPlaybackQualityChangeEvent) => void
    }
  }

  interface PlayerEvent {
    target: Player
  }

  interface OnStateChangeEvent {
    target: Player
    data: number
  }

  interface OnPlaybackQualityChangeEvent {
    target: Player
    data: string
  }

  class Player {
    constructor(elementId: string | HTMLElement, options: PlayerOptions)
    playVideo(): void
    pauseVideo(): void
    stopVideo(): void
    mute(): void
    unMute(): void
    setVolume(volume: number): void
    isMuted(): boolean
    getVolume(): number
    destroy(): void
    getPlayerState(): number
    setPlaybackQuality(suggestedQuality: string): void
    getPlaybackQuality(): string
    getAvailableQualityLevels(): string[]
  }
}

interface Window {
  YT: typeof YT
  onYouTubeIframeAPIReady: (() => void) | undefined
}
