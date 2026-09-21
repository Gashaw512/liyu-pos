"use client";

import { useEffect, useState } from "react";
import {
  Download,
  ExternalLink,
  Smartphone,
  X,
} from "lucide-react";

/**
 * Chrome / Edge / Android install prompt event.
 *
 * This API is not included in the standard Event typings,
 * so we define the supported shape locally instead of using `any`.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;

  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

const DISMISS_STORAGE_KEY =
  "liyu:pwa-install-dismissed";

const DISMISS_DURATION_MS =
  7 * 24 * 60 * 60 * 1000;

/**
 * Detect whether Liyu is already running as an installed PWA.
 */
function isRunningStandalone(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const displayModeStandalone =
    window.matchMedia(
      "(display-mode: standalone)",
    ).matches;

  const displayModeWindowControls =
    window.matchMedia(
      "(display-mode: window-controls-overlay)",
    ).matches;

  /**
   * Safari iOS exposes `navigator.standalone`
   * instead of the standard display-mode media query.
   */
  const safariStandalone =
    (
      window.navigator as Navigator & {
        standalone?: boolean;
      }
    ).standalone === true;

  return (
    displayModeStandalone ||
    displayModeWindowControls ||
    safariStandalone
  );
}

/**
 * Detect Apple mobile devices where the
 * beforeinstallprompt API is unavailable.
 */
function isIOSDevice(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return /iPhone|iPad|iPod/i.test(
    window.navigator.userAgent,
  );
}

/**
 * Check whether the user recently dismissed
 * the installation suggestion.
 */
function wasRecentlyDismissed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const stored =
      window.localStorage.getItem(
        DISMISS_STORAGE_KEY,
      );

    if (!stored) {
      return false;
    }

    const dismissedAt = Number(stored);

    if (!Number.isFinite(dismissedAt)) {
      window.localStorage.removeItem(
        DISMISS_STORAGE_KEY,
      );

      return false;
    }

    const elapsed =
      Date.now() - dismissedAt;

    if (elapsed >= DISMISS_DURATION_MS) {
      window.localStorage.removeItem(
        DISMISS_STORAGE_KEY,
      );

      return false;
    }

    return true;
  } catch {
    /**
     * localStorage can be unavailable in
     * private browsing / restricted environments.
     *
     * In that case, simply allow the prompt.
     */
    return false;
  }
}

/**
 * Remember that the user dismissed the prompt.
 */
function rememberDismissal(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      DISMISS_STORAGE_KEY,
      String(Date.now()),
    );
  } catch {
    // Storage failure should never break the app.
  }
}

/**
 * Remove the stored dismissal.
 *
 * Useful after a successful installation.
 */
function clearDismissal(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(
      DISMISS_STORAGE_KEY,
    );
  } catch {
    // Ignore storage failures.
  }
}

