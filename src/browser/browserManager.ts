import { chromium, Browser, BrowserContext, Page, CDPSession } from 'playwright';

export interface BrowserOptions {
  headless?: boolean;
  viewport?: { width: number; height: number };
  userAgent?: string;
  onScreenshot?: (base64Data: string) => void;
}

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private activePage: Page | null = null;
  private cdpSession: CDPSession | null = null;
  private isHeadless: boolean = false;
  private onScreenshotCallback?: (base64Data: string) => void;
  private screencastInterval: NodeJS.Timeout | null = null;

  constructor(options: BrowserOptions = {}) {
    this.isHeadless = options.headless ?? (process.env.HEADLESS === 'true');
    this.onScreenshotCallback = options.onScreenshot;
  }

  public setScreenshotCallback(cb: (base64Data: string) => void) {
    this.onScreenshotCallback = cb;
  }

  public async init(headless?: boolean): Promise<Page> {
    if (headless !== undefined) {
      this.isHeadless = headless;
    }

    if (this.browser && this.activePage) {
      return this.activePage;
    }

    const launchArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--window-position=0,0',
      '--ignore-certifcate-errors',
      '--ignore-certifcate-errors-spki-list',
      '--disable-blink-features=AutomationControlled'
    ];

    try {
      this.browser = await chromium.launch({
        headless: this.isHeadless,
        args: launchArgs
      });
    } catch (err: any) {
      console.warn(`[BrowserManager] Failed default launch, attempting fallback with system chrome: ${err.message}`);
      this.browser = await chromium.launch({
        headless: this.isHeadless,
        channel: 'chrome',
        args: launchArgs
      });
    }

    this.context = await this.browser.newContext({
      viewport: { width: 1366, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'America/New_York',
      permissions: ['geolocation']
    });

    // Anti-bot stealth + Visual Cursor & Action Badge overlay injection
    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

      // Visual Cursor and Live Action Badge
      function initVisualOverlays() {
        if (document.getElementById('automix-cursor')) return;

        // Visual Cursor Dot
        const cursor = document.createElement('div');
        cursor.id = 'automix-cursor';
        cursor.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 20px;
          height: 20px;
          background: radial-gradient(circle, #06b6d4 35%, rgba(6, 182, 212, 0.4) 70%, transparent 100%);
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 14px #06b6d4, 0 0 5px #ffffff;
          pointer-events: none;
          z-index: 2147483647;
          transform: translate(-50%, -50%);
          transition: top 0.12s cubic-bezier(0.2, 0, 0.2, 1), left 0.12s cubic-bezier(0.2, 0, 0.2, 1);
          display: none;
        `;

        // Live Action Status Pill in bottom right of browser viewport
        const badge = document.createElement('div');
        badge.id = 'automix-badge';
        badge.style.cssText = `
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: rgba(8, 12, 22, 0.92);
          border: 1px solid rgba(6, 182, 212, 0.7);
          box-shadow: 0 4px 25px rgba(0, 0, 0, 0.7), 0 0 15px rgba(6, 182, 212, 0.4);
          backdrop-filter: blur(12px);
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 18px;
          border-radius: 20px;
          pointer-events: none;
          z-index: 2147483647;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: opacity 0.2s ease, transform 0.2s ease;
          opacity: 0;
          transform: translateY(10px);
        `;
        badge.innerHTML = '<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#06b6d4;box-shadow:0 0 10px #06b6d4;"></span><span id="automix-badge-text">AutoMix Active</span>';

        // Global helper for cursor position & click ripple
        (window as any).__automix_moveCursor = (x: number, y: number) => {
          cursor.style.display = 'block';
          cursor.style.left = `${x}px`;
          cursor.style.top = `${y}px`;
        };

        (window as any).__automix_clickRipple = (x: number, y: number) => {
          const ripple = document.createElement('div');
          ripple.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            border: 2px solid #06b6d4;
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
            pointer-events: none;
            z-index: 2147483646;
            transition: transform 0.4s ease-out, opacity 0.4s ease-out;
          `;
          document.body.appendChild(ripple);
          requestAnimationFrame(() => {
            ripple.style.transform = 'translate(-50%, -50%) scale(5)';
            ripple.style.opacity = '0';
          });
          setTimeout(() => ripple.remove(), 450);
        };

        (window as any).__automix_showAction = (text: string) => {
          const textEl = document.getElementById('automix-badge-text');
          if (textEl) textEl.textContent = text;
          badge.style.opacity = '1';
          badge.style.transform = 'translateY(0)';
        };

        if (document.body) {
          document.body.appendChild(cursor);
          document.body.appendChild(badge);
        }
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initVisualOverlays);
      } else {
        initVisualOverlays();
      }
    });

    this.activePage = await this.context.newPage();
    this.activePage.setDefaultTimeout(25000);
    this.activePage.setDefaultNavigationTimeout(35000);

    await this.startHighFramerateScreencast();

    return this.activePage;
  }

  public getPage(): Page {
    if (!this.activePage) {
      throw new Error('Browser is not initialized. Call init() first.');
    }
    return this.activePage;
  }

  public getContext(): BrowserContext {
    if (!this.context) {
      throw new Error('Browser context not initialized.');
    }
    return this.context;
  }

  public async captureScreenshot(): Promise<string> {
    if (!this.activePage || this.activePage.isClosed()) return '';
    try {
      const buffer = await this.activePage.screenshot({
        type: 'jpeg',
        quality: 65
      });
      return buffer.toString('base64');
    } catch {
      return '';
    }
  }

  /**
   * Native Chrome DevTools Protocol (CDP) Screencast for 20+ FPS real-time streaming
   */
  private async startHighFramerateScreencast() {
    if (!this.activePage || !this.context) return;

    try {
      this.cdpSession = await this.context.newCDPSession(this.activePage);
      await this.cdpSession.send('Page.startScreencast', {
        format: 'jpeg',
        quality: 70,
        everyNthFrame: 1
      });

      this.cdpSession.on('Page.screencastFrame', async (payload: { data: string; sessionId: number }) => {
        if (this.onScreenshotCallback && payload.data) {
          this.onScreenshotCallback(payload.data);
        }
        if (this.cdpSession) {
          await this.cdpSession.send('Page.screencastFrameAck', { sessionId: payload.sessionId }).catch(() => {});
        }
      });
      console.log('[BrowserManager] High-framerate CDP Screencast active');
    } catch (err: any) {
      console.warn(`[BrowserManager] CDP screencast fallback to interval: ${err.message}`);
      this.startIntervalFallback();
    }

    // Safety fallback in case CDP session resets during navigation
    this.startIntervalFallback();
  }

  private startIntervalFallback() {
    if (this.screencastInterval) clearInterval(this.screencastInterval);
    this.screencastInterval = setInterval(async () => {
      if (!this.activePage || this.activePage.isClosed()) return;
      if (this.onScreenshotCallback) {
        try {
          const base64 = await this.captureScreenshot();
          if (base64) {
            this.onScreenshotCallback(base64);
          }
        } catch {}
      }
    }, 800);
  }

  public async close(): Promise<void> {
    if (this.screencastInterval) {
      clearInterval(this.screencastInterval);
      this.screencastInterval = null;
    }
    if (this.cdpSession) {
      await this.cdpSession.detach().catch(() => {});
      this.cdpSession = null;
    }
    if (this.activePage && !this.activePage.isClosed()) {
      await this.activePage.close().catch(() => {});
      this.activePage = null;
    }
    if (this.context) {
      await this.context.close().catch(() => {});
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }
}

export const globalBrowserManager = new BrowserManager();
