import { Page } from 'playwright';
import { PageManager } from '../browser/pageManager.js';
import { DiscoveredJob } from './jobMatcher.js';
import { applicationRepository } from '../database/applications.js';

export class JobDiscoveryEngine {
  private page: Page;
  private pageManager: PageManager;

  constructor(page: Page, pageManager: PageManager) {
    this.page = page;
    this.pageManager = pageManager;
  }

  /**
   * Opens website and performs intelligent Field + Role selection + search
   */
  public async navigateAndSearch(params: {
    websiteUrl: string;
    targetRole: string;
    targetField: string;
    targetLocation?: string;
    keywords?: string;
  }): Promise<void> {
    await this.pageManager.showAction('🌐 Opening website...');
    applicationRepository.logActivity({ action: `Opening website: ${params.websiteUrl}`, level: 'INFO' });

    await this.page.goto(params.websiteUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await this.pageManager.waitQuiet(2000);
    await this.pageManager.dismissPopups();

    applicationRepository.logActivity({ action: '✓ Website opened', level: 'SUCCESS' });
    await this.pageManager.showAction('✓ Website loaded');

    // Step 1 – try to select the TARGET FIELD via category/department/field filter
    const fieldSelected = await this.selectFilterByValue(params.targetField, [
      'select[name*="field" i]',
      'select[name*="category" i]',
      'select[name*="department" i]',
      'select[id*="field" i]',
      'select[id*="category" i]',
      'select[id*="department" i]',
      'select[aria-label*="field" i]',
      'select[aria-label*="category" i]',
      'select[aria-label*="department" i]',
    ]);

    if (fieldSelected) {
      applicationRepository.logActivity({ action: `✓ Field "${params.targetField}" selected`, level: 'SUCCESS' });
    } else {
      // Try clicking on a visible pill/tab/link that matches the field name
      await this.clickMatchingPillOrTab(params.targetField);
    }

    // Step 2 – type/select ROLE in the search input
    const query = [params.targetRole, params.keywords].filter(Boolean).join(' ');

    const roleInputSelectors = [
      'input[placeholder*="job title" i]',
      'input[placeholder*="role" i]',
      'input[placeholder*="keyword" i]',
      'input[placeholder*="search" i]',
      'input[placeholder*="position" i]',
      'input[placeholder*="job" i]',
      'input[name*="q" i]',
      'input[name*="query" i]',
      'input[name*="keyword" i]',
      'input[name*="search" i]',
      'input[id*="search" i]',
      'input[id*="keyword" i]',
      'input[type="search"]'
    ];

    let typedRole = false;
    for (const sel of roleInputSelectors) {
      const input = await this.page.$(sel);
      if (input && await input.isVisible()) {
        await this.pageManager.showAction(`Entering role: "${params.targetRole}"`);
        await input.fill(query);
        await this.page.waitForTimeout(400);
        typedRole = true;
        applicationRepository.logActivity({ action: `✓ Role "${params.targetRole}" entered in search`, level: 'SUCCESS' });
        break;
      }
    }

    // Step 3 – type LOCATION if provided
    if (params.targetLocation) {
      const locInputSelectors = [
        'input[placeholder*="location" i]',
        'input[placeholder*="city" i]',
        'input[placeholder*="where" i]',
        'input[name*="location" i]',
        'input[id*="location" i]'
      ];
      for (const sel of locInputSelectors) {
        const input = await this.page.$(sel);
        if (input && await input.isVisible()) {
          await input.fill(params.targetLocation);
          break;
        }
      }
    }

    // Step 4 – Submit the search
    const searchButtonSelectors = [
      'button[type="submit"]',
      'button:has-text("Search")',
      'button:has-text("Find Jobs")',
      'button:has-text("Search Jobs")',
      'button[aria-label*="search" i]',
      'input[type="submit"]',
      '.search-button',
      '[data-testid*="search" i]'
    ];

    let clicked = false;
    for (const btnSel of searchButtonSelectors) {
      const btn = await this.page.$(btnSel);
      if (btn && await btn.isVisible()) {
        await this.pageManager.safeClick(btnSel, 'Search submitted');
        await this.pageManager.waitQuiet(2500);
        clicked = true;
        break;
      }
    }

    // Fallback: press Enter on role input
    if (!clicked && typedRole) {
      await this.page.keyboard.press('Enter');
      await this.pageManager.waitQuiet(2500);
    }

    applicationRepository.logActivity({ action: '✓ Search completed', level: 'SUCCESS' });
    await this.pageManager.showAction('✓ Search completed — scanning results');
  }

  /**
   * Try to select a value in a <select> dropdown matching filter selectors
   */
  private async selectFilterByValue(value: string, selectors: string[]): Promise<boolean> {
    for (const sel of selectors) {
      const el = await this.page.$(sel);
      if (el && await el.isVisible()) {
        const success = await this.pageManager.safeSelect(sel, value);
        if (success) return true;
      }
    }
    return false;
  }

  /**
   * Try to click a pill, tag, tab, or link that textually matches the field/category
   */
  private async clickMatchingPillOrTab(value: string): Promise<boolean> {
    const valueLower = value.toLowerCase();
    const candidates = await this.page.$$('a, button, [role="tab"], [role="option"], li, span.tag, .filter-pill, .category-tag');
    for (const el of candidates) {
      const isVisible = await el.isVisible().catch(() => false);
      if (!isVisible) continue;
      const text = (await el.innerText().catch(() => '')).trim().toLowerCase();
      if (text === valueLower || text.includes(valueLower) || valueLower.includes(text.split(' ')[0])) {
        const box = await el.boundingBox();
        if (box) {
          await this.pageManager.safeClick(el, `Field "${value}" selected`);
          await this.page.waitForTimeout(800);
          applicationRepository.logActivity({ action: `✓ ${value} field/category selected`, level: 'SUCCESS' });
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Extracts job listings from the current results page, filtering out duplicates already in the DB
   */
  public async discoverJobListingElements(): Promise<DiscoveredJob[]> {
    await this.pageManager.scrollDown(400);
    await this.pageManager.waitQuiet(800);

    const currentUrl = this.page.url();
    const defaultCompany = await this.page.evaluate(() => {
      const title = document.title.split(/[-–|]/)[0]?.trim();
      return title || 'Company';
    });

    const rawJobs = await this.page.evaluate((fallbackCompany) => {
      const results: Array<{
        title: string; company: string; url: string; location?: string; snippet?: string;
      }> = [];
      const seenUrls = new Set<string>();

      const cardSelectors = [
        '.opening', '.posting',
        '[data-automation-id="compositeHeader"]',
        '.job_seen_beacon', '.job-search-card',
        '.jobs-list-item', 'li[class*="job" i]',
        'div[class*="job-card" i]', 'div[class*="job_card" i]',
        'div[class*="jobListing" i]', 'article', 'tr[class*="job" i]'
      ];

      for (const sel of cardSelectors) {
        const cards = document.querySelectorAll(sel);
        if (cards.length === 0) continue;
        cards.forEach(card => {
          const linkEl = card.querySelector('a[href]') as HTMLAnchorElement | null;
          if (!linkEl) return;
          const href = linkEl.href;
          if (!href || href.startsWith('javascript') || seenUrls.has(href)) return;

          const titleEl = card.querySelector('h2, h3, h4, [class*="title" i], strong') || linkEl;
          const rawTitle = titleEl.textContent?.replace(/\s+/g, ' ').trim() || '';
          const title = rawTitle.split('\n')[0].trim();

          const companyEl = card.querySelector('h3, [class*="company" i], [data-company], span.companyName, .company');
          const rawCo = companyEl?.textContent?.replace(/\s+/g, ' ').trim() || fallbackCompany;
          const company = rawCo.split(/[\n\t💰🌏🇺🇸|•]/)[0].trim() || fallbackCompany;

          const locEl = card.querySelector('[class*="location" i], [data-location], .location');
          const location = locEl?.textContent?.replace(/\s+/g, ' ').trim();

          const snippetEl = card.querySelector('p, [class*="snippet" i], [class*="summary" i], .description');
          const snippet = snippetEl?.textContent?.replace(/\s+/g, ' ').trim();

          if (title.length > 2) {
            seenUrls.add(href);
            results.push({ title, company, url: href, location, snippet });
          }
        });
        if (results.length > 0) break;
      }

      // Fallback: anchor links with job-like paths
      if (results.length === 0) {
        const anchors = Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[];
        for (const a of anchors) {
          const href = a.href;
          const text = a.textContent?.replace(/\s+/g, ' ').trim() || '';
          const isJobPath = /\/(job|jobs|position|positions|opening|openings|career|careers)\/[a-zA-Z0-9_-]+/i.test(href)
            || /gh_jid=\d+/i.test(href) || /\?id=\d+/i.test(href);
          if (isJobPath && text.length > 3 && !seenUrls.has(href)) {
            if (!/^(all jobs|back|view all|careers home|home|sign in)$/i.test(text)) {
              seenUrls.add(href);
              results.push({ title: text.replace(/\n+/g, ' ').trim(), company: fallbackCompany, url: href });
            }
          }
        }
      }
      return results;
    }, defaultCompany);

    const jobs: DiscoveredJob[] = [];
    for (const raw of rawJobs) {
      if (!raw.url || raw.url === currentUrl) continue;
      const isDupe = applicationRepository.isDuplicate(raw.url, raw.company, raw.title);
      if (!isDupe) {
        jobs.push({
          id: `job_${Math.random().toString(36).substring(2, 9)}`,
          title: raw.title,
          company: raw.company,
          url: raw.url,
          location: raw.location,
          snippet: raw.snippet
        });
      }
    }

    return jobs;
  }

  /**
   * Scrolls or paginates to load more jobs
   */
  public async loadMoreListings(): Promise<boolean> {
    const prevCount = await this.page.evaluate(() => document.querySelectorAll('a[href]').length);

    await this.pageManager.scrollDown(1100);
    await this.page.waitForTimeout(1200);

    const nextSelectors = [
      'button:has-text("Load More")',
      'button:has-text("Show More")',
      'a:has-text("Next")',
      'a[aria-label="Next"]',
      'button[aria-label="Next"]',
      '.pagination-next a',
      '[data-testid="pagination-next"]'
    ];

    for (const sel of nextSelectors) {
      const btn = await this.page.$(sel);
      if (btn && await btn.isVisible()) {
        await this.pageManager.safeClick(btn, 'Loading more jobs');
        await this.pageManager.waitQuiet(2000);
        return true;
      }
    }

    const newCount = await this.page.evaluate(() => document.querySelectorAll('a[href]').length);
    return newCount > prevCount;
  }
}