export default function PWAInstallPrompt() {
  const [
    deferredPrompt,
    setDeferredPrompt,
  ] =
    useState<BeforeInstallPromptEvent | null>(
      null,
    );

  const [
    isVisible,
    setIsVisible,
  ] = useState(false);

  const [
    isIOS,
    setIsIOS,
  ] = useState(false);

  const [
    isInstalling,
    setIsInstalling,
  ] = useState(false);

  /**
   * Listen for the browser's installation opportunity.
   */
  useEffect(() => {
    if (isRunningStandalone()) {
      return;
    }

    if (wasRecentlyDismissed()) {
      return;
    }

    const iosDevice = isIOSDevice();

    setIsIOS(iosDevice);

    /**
     * Chromium-based browsers:
     * Chrome, Edge, Android browsers, etc.
     */
    const handleBeforeInstallPrompt = (
      event: Event,
    ) => {
      event.preventDefault();

      const installEvent =
        event as BeforeInstallPromptEvent;

      setDeferredPrompt(installEvent);
      setIsVisible(true);
    };

    /**
     * Fired after the browser successfully
     * installs the PWA.
     */
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsVisible(false);
      setIsInstalling(false);

      clearDismissal();

      console.info(
        "[PWA] Liyu POS installed successfully.",
      );
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt,
    );

    window.addEventListener(
      "appinstalled",
      handleAppInstalled,
    );

    /**
     * iOS Safari doesn't expose
     * beforeinstallprompt.
     *
     * Give the user a small delay before
     * showing installation instructions.
     */
    let iosTimer: number | undefined;

    if (iosDevice) {
      iosTimer = window.setTimeout(() => {
        setIsVisible(true);
      }, 1800);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );

      window.removeEventListener(
        "appinstalled",
        handleAppInstalled,
      );

      if (iosTimer !== undefined) {
        window.clearTimeout(iosTimer);
      }
    };
  }, []);

  /**
   * Install Liyu using the browser's native
   * installation prompt.
   */
  const handleInstall = async () => {
    if (!deferredPrompt || isInstalling) {
      return;
    }

    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();

      const choice =
        await deferredPrompt.userChoice;

      if (choice.outcome === "accepted") {
        console.info(
          "[PWA] User accepted Liyu POS installation.",
        );

        clearDismissal();
        setIsVisible(false);
      } else {
        console.info(
          "[PWA] User dismissed Liyu POS installation.",
        );

        rememberDismissal();
        setIsVisible(false);
      }
    } catch (error) {
      console.error(
        "[PWA] Installation prompt failed:",
        error,
      );
    } finally {
      setDeferredPrompt(null);
      setIsInstalling(false);
    }
  };

  /**
   * User explicitly chooses "Maybe later".
   */
  const handleDismiss = () => {
    rememberDismissal();

    setIsVisible(false);
    setDeferredPrompt(null);
  };

  /**
   * Don't render:
   *
   * - while already installed
   * - when browser hasn't offered installation
   * - when user dismissed recently
   */
  if (!isVisible) {
    return null;
  }

  return (
    <aside
      aria-label="Install Liyu POS"
      className="
        fixed
        inset-x-4
        bottom-4
        z-[100]
        sm:left-auto
        sm:right-5
        sm:w-full
        sm:max-w-sm
      "
    >
      <div
        className="
          relative
          overflow-hidden
          rounded-2xl
          border
          border-coffee-700/10
          bg-white
          shadow-elevated
        "
      >
        {/* Brand accent */}
        <div
          aria-hidden="true"
          className="h-1 bg-berbere-500"
        />

        <div className="p-4 sm:p-5">
          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss install suggestion"
            className="
              absolute
              right-3
              top-3
              inline-flex
              h-8
              w-8
              items-center
              justify-center
              rounded-lg
              text-coffee-400
              transition
              hover:bg-cream-100
              hover:text-coffee-700
              focus:outline-none
              focus:ring-2
              focus:ring-berbere-500/30
            "
          >
            <X
              aria-hidden="true"
              className="h-4 w-4"
            />
          </button>

          {/* Header */}
          <div className="flex items-start gap-3 pr-8">
            <div
              aria-hidden="true"
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-berbere-500
                text-white
              "
            >
              <Smartphone className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-bold text-coffee-700">
                Install Liyu POS
              </h2>

              <p className="mt-1 text-xs leading-5 text-coffee-500">
                Keep Liyu POS on your device for
                faster access to your business.
              </p>
            </div>
          </div>

          {/* iOS instructions */}
          {isIOS ? (
            <div
              className="
                mt-4
                rounded-xl
                border
                border-cream-200
                bg-cream-100
                p-3
              "
            >
              <p className="text-xs leading-5 text-coffee-600">
                To install Liyu POS on your
                iPhone or iPad:
              </p>

              <ol className="mt-2 space-y-2 text-xs text-coffee-600">
                <li className="flex gap-2">
                  <span
                    className="
                      flex
                      h-5
                      w-5
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-berbere-500
                      text-[10px]
                      font-bold
                      text-white
                    "
                  >
                    1
                  </span>

                  <span>
                    Tap the{" "}
                    <span className="font-bold text-coffee-700">
                      Share
                    </span>{" "}
                    button in Safari.
                  </span>
                </li>

                <li className="flex gap-2">
                  <span
                    className="
                      flex
                      h-5
                      w-5
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-berbere-500
                      text-[10px]
                      font-bold
                      text-white
                    "
                  >
                    2
                  </span>

                  <span>
                    Choose{" "}
                    <span className="font-bold text-coffee-700">
                      Add to Home Screen
                    </span>
                    .
                  </span>
                </li>

                <li className="flex gap-2">
                  <span
                    className="
                      flex
                      h-5
                      w-5
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-berbere-500
                      text-[10px]
                      font-bold
                      text-white
                    "
                  >
                    3
                  </span>

                  <span>
                    Open Liyu POS from your Home
                    Screen like an app.
                  </span>
                </li>
              </ol>

              <div className="mt-3 flex items-center gap-2 text-[11px] text-coffee-400">
                <ExternalLink
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0"
                />

                <span>
                  Installation is handled by Safari.
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop / Android install */}
              <button
                type="button"
                onClick={handleInstall}
                disabled={
                  isInstalling ||
                  !deferredPrompt
                }
                className="
                  mt-4
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-berbere-500
                  px-4
                  py-2.5
                  text-sm
                  font-bold
                  text-white
                  transition
                  hover:bg-berbere-600
                  active:scale-[0.99]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                  focus:outline-none
                  focus:ring-2
                  focus:ring-berbere-500/30
                  focus:ring-offset-2
                "
              >
                <Download
                  aria-hidden="true"
                  className="h-4 w-4"
                />

                {isInstalling
                  ? "Installing..."
                  : "Install Liyu POS"}
              </button>

              <p className="mt-2 text-center text-[11px] text-coffee-400">
                The browser will ask you to confirm
                the installation.
              </p>
            </>
          )}

          {/* Dismiss */}
          <button
            type="button"
            onClick={handleDismiss}
            className="
              mt-2
              w-full
              rounded-lg
              px-3
              py-2
              text-xs
              font-semibold
              text-coffee-400
              transition
              hover:bg-cream-100
              hover:text-coffee-700
              focus:outline-none
              focus:ring-2
              focus:ring-berbere-500/20
            "
          >
            Maybe later
          </button>
        </div>
      </div>
    </aside>
  );
}