import { test, expect, Page } from '@playwright/test';

// Step order (index): 0 name, 1 resume, 2 linkedin, 3 coverletter, 4 career,
// 5 puzzle, 6 impact, 7 trivia, 8 perspective, 9 details, 10 results.

const UPLOAD_URL = 'https://fake.com/upload';

// Helper: mock the storage upload endpoints so the resume uploads on pick.
async function mockUploads(page: Page, opts: { fail?: boolean } = {}) {
  await page.route('**/api/uploads/request-url', async (route) => {
    if (opts.fail) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ uploadURL: UPLOAD_URL, objectPath: '/uploads/test.pdf' }),
    });
  });
  await page.route(UPLOAD_URL, async (route) => {
    await route.fulfill({ status: 200 });
  });
}

// Helper: capture the submit payload and answer with success.
async function mockSubmit(page: Page): Promise<() => any> {
  let captured: any = null;
  await page.route('**/api/onboarding-form', async (route) => {
    captured = JSON.parse(route.request().postData() || '{}');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'OK' }),
    });
  });
  return () => captured;
}

// Helper: navigate through steps 0-3 quickly
async function passSetupSteps(page: Page, opts: { skipCoverLetter?: boolean; noLinkedIn?: boolean } = {}) {
  // Step 0: Name
  await page.fill('input[placeholder="Enter your first name"]', 'E2E Tester');
  await page.click('button:has-text("Continue")');

  // Step 1: Resume
  const resumeInput = page.locator('input[type="file"][accept=".pdf,.doc,.docx"]').first();
  await resumeInput.setInputFiles({
    name: 'resume.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('fake pdf'),
  });
  await page.waitForTimeout(3000);
  await page.click('button:has-text("Continue")');

  // Step 2: LinkedIn
  if (opts.noLinkedIn) {
    await page.click('label[for="no-linkedin"]');
  } else {
    await page.fill('input[placeholder="https://linkedin.com/in/yourprofile"]', 'https://linkedin.com/in/e2etester');
  }
  await page.click('button:has-text("Continue")');

  // Step 3: Cover Letter
  if (!opts.skipCoverLetter) {
    const coverInput = page.locator('input[type="file"][accept=".pdf,.doc,.docx"]').first();
    await coverInput.setInputFiles({
      name: 'cover.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake cover letter'),
    });
    await page.waitForTimeout(4500);
  }
  await page.click('button:has-text("Continue")');
}

// Helper: fill the career step (step 4)
async function fillCareer(page: Page, roles = 'Role A, Role B, Role C', choice = 'Career choice answer') {
  await page.fill('textarea[placeholder*="Senior Product Manager"]', roles);
  await page.fill('textarea[placeholder="How you found your path..."]', choice);
}

// Helper: fill the details step (step 9)
async function fillDetails(page: Page) {
  await page.fill('input[placeholder="100000"]', '125000');
  await page.fill('input[placeholder="Street address"]', '123 Main St');
  await page.fill('input[placeholder="Apt, suite, unit (optional)"]', 'Apt 4B');
  await page.fill('input[placeholder="City"]', 'Austin');
  await page.selectOption('select[aria-label="State"]', 'TX');
  await page.fill('input[placeholder="ZIP code"]', '78701');
  await page.fill('input[placeholder="(555) 123-4567"]', '(555) 987-6543');
}

// Helper: fill all open-ended questions on steps 4-9 (puzzle skipped, trivia skipped)
async function fillAllQuestions(page: Page) {
  // Step 4: career (2 questions)
  await fillCareer(page);
  await page.click('button:has-text("Continue")');

  // Step 5: Skip puzzle
  await page.click('button:has-text("Continue")');

  // Step 6: impact (2 questions)
  await page.fill('textarea[placeholder="Your key contributions per role..."]', 'Impact per role answer');
  await page.fill('textarea[placeholder="This is the most important question"]', 'Metrics answer');
  await page.click('button:has-text("Continue")');

  // Step 7: Skip trivia
  await page.click('button:has-text("Skip Trivia")');
  await page.waitForTimeout(2000);

  // Step 8: perspective (2 questions)
  await page.fill('textarea[placeholder="A proud moment that never made the resume..."]', 'Accomplishment answer');
  await page.fill('textarea[placeholder="Your hobbies, side projects, interests..."]', 'Hobbies answer');
  await page.click('button:has-text("Continue")');

  // Step 9: details
  await fillDetails(page);
  await page.click('button:has-text("Continue")');
}

// Helper: skip from step 4 (career) through step 9 (details) to results with nothing filled
async function skipToResults(page: Page) {
  await page.click('button:has-text("Continue")'); // 4 -> 5 (puzzle)
  await page.click('button:has-text("Continue")'); // 5 -> 6 (impact)
  await page.click('button:has-text("Continue")'); // 6 -> 7 (trivia)
  await page.click('button:has-text("Skip Trivia")');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("Continue")'); // 8 -> 9 (details)
  await page.click('button:has-text("Continue")'); // 9 -> 10 (results)
}

