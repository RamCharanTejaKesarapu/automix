import { Page } from 'playwright';

export interface SecurityChallengeResult {
  detected: boolean;
  type?: 'turnstile' | 'recaptcha' | 'hcaptcha' | 'cloudflare_block' | 'mfa_login' | 'unknown';
  description?: string;
}

export class SecurityDetector {
  /**
   * Evaluates whether the current page displays a CAPTCHA, Cloudflare challenge, or security block.
   */
  public static async checkForChallenge(page: Page): Promise<SecurityChallengeResult> {
    try {
      // 1. Check title and body text for direct Cloudflare / bot blocks
      const title = await page.title().catch(() => '');
      const bodyText = await page.evaluate(() => document.body ? document.body.innerText.substring(0, 2000) : '').catch(() => '');

      if (
        title.includes('Just a moment...') ||
        title.includes('Attention Required! | Cloudflare') ||
        bodyText.includes('Checking your browser before accessing') ||
        bodyText.includes('Verify you are human') ||
        bodyText.includes('Press & Hold to confirm you are a human')
      ) {
        return {
          detected: true,
          type: 'cloudflare_block',
          description: 'Cloudflare security challenge detected.'
        };
      }

      // 2. Check for Cloudflare Turnstile widget
      const turnstile = await page.$('iframe[src*="challenges.cloudflare.com"], .cf-turnstile, [data-turnstile]');
      if (turnstile) {
        const isVisible = await turnstile.isVisible().catch(() => false);
        if (isVisible) {
          return {
            detected: true,
            type: 'turnstile',
            description: 'Cloudflare Turnstile verification challenge is active.'
          };
        }
      }

      // 3. Check for Google reCAPTCHA
      const recaptcha = await page.$('iframe[src*="google.com/recaptcha"], .g-recaptcha, #recaptcha');
      if (recaptcha) {
        const isVisible = await recaptcha.isVisible().catch(() => false);
        if (isVisible) {
          return {
            detected: true,
            type: 'recaptcha',
            description: 'Google reCAPTCHA verification required.'
          };
        }
      }

      // 4. Check for hCaptcha
      const hcaptcha = await page.$('iframe[src*="hcaptcha.com"], .h-captcha');
      if (hcaptcha) {
        const isVisible = await hcaptcha.isVisible().catch(() => false);
        if (isVisible) {
          return {
            detected: true,
            type: 'hcaptcha',
            description: 'hCaptcha verification required.'
          };
        }
      }

      // 5. Check for Login / MFA barriers where an application requires authentication
      const isLoginWall = await page.evaluate(() => {
        const text = document.body ? document.body.innerText.toLowerCase() : '';
        const hasSignInHeading = /sign in to apply|log in to continue|enter two-factor code|verify your identity/i.test(text);
        const hasPasswordInput = !!document.querySelector('input[type="password"]');
        return hasSignInHeading && hasPasswordInput;
      }).catch(() => false);

      if (isLoginWall) {
        return {
          detected: true,
          type: 'mfa_login',
          description: 'Login authentication or Multi-Factor Verification required.'
        };
      }

      return { detected: false };
    } catch {
      return { detected: false };
    }
  }
}
