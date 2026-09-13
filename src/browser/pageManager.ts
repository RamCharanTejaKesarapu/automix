import { Page, ElementHandle } from 'playwright';

export class PageManager {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public getRawPage(): Page {
    return this.page;
  }

  /**
   * Broadcasts visible live action pill directly in the browser preview
   */
  public async showAction(text: string): Promise<void> {
    try {
      await this.page.evaluate((msg) => {
        if ((window as any).__automix_showAction) {
          (window as any).__automix_showAction(msg);
        }
      }, text);
    } catch {}
  }

  /**
   * Moves virtual cursor and creates click ripple
   */
  public async visualClickAt(x: number, y: number): Promise<void> {
    try {
      await this.page.evaluate(({ x, y }) => {
        if ((window as any).__automix_moveCursor) {
          (window as any).__automix_moveCursor(x, y);
        }
        if ((window as any).__automix_clickRipple) {
          (window as any).__automix_clickRipple(x, y);
        }
      }, { x, y });
    } catch {}
  }

  /**
   * Dismiss common cookie consent or modal popups that block interaction
   */
  public async dismissPopups(): Promise<void> {
    const dismissSelectors = [
      'button[id*="cookie" i]',
      'button[id*="accept" i]',
      'button[class*="cookie" i]',
      'button[class*="accept" i]',
      '#onetrust-accept-btn-handler',
      '.cookie-banner button',
      'button:has-text("Accept All")',
      'button:has-text("Accept Cookies")',
      'button:has-text("I Agree")',
      'button:has-text("Got it")',
      'button:has-text("Close")',
      '[aria-label="Close"]',
      '.modal-close'
    ];

    for (const selector of dismissSelectors) {
      try {
        const btn = await this.page.$(selector);
        if (btn && await btn.isVisible()) {
          await btn.click({ timeout: 1500 });
          await this.page.waitForTimeout(300);
          break;
        }
      } catch {
        // continue
      }
    }
  }

  /**
   * Resilient element click with auto-scroll and visual cursor animation
   */
  public async safeClick(selectorOrHandle: string | ElementHandle, label?: string): Promise<boolean> {
    await this.dismissPopups();
    try {
      let handle: ElementHandle | null = null;
      if (typeof selectorOrHandle === 'string') {
        handle = await this.page.waitForSelector(selectorOrHandle, { state: 'visible', timeout: 5000 });
      } else {
        handle = selectorOrHandle;
      }

      if (!handle) return false;
      await handle.scrollIntoViewIfNeeded().catch(() => {});

      // Calculate coordinates for visual mouse cursor and ripple
      const box = await handle.boundingBox();
      if (box) {
        const x = Math.round(box.x + box.width / 2);
        const y = Math.round(box.y + box.height / 2);
        await this.visualClickAt(x, y);
        await this.showAction(label ? `✓ ${label}` : `✓ Clicked button`);
        await this.page.waitForTimeout(100);
      }

      await handle.click({ timeout: 4000 });
      return true;
    } catch {
      // Fallback click via JS
      try {
        if (typeof selectorOrHandle === 'string') {
          await this.page.evaluate((sel) => {
            const node = document.querySelector(sel) as HTMLElement;
            if (node) node.click();
          }, selectorOrHandle);
        } else {
          await selectorOrHandle.evaluate((el: HTMLElement) => el.click());
        }
        await this.showAction(label ? `✓ ${label}` : `✓ Clicked`);
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Safe typing with realistic delay and visual feedback
   */
  public async safeType(selector: string, text: string, delay = 25): Promise<boolean> {
    try {
      const el = await this.page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
      if (!el) return false;
      await el.scrollIntoViewIfNeeded().catch(() => {});

      const box = await el.boundingBox();
      if (box) {
        await this.visualClickAt(Math.round(box.x + 20), Math.round(box.y + box.height / 2));
      }

      await el.click().catch(() => {});
      await this.showAction(`Typing: "${text.substring(0, 25)}${text.length > 25 ? '...' : ''}"`);
      await el.fill('');

      if (delay > 0 && text.length < 50) {
        await el.type(text, { delay });
      } else {
        await el.fill(text);
      }

      // Dispatch input/change events
      await el.evaluate((input: HTMLInputElement) => {
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Select dropdown value by exact or partial label
   */
  public async safeSelect(selector: string, optionTextOrValue: string): Promise<boolean> {
    try {
      const selectEl = await this.page.waitForSelector(selector, { timeout: 4000 });
      if (!selectEl) return false;

      await this.showAction(`Selected: ${optionTextOrValue}`);

      // Try selecting directly by label
      const res = await this.page.selectOption(selector, { label: optionTextOrValue }).catch(() => null);
      if (res && res.length > 0) return true;

      const res2 = await this.page.selectOption(selector, { value: optionTextOrValue }).catch(() => null);
      if (res2 && res2.length > 0) return true;

      // Scan option elements manually
      const selected = await selectEl.evaluate((select: HTMLSelectElement, targetText: string) => {
        const lower = targetText.toLowerCase();
        for (let i = 0; i < select.options.length; i++) {
          const opt = select.options[i];
          if (opt.text.toLowerCase().includes(lower) || opt.value.toLowerCase().includes(lower)) {
            select.selectedIndex = i;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
        return false;
      }, optionTextOrValue);

      return selected;
    } catch {
      return false;
    }
  }

  /**
   * Safe checkbox / radio button checker
   */
  public async safeCheck(selectorOrHandle: string | ElementHandle, shouldCheck = true): Promise<boolean> {
    try {
      if (typeof selectorOrHandle === 'string') {
        const el = await this.page.waitForSelector(selectorOrHandle, { timeout: 4000 });
        if (!el) return false;
        await el.scrollIntoViewIfNeeded().catch(() => {});
        const box = await el.boundingBox();
        if (box) {
          await this.visualClickAt(Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2));
        }
        const isChecked = await el.isChecked().catch(() => false);
        if (isChecked !== shouldCheck) {
          await el.click();
        }
      } else {
        await selectorOrHandle.scrollIntoViewIfNeeded().catch(() => {});
        await selectorOrHandle.click();
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Safe file upload injection
   */
  public async uploadFile(selector: string, filePath: string): Promise<boolean> {
    try {
      await this.showAction(`Uploading resume document...`);
      const input = await this.page.$(selector);
      if (!input) return false;
      await input.setInputFiles(filePath);
      await this.page.waitForTimeout(600);
      return true;
    } catch (err) {
      console.error(`[uploadFile] Failed: ${err}`);
      return false;
    }
  }

  /**
   * Smoothly scroll down page to trigger lazy loading with visual action indicator
   */
  public async scrollDown(distance = 700): Promise<void> {
    await this.showAction(`↓ Scrolling page...`);
    await this.page.evaluate((d) => window.scrollBy({ top: d, behavior: 'smooth' }), distance);
    await this.page.waitForTimeout(500);
  }

  public async waitQuiet(ms = 1000): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForTimeout(ms);
  }
}