// Helper: pick up a puzzle piece once. Pointer down on a tray piece counts as a pickup.
async function pickUpOnePiece(page: Page) {
  const piece = page.locator('[aria-roledescription="draggable"]').first();
  await piece.waitFor({ state: 'visible' });
  await piece.scrollIntoViewIfNeeded();
  await piece.dispatchEvent('pointerdown');
}

async function readScore(page: Page): Promise<number> {
  const scoreText = await page.locator('.text-7xl').textContent();
  return parseInt(scoreText!.replace(/,/g, ''));
}

test.describe('Onboarding Questionnaire Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/questions1');
    await page.waitForSelector('text=Who are you?', { timeout: 10000 });
  });

  // ─────────────────────────────────────────────
  // STEP ORDER AND LAYOUT
  // ─────────────────────────────────────────────

  test('Session I badge is gone and step order follows the Hub', async ({ page }) => {
    await expect(page.locator('text=Session I')).toHaveCount(0);
    await passSetupSteps(page, { skipCoverLetter: true });

    await expect(page.locator('h2:has-text("Career Narrative")')).toBeVisible();
    await expect(page.locator('text=Your story, your strengths')).toBeVisible();
    await expect(page.locator('text=your people')).toHaveCount(0);
    await expect(page.locator('text=And which role are you the most qualified for?')).toBeVisible();
    await page.click('button:has-text("Continue")');

    await expect(page.locator('text=Can you make the blocks fit?')).toBeVisible();
    await page.click('button:has-text("Continue")');

    await expect(page.locator('h2:has-text("Your Impact")')).toBeVisible();
    await expect(page.locator('p:has-text("This is the most important question")')).toBeVisible();
    await page.click('button:has-text("Continue")');

    await expect(page.locator('h2:has-text("Trivia")')).toBeVisible();
    await page.click('button:has-text("Skip Trivia")');
    await page.waitForTimeout(2000);

    await expect(page.locator('h2:has-text("Perspective")')).toBeVisible();
    await page.click('button:has-text("Continue")');

    await expect(page.locator('h2:has-text("Last step, almost done")')).toBeVisible();
    await expect(page.locator('text=We will discuss this more on our first call, just a ballpark.')).toBeVisible();
    await expect(page.locator('select[aria-label="State"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Country"]')).toHaveValue('United States');
    await page.click('button:has-text("Continue")');

    await expect(page.locator('h2:has-text("Your Score")')).toBeVisible();
  });

  test('footer is pinned on parts 1-9 and in flow on the details step', async ({ page }) => {
    const footer = page.locator('button:has-text("Continue")').locator('xpath=ancestor::div[contains(@class,"border-t")][1]');
    await expect(footer).toHaveClass(/fixed/);

    await passSetupSteps(page, { skipCoverLetter: true });
    await page.click('button:has-text("Continue")'); // 4 -> 5
    await page.click('button:has-text("Continue")'); // 5 -> 6
    await page.click('button:has-text("Continue")'); // 6 -> 7
    await page.click('button:has-text("Skip Trivia")');
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Continue")'); // 8 -> 9
    await expect(page.locator('h2:has-text("Last step, almost done")')).toBeVisible();
    await expect(footer).not.toHaveClass(/fixed/);
  });

  // ─────────────────────────────────────────────
  // DATA PERSISTENCE
  // ─────────────────────────────────────────────

  test('answers persist when navigating back and forth through all steps', async ({ page }) => {
    await passSetupSteps(page, { skipCoverLetter: true });

    // Step 4: fill answers, continue, then go back
    await fillCareer(page, 'CTO, VP Eng, Director', 'Fell into coding');
    await page.click('button:has-text("Continue")');
    await expect(page.locator('text=Can you make the blocks fit?')).toBeVisible();

    // Back to step 4
    await page.click('button:has-text("Back")');
    await expect(page.locator('textarea[placeholder*="Senior Product Manager"]')).toHaveValue('CTO, VP Eng, Director');
    await expect(page.locator('textarea[placeholder="How you found your path..."]')).toHaveValue('Fell into coding');

    // Go back further to step 3, then step 2
    await page.click('button:has-text("Back")');
    await expect(page.locator('text=Do you have a cover letter?')).toBeVisible();
    await page.click('button:has-text("Back")');
    await expect(page.locator('input[placeholder="https://linkedin.com/in/yourprofile"]')).toHaveValue('https://linkedin.com/in/e2etester');

    // Go back to name
    await page.click('button:has-text("Back")');
    await page.click('button:has-text("Back")');
    await expect(page.locator('input[placeholder="Enter your first name"]')).toHaveValue('E2E Tester');

    // Now go forward all the way, answers should still be there
    await page.click('button:has-text("Continue")'); // to step 1
    await page.click('button:has-text("Continue")'); // to step 2
    await page.click('button:has-text("Continue")'); // to step 3
    await page.click('button:has-text("Continue")'); // to step 4
    await expect(page.locator('textarea[placeholder*="Senior Product Manager"]')).toHaveValue('CTO, VP Eng, Director');
    await expect(page.locator('textarea[placeholder="How you found your path..."]')).toHaveValue('Fell into coding');
  });

  test('answers persist through late-stage back navigation (results -> impact -> results)', async ({ page }) => {
    await passSetupSteps(page, { skipCoverLetter: true });
    await fillAllQuestions(page);

    // Now on step 10 (Results). Go back to step 9 (details).
    await page.click('button:has-text("Back")');
    await expect(page.locator('input[placeholder="100000"]')).toHaveValue('125000');
    await expect(page.locator('input[placeholder="Street address"]')).toHaveValue('123 Main St');
    await expect(page.locator('select[aria-label="State"]')).toHaveValue('TX');
    await expect(page.locator('input[placeholder="(555) 123-4567"]')).toHaveValue('(555) 987-6543');

    // Back to step 8 (perspective)
    await page.click('button:has-text("Back")');
    await expect(page.locator('textarea[placeholder="A proud moment that never made the resume..."]')).toHaveValue('Accomplishment answer');

    // Back through trivia to step 6 (impact)
    await page.click('button:has-text("Back")'); // step 7 (trivia)
    await page.click('button:has-text("Back")'); // step 6
    await expect(page.locator('textarea[placeholder="Your key contributions per role..."]')).toHaveValue('Impact per role answer');
    await expect(page.locator('textarea[placeholder="This is the most important question"]')).toHaveValue('Metrics answer');

    // Forward to results again
    await page.click('button:has-text("Continue")'); // step 7
    await page.click('button:has-text("Continue")'); // step 8
    await page.click('button:has-text("Continue")'); // step 9
    await page.click('button:has-text("Continue")'); // step 10

    await expect(page.locator('h2:has-text("Your Score")')).toBeVisible();
  });

  // ─────────────────────────────────────────────
  // SUBMISSION PAYLOAD VERIFICATION
  // ─────────────────────────────────────────────

  test('submit sends correct payload with the new answer keys', async ({ page }) => {
    await mockUploads(page);
    const getPayload = await mockSubmit(page);

    await passSetupSteps(page);
    await fillAllQuestions(page);

    await page.waitForTimeout(3000); // let score animate
    await page.click('button:has-text("Submit")');
    await page.waitForTimeout(2000);

    const capturedPayload = getPayload();
    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload.name).toBe('E2E Tester');
    expect(capturedPayload.linkedIn).toBe('https://linkedin.com/in/e2etester');
    expect(capturedPayload.resumePath).toBe('/uploads/test.pdf');
    expect(capturedPayload.coverLetterPath).toBe('/uploads/test.pdf');

    const answers = capturedPayload.answers;
    expect(answers.targetRoles).toBe('Role A, Role B, Role C');
    expect(answers.careerChoice).toBe('Career choice answer');
    expect(answers.impactPerRole).toBe('Impact per role answer');
    expect(answers.impactMetrics).toBe('Metrics answer');
    expect(answers.unlistedAccomplishment).toBe('Accomplishment answer');
    expect(answers.hobbiesSideProjects).toBe('Hobbies answer');
    expect(answers.minSalary).toBe('125000');
    expect(answers.addressStreet).toBe('123 Main St');
    expect(answers.addressApt).toBe('Apt 4B');
    expect(answers.addressCity).toBe('Austin');
    expect(answers.addressState).toBe('TX');
    expect(answers.addressZip).toBe('78701');
    expect(answers.addressCountry).toBe('United States');
    expect(answers.phone).toBe('(555) 987-6543');

    // Removed keys are gone; no email is collected on the CRM form
    for (const key of ['bestJob', 'mentors', 'beyondJobDescription', 'colleaguesComeToYouFor', 'careerHistory', 'principlesQuotes', 'bookOrMovie', 'sabbatical', 'anythingElse', 'email', 'hubClientId']) {
      expect(answers).not.toHaveProperty(key);
    }

    // File names included
    expect(answers.resumeFileName).toBe('resume.pdf');
    expect(answers.coverLetterFileName).toBe('cover.pdf');

    // name(100) + resume(100) + linkedin(100) + cover(100) + career(200) + impact(200) + perspective(200) + details(300) = 1300
    expect(capturedPayload.totalPoints).toBe(1300);
    expect(capturedPayload.tier).toBe('Operator Status');
  });

  test('resume uploads on file pick and submit reuses the path', async ({ page }) => {
    let requestUrlCalls = 0;
    await page.route('**/api/uploads/request-url', async (route) => {
      requestUrlCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ uploadURL: UPLOAD_URL, objectPath: `/uploads/pick-${requestUrlCalls}.pdf` }),
      });
    });
    await page.route(UPLOAD_URL, async (route) => {
      await route.fulfill({ status: 200 });
    });
    const getPayload = await mockSubmit(page);

    await page.fill('input[placeholder="Enter your first name"]', 'Picker');
    await page.click('button:has-text("Continue")');

    const resumeInput = page.locator('input[type="file"][accept=".pdf,.doc,.docx"]').first();
    await resumeInput.setInputFiles({
      name: 'resume.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake pdf'),
    });
    await page.waitForTimeout(3000);
    // Upload already happened on pick, before Continue
    expect(requestUrlCalls).toBe(1);
    await page.click('button:has-text("Continue")');

    await page.click('label[for="no-linkedin"]');
    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Continue")'); // cover letter -> career
    await skipToResults(page);

    await page.waitForTimeout(3000);
    await page.click('button:has-text("Submit")');
    await page.waitForTimeout(2000);

    // No second upload at submit, and the pick-time path is what gets sent
    expect(requestUrlCalls).toBe(1);
    expect(getPayload().resumePath).toBe('/uploads/pick-1.pdf');
  });

  test('submit falls back to uploading the resume when the pick-time upload failed', async ({ page }) => {
    let requestUrlCalls = 0;
    await page.route('**/api/uploads/request-url', async (route) => {
      requestUrlCalls += 1;
      if (requestUrlCalls === 1) {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'boom' }) });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ uploadURL: UPLOAD_URL, objectPath: '/uploads/fallback.pdf' }),
      });
    });
    await page.route(UPLOAD_URL, async (route) => {
      await route.fulfill({ status: 200 });
    });
    const getPayload = await mockSubmit(page);

    await passSetupSteps(page, { noLinkedIn: true, skipCoverLetter: true });
    await skipToResults(page);

    await page.waitForTimeout(3000);
    await page.click('button:has-text("Submit")');
    await page.waitForTimeout(2000);

    expect(requestUrlCalls).toBe(2);
    expect(getPayload().resumePath).toBe('/uploads/fallback.pdf');
  });

  test('submit with N/A LinkedIn sends null linkedIn', async ({ page }) => {
    await mockUploads(page);
    const getPayload = await mockSubmit(page);

    await passSetupSteps(page, { noLinkedIn: true, skipCoverLetter: true });
    await fillAllQuestions(page);

    await page.waitForTimeout(3000);
    await page.click('button:has-text("Submit")');
    await page.waitForTimeout(2000);

    const capturedPayload = getPayload();
    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload.linkedIn).toBeNull();
  });

  // ─────────────────────────────────────────────
  // PUZZLE "NO" BUTTON
  // ─────────────────────────────────────────────

  test('puzzle No button appears after one pickup', async ({ page }) => {
    await passSetupSteps(page, { skipCoverLetter: true });
    await page.click('button:has-text("Continue")'); // career -> puzzle
    await expect(page.locator('text=Can you make the blocks fit?')).toBeVisible();
    await expect(page.locator('h2 button:has-text("No")')).toHaveCount(0);

    await pickUpOnePiece(page);
    await expect(page.locator('h2 button:has-text("No")')).toBeVisible({ timeout: 5000 });

    await page.click('h2 button:has-text("No")');
    await expect(page.locator('text=Correct, it is impossible')).toBeVisible();
  });

  test('puzzle No button appears after 15 seconds without touching a piece', async ({ page }) => {
    await passSetupSteps(page, { skipCoverLetter: true });
    await page.click('button:has-text("Continue")'); // career -> puzzle
    await expect(page.locator('text=Can you make the blocks fit?')).toBeVisible();

    await page.waitForTimeout(12000);
    await expect(page.locator('h2 button:has-text("No")')).toHaveCount(0);
    await expect(page.locator('h2 button:has-text("No")')).toBeVisible({ timeout: 6000 });
  });

  // ─────────────────────────────────────────────
  // SCORING EDGE CASES
  // ─────────────────────────────────────────────

  test('NPC tier, rush through with nothing filled', async ({ page }) => {
    await page.fill('input[placeholder="Enter your first name"]', 'Rusher');
    await page.click('button:has-text("Continue")');

    // Resume is required, upload minimal
    const resumeInput = page.locator('input[type="file"][accept=".pdf,.doc,.docx"]').first();
    await resumeInput.setInputFiles({
      name: 'r.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('x'),
    });
    await page.waitForTimeout(3000);
    await page.click('button:has-text("Continue")');

    // LinkedIn: N/A (0 points for linkedin)
    await page.click('label[for="no-linkedin"]');
    await page.click('button:has-text("Continue")');

    // Skip cover letter
    await page.click('button:has-text("Continue")');

    await skipToResults(page);

    // Total: name(100) + resume(100) = 200. That's NPC.
    await page.waitForTimeout(3000);
    await expect(page.locator('text=NPC Status')).toBeVisible();
    await expect(page.locator('text=Did you even try?')).toBeVisible();
  });

  test('points are NOT double-awarded when navigating back and forward', async ({ page }) => {
    await passSetupSteps(page, { skipCoverLetter: true });

    // Step 4: fill both questions (+200)
    await fillCareer(page);
    await page.click('button:has-text("Continue")');

    // Now at step 5. Go back to step 4 and forward again, no second award.
    await page.click('button:has-text("Back")');
    await page.click('button:has-text("Continue")');

    // Skip to results quickly
    await page.click('button:has-text("Continue")'); // 5 -> 6
    await page.click('button:has-text("Continue")'); // 6 -> 7
    await page.click('button:has-text("Skip Trivia")');
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Continue")'); // 8 -> 9
    await page.click('button:has-text("Continue")'); // 9 -> 10

    await page.waitForTimeout(3000);

    // name(100) + resume(100) + linkedin(100) + career(200) = 500, not 700
    expect(await readScore(page)).toBe(500);
  });

  test('easter egg on step 1 adds exactly 50 points', async ({ page }) => {
    await page.fill('input[placeholder="Enter your first name"]', 'Egg Hunter');
    await page.click('button:has-text("Continue")');

    const pointSpan = page.locator('span', { hasText: 'point' }).first();
    await pointSpan.click();

    const resumeInput = page.locator('input[type="file"][accept=".pdf,.doc,.docx"]').first();
    await resumeInput.setInputFiles({
      name: 'r.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('x'),
    });
    await page.waitForTimeout(3000);
    await page.click('button:has-text("Continue")');

    await page.click('label[for="no-linkedin"]');
    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Continue")'); // cover letter -> career
    await skipToResults(page);

    await page.waitForTimeout(3000);
    // name(100) + easter egg(50) + resume(100) = 250
    expect(await readScore(page)).toBe(250);
  });

  test('easter egg cannot be claimed twice', async ({ page }) => {
    await page.fill('input[placeholder="Enter your first name"]', 'Double Egg');
    await page.click('button:has-text("Continue")');

    const pointSpan = page.locator('span', { hasText: 'point' }).first();
    await pointSpan.click();
    await page.waitForTimeout(200);
    await pointSpan.click();

    const resumeInput = page.locator('input[type="file"][accept=".pdf,.doc,.docx"]').first();
    await resumeInput.setInputFiles({
      name: 'r.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('x'),
    });
    await page.waitForTimeout(3000);
    await page.click('button:has-text("Continue")');

    await page.click('label[for="no-linkedin"]');
    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Continue")'); // cover letter -> career
    await skipToResults(page);

    await page.waitForTimeout(3000);
    expect(await readScore(page)).toBe(250);
  });

  test('partial career step, only 1 of 2 questions filled scores 100 not 200', async ({ page }) => {
    await passSetupSteps(page, { skipCoverLetter: true });

    await page.fill('textarea[placeholder*="Senior Product Manager"]', 'Only roles');
    await skipToResults(page);

    await page.waitForTimeout(3000);
    // name(100) + resume(100) + linkedin(100) + career(100) = 400
    expect(await readScore(page)).toBe(400);
  });

  test('details step awards points only for filled fields, up to 300', async ({ page }) => {
    await passSetupSteps(page, { noLinkedIn: true, skipCoverLetter: true });
    await page.click('button:has-text("Continue")'); // 4 -> 5
    await page.click('button:has-text("Continue")'); // 5 -> 6
    await page.click('button:has-text("Continue")'); // 6 -> 7
    await page.click('button:has-text("Skip Trivia")');
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Continue")'); // 8 -> 9

    // Salary strips non-digits
    await page.fill('input[placeholder="100000"]', '$120,000');
    await expect(page.locator('input[placeholder="100000"]')).toHaveValue('120000');
    // Phone filled, address incomplete (no ZIP) so address earns nothing
    await page.fill('input[placeholder="(555) 123-4567"]', '5551234567');
    await page.fill('input[placeholder="Street address"]', '1 Infinite Loop');
    await page.fill('input[placeholder="City"]', 'Cupertino');
    await page.selectOption('select[aria-label="State"]', 'CA');
    await page.click('button:has-text("Continue")');

    await page.waitForTimeout(3000);
    // name(100) + resume(100) + salary(100) + phone(100) = 400
    expect(await readScore(page)).toBe(400);
  });

  // ─────────────────────────────────────────────
  // TIER BOUNDARIES
  // ─────────────────────────────────────────────

  test('tier boundary: 1300 = Operator, not Gamer', async ({ page }) => {
    // name(100) + resume(100) + linkedin(100) + cover(100) + 6 questions(600) + details(300) = 1300
    await passSetupSteps(page);
    await fillAllQuestions(page);

    await page.waitForTimeout(3000);
    await expect(page.locator('text=Operator Status')).toBeVisible();
    await expect(page.locator('text=Solid answers all around')).toBeVisible();
  });

  test('tier boundary: 1550 = Gamer Status (> 1500)', async ({ page }) => {
    await passSetupSteps(page);

    await fillCareer(page);
    await page.click('button:has-text("Continue")');

    // Puzzle: one pickup, then No (+250)
    await pickUpOnePiece(page);
    await page.click('h2 button:has-text("No")');
    await page.click('button:has-text("Continue")');

    await page.fill('textarea[placeholder="Your key contributions per role..."]', 'Answer');
    await page.fill('textarea[placeholder="This is the most important question"]', 'Answer');
    await page.click('button:has-text("Continue")');

    await page.click('button:has-text("Skip Trivia")');
    await page.waitForTimeout(2000);

    await page.fill('textarea[placeholder="A proud moment that never made the resume..."]', 'Answer');
    await page.fill('textarea[placeholder="Your hobbies, side projects, interests..."]', 'Answer');
    await page.click('button:has-text("Continue")');

    await fillDetails(page);
    await page.click('button:has-text("Continue")');

    await page.waitForTimeout(3000);
    // 1300 + 250 = 1550
    expect(await readScore(page)).toBe(1550);
    await expect(page.locator('text=Gamer Status')).toBeVisible();
    await expect(page.locator('text=Love the effort on the extras')).toBeVisible();
  });

  test('tier boundary: everything reachable = 2200 = Main Character, highest possible line reads 2,400', async ({ page }) => {
    await page.fill('input[placeholder="Enter your first name"]', 'Max');
    await page.click('button:has-text("Continue")');

    await page.locator('span', { hasText: 'point' }).first().click(); // +50
    const resumeInput = page.locator('input[type="file"][accept=".pdf,.doc,.docx"]').first();
    await resumeInput.setInputFiles({ name: 'resume.pdf', mimeType: 'application/pdf', buffer: Buffer.from('fake pdf') });
    await page.waitForTimeout(3000);
    await page.click('button:has-text("Continue")');

    await page.fill('input[placeholder="https://linkedin.com/in/yourprofile"]', 'https://linkedin.com/in/max');
    await page.click('button:has-text("Continue")');

    const coverInput = page.locator('input[type="file"][accept=".pdf,.doc,.docx"]').first();
    await coverInput.setInputFiles({ name: 'cover.pdf', mimeType: 'application/pdf', buffer: Buffer.from('fake cover') });
    await page.waitForTimeout(4500);
    await page.click('button:has-text("Continue")');

    await fillCareer(page);
    await page.click('button:has-text("Continue")');

    await pickUpOnePiece(page);
    await page.click('h2 button:has-text("No")');
    await page.click('button:has-text("Continue")');

    await page.fill('textarea[placeholder="Your key contributions per role..."]', 'Answer');
    await page.fill('textarea[placeholder="This is the most important question"]', 'Answer');
    await page.click('button:has-text("Continue")');

    // Trivia: full 600
    await page.click('button:has-text("Sandpaper")'); // +100
    await page.click('button:has-text("Wilson Wye")');
    await page.click('button:has-text("Wilson Wye")');
    await page.click('button:has-text("Wilson Wye")'); // +200
    await page.click('button:has-text("Quality")'); // +100
    await page.locator('label span', { hasText: /^4$/ }).click(); // +100
    await page.click('button:has-text("Fruits")');
    await page.click('button:has-text("Berries")'); // +100
    await page.waitForTimeout(500);
    await page.click('button:has-text("Continue")');

    await page.fill('textarea[placeholder="A proud moment that never made the resume..."]', 'Answer');
    await page.fill('textarea[placeholder="Your hobbies, side projects, interests..."]', 'Answer');
    await page.click('button:has-text("Continue")');

    await fillDetails(page);
    await page.click('button:has-text("Continue")');

    await page.waitForTimeout(3500);
    // 100 + 50 + 100 + 100 + 100 + 200 + 250 + 200 + 600 + 200 + 300 = 2200
    expect(await readScore(page)).toBe(2200);
    await expect(page.locator('text=Main Character')).toBeVisible();
    await expect(page.locator('text=The highest possible was 2,400.')).toBeVisible();
  });

  // ─────────────────────────────────────────────
  // BREAKING THE FLOW, EDGE CASES
  // ─────────────────────────────────────────────

  test('cannot proceed past step 0 without name', async ({ page }) => {
    const continueBtn = page.locator('button:has-text("Continue")');
    await expect(continueBtn).toBeDisabled();
    await expect(page.locator('text=Who are you?')).toBeVisible();
  });

  test('cannot proceed past step 1 without resume', async ({ page }) => {
    await page.fill('input[placeholder="Enter your first name"]', 'Test');
    await page.click('button:has-text("Continue")');

    const continueBtn = page.locator('button:has-text("Continue")');
    await expect(continueBtn).toBeDisabled();
    await expect(page.locator('text=Current Resume')).toBeVisible();
  });

  test('cannot proceed past step 2 without LinkedIn or N/A', async ({ page }) => {
    await page.fill('input[placeholder="Enter your first name"]', 'Test');
    await page.click('button:has-text("Continue")');

    const resumeInput = page.locator('input[type="file"][accept=".pdf,.doc,.docx"]').first();
    await resumeInput.setInputFiles({
      name: 'r.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('x'),
    });
    await page.waitForTimeout(3000);
    await page.click('button:has-text("Continue")');

    const continueBtn = page.locator('button:has-text("Continue")');
    await expect(continueBtn).toBeDisabled();
    await expect(page.locator('text=Where can we find you online?')).toBeVisible();
  });

  test('LinkedIn N/A checkbox disables input and allows proceed', async ({ page }) => {
    await page.fill('input[placeholder="Enter your first name"]', 'Test');
    await page.click('button:has-text("Continue")');

    const resumeInput = page.locator('input[type="file"][accept=".pdf,.doc,.docx"]').first();
    await resumeInput.setInputFiles({
      name: 'r.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('x'),
    });
    await page.waitForTimeout(3000);
    await page.click('button:has-text("Continue")');

    await page.click('label[for="no-linkedin"]');
    await expect(page.locator('input[placeholder="https://linkedin.com/in/yourprofile"]')).toBeDisabled();
    await page.click('button:has-text("Continue")');
    await expect(page.locator('text=Do you have a cover letter?')).toBeVisible();
    await expect(page.getByTestId('should-have-one')).toHaveCount(0);
  });

  test('cover letter nudge flashes then advances and does not stick on back', async ({ page }) => {
    await mockUploads(page);
    await page.fill('input[placeholder="Enter your first name"]', 'Test');
    await page.click('button:has-text("Continue")');

    const resumeInput = page.locator('input[type="file"][accept=".pdf,.doc,.docx"]').first();
    await resumeInput.setInputFiles({
      name: 'r.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('x'),
    });
    await page.waitForTimeout(3000);
    await page.click('button:has-text("Continue")');

    await page.click('label[for="no-linkedin"]');
    await page.click('button:has-text("Continue")');

    await expect(page.locator('text=Do you have a cover letter?')).toBeVisible();
    await expect(page.getByTestId('should-have-one')).toHaveCount(0);

    await page.click('button:has-text("Continue")');
    await expect(page.getByTestId('should-have-one')).toHaveText('You really should have one.');
    await expect(page.locator('h2:has-text("Career Narrative")')).toBeVisible({ timeout: 3000 });
    await expect(page.getByTestId('should-have-one')).toHaveCount(0);

    await page.click('button:has-text("Back")');
    await expect(page.locator('text=Do you have a cover letter?')).toBeVisible();
    await expect(page.getByTestId('should-have-one')).toHaveCount(0);

    await page.click('button:has-text("Back")');
    await expect(page.locator('text=Where can we find you online?')).toBeVisible();
    await expect(page.getByTestId('should-have-one')).toHaveCount(0);
  });

  test('special characters in answers do not break the form', async ({ page }) => {
    await passSetupSteps(page, { skipCoverLetter: true });

    const specialText = `O'Brien said "hello" & wrote <script>alert('xss')</script> with 100% confidence, it's a "test"`;
    await fillCareer(page, specialText, 'Normal answer');
    await page.click('button:has-text("Continue")');

    await page.click('button:has-text("Back")');
    await expect(page.locator('textarea[placeholder*="Senior Product Manager"]')).toHaveValue(specialText);

    await page.click('button:has-text("Continue")');
    await expect(page.locator('text=Can you make the blocks fit?')).toBeVisible();
  });

  test('very long answer does not break the form', async ({ page }) => {
    await passSetupSteps(page, { skipCoverLetter: true });

    const longText = 'A'.repeat(5000);
    await fillCareer(page, longText, 'Short');
    await page.click('button:has-text("Continue")');

    await expect(page.locator('text=Can you make the blocks fit?')).toBeVisible();

    await page.click('button:has-text("Back")');
    const value = await page.locator('textarea[placeholder*="Senior Product Manager"]').inputValue();
    expect(value.length).toBe(5000);
  });

  test('submit from results after navigating back and re-entering results', async ({ page }) => {
    await mockUploads(page);
    const getPayload = await mockSubmit(page);

    await passSetupSteps(page, { skipCoverLetter: true });
    await fillAllQuestions(page);

    // On results page. Go back to step 9 (details).
    await page.click('button:has-text("Back")');
    await expect(page.locator('h2:has-text("Last step, almost done")')).toBeVisible();

    await page.fill('input[placeholder="(555) 123-4567"]', '(555) 000-0000');

    await page.click('button:has-text("Continue")');
    await expect(page.locator('h2:has-text("Your Score")')).toBeVisible();

    await page.click('button:has-text("Submit")');
    await page.waitForTimeout(2000);

    const capturedPayload = getPayload();
    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload.answers.phone).toBe('(555) 000-0000');
    expect(capturedPayload.answers.targetRoles).toBe('Role A, Role B, Role C');
    expect(capturedPayload.answers.minSalary).toBe('125000');
  });

  test('submit failure shows error and does not navigate away', async ({ page }) => {
    await mockUploads(page, { fail: true });

    await passSetupSteps(page, { skipCoverLetter: true });
    await fillAllQuestions(page);

    await page.waitForTimeout(3000);
    await page.click('button:has-text("Submit")');
    await page.waitForTimeout(2000);

    await expect(page.locator('h2:has-text("Your Score")')).toBeVisible();
    await expect(page.locator('button:has-text("Submit")')).toBeEnabled();
  });

  test('successful submit shows completion screen with Calendly link', async ({ page }) => {
    await mockUploads(page);
    await mockSubmit(page);

    await passSetupSteps(page, { skipCoverLetter: true });
    await fillAllQuestions(page);

    await page.waitForTimeout(3000);
    await page.click('button:has-text("Submit")');
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Hell Yeah')).toBeVisible();
    await expect(page.locator('text=Book your first onboarding call')).toBeVisible();
    const calendlyLink = page.locator('a[href*="calendly.com"]');
    await expect(calendlyLink).toBeVisible();
  });

  // ─────────────────────────────────────────────
  // QUESTION COUNT PER STEP
  // ─────────────────────────────────────────────

  test('correct textarea count per step: 2, 0, 2, 0, 2, then inputs on details', async ({ page }) => {
    await passSetupSteps(page, { skipCoverLetter: true });

    // Step 4: career, 2 textareas
    await expect(page.locator('textarea')).toHaveCount(2);
    await page.click('button:has-text("Continue")');

    // Step 5: puzzle
    await expect(page.locator('textarea')).toHaveCount(0);
    await page.click('button:has-text("Continue")');

    // Step 6: impact
    await expect(page.locator('textarea')).toHaveCount(2);
    await page.click('button:has-text("Continue")');

    // Step 7: trivia
    await expect(page.locator('textarea')).toHaveCount(0);
    await page.click('button:has-text("Skip Trivia")');
    await page.waitForTimeout(2000);

    // Step 8: perspective
    await expect(page.locator('textarea')).toHaveCount(2);
    await page.click('button:has-text("Continue")');

    // Step 9: details, no textareas, 7 inputs + 1 select
    await expect(page.locator('textarea')).toHaveCount(0);
    await expect(page.locator('input:not([type="file"])')).toHaveCount(7);
    await expect(page.locator('select')).toHaveCount(1);
  });

  // ─────────────────────────────────────────────
  // PROGRESS BAR
  // ─────────────────────────────────────────────

  test('progress bar follows the current step, shrinks on Back, and hides on results', async ({ page }) => {
    const progressText = page.locator('text=/Part \\d+ of \\d+/');
    await expect(progressText).toBeVisible();
    await expect(progressText).toContainText('Part 1 of 10');

    await page.fill('input[placeholder="Enter your first name"]', 'Progress Test');
    await page.click('button:has-text("Continue")');
    await expect(progressText).toContainText('Part 2 of 10');

    const resumeInput = page.locator('input[type="file"][accept=".pdf,.doc,.docx"]').first();
    await resumeInput.setInputFiles({
      name: 'r.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('x'),
    });
    await page.waitForTimeout(3000);
    await page.click('button:has-text("Continue")');
    await page.click('label[for="no-linkedin"]');
    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Continue")');
    // Step 4: career
    await expect(progressText).toContainText('Part 5 of 10');
    await expect(page.locator('text=50%')).toBeVisible();

    // Back shrinks it (no high-water mark)
    await page.click('button:has-text("Back")');
    await expect(progressText).toContainText('Part 4 of 10');
    await expect(page.locator('text=40%')).toBeVisible();
    await page.click('button:has-text("Continue")');

    await page.click('button:has-text("Continue")'); // 4 -> 5
    await expect(progressText).toContainText('Part 6 of 10');
    await page.click('button:has-text("Continue")'); // 5 -> 6
    await page.click('button:has-text("Continue")'); // 6 -> 7
    await page.click('button:has-text("Skip Trivia")');
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Continue")'); // 8 -> 9
    await expect(progressText).toContainText('Part 10 of 10');
    await expect(page.locator('text=100%')).toBeVisible();
    await page.click('button:has-text("Continue")'); // 9 -> 10

    await expect(page.locator('text=/Part \\d+ of \\d+/')).not.toBeVisible();
  });
});
