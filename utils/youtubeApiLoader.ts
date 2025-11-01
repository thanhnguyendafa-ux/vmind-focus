
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

export const loadYouTubeAPI = (): Promise<void> => {
  if (apiPromise) {
    return apiPromise;
  }

  apiPromise = new Promise((resolve) => {
    // If the API is already loaded (e.g., from a previous navigation), resolve immediately.
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }

    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";

    window.onYouTubeIframeAPIReady = () => {
      resolve();
    };

    const firstScriptTag = document.getElementsByTagName('script')[0];
    if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } else {
        document.head.appendChild(tag);
    }
  });

  return apiPromise;
};
