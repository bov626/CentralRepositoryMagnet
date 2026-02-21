import { test, expect, Page } from '@playwright/test';

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

// Helper: fill all open-ended questions on steps 4-11
async function fillAllQuestions(page: Page) {
  // Step 4: 5 questions
  await page.fill('textarea[placeholder="Your best job experience..."]', 'Best job answer');
  await page.fill('textarea[placeholder="How you found your path..."]', 'Career choice answer');
  await page.fill('textarea[placeholder="People who shaped your career..."]', 'Mentors answer');
  await page.fill('textarea[placeholder="Things you took on beyond your role..."]', 'Beyond job answer');
  await page.fill('textarea[placeholder="Your go-to reputation..."]', 'Colleagues answer');
  await page.click('button:has-text("Continue")');

  // Step 5: 2 questions
  await page.fill('textarea[placeholder="Your full career journey..."]', 'Career history answer');
  await page.fill('textarea[placeholder*="Senior Product Manager"]', 'Role A, Role B, Role C');
  await page.click('button:has-text("Continue")');

  // Step 6: Skip puzzle
  await page.click('button:has-text("Continue")');

  // Step 7: 2 questions
  await page.fill('textarea[placeholder="Your key contributions per role..."]', 'Impact per role answer');
  await page.fill('textarea[placeholder="Metrics and numbers that back up your impact..."]', 'Metrics answer');
  await page.click('button:has-text("Continue")');

  // Step 8: 2 questions
  await page.fill('textarea[placeholder="A quote or idea that changed your approach..."]', 'Quote answer');
  await page.fill('textarea[placeholder="A book or movie you revisit and why..."]', 'Book answer');
  await page.click('button:has-text("Continue")');

  // Step 9: Skip trivia
  await page.click('button:has-text("Skip Trivia")');
  await page.waitForTimeout(2000);

  // Step 10: 2 questions
  await page.fill('textarea[placeholder="A proud moment that never made the resume..."]', 'Accomplishment answer');
  await page.fill('textarea[placeholder="Your hobbies, side projects, interests..."]', 'Hobbies answer');
  await page.click('button:has-text("Continue")');

  // Step 11: 2 questions
  await page.fill('textarea[placeholder="How you\'d spend a sabbatical..."]', 'Sabbatical answer');
  await page.fill('textarea[placeholder="Anything else on your mind..."]', 'Anything else answer');
  await page.click('button:has-text("Continue")');
}

test.describe('Onboarding Questionnaire Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/questions1');
    await page.waitForSelector('text=Session I', { timeout: 10000 });
  });

  // ─────────────────────────────────────────────
  // DATA PERSISTENCE
  // ─────────────────────────────────────────────

  test('answers persist when navigating back and forth through all steps', async ({ page }) => {
    await passSetupSteps(page, { skipCoverLetter: true });

    // Step 4: fill answers, continue, then go back
    await page.fill('textarea[placeholder="Your best job experience..."]', 'My amazing startup');
    await page.fill('textarea[placeholder="How you found your path..."]', 'Fell into coding');
    await page.fill('textarea[placeholder="People who shaped your career..."]', 'Dr. Smith');
    await page.fill('textarea[placeholder="Things you took on beyond your role..."]', 'Mentoring juniors');
    await page.fill('textarea[placeholder="Your go-to reputation..."]', 'Architecture guru');
    await page.click('button:has-text("Continue")');

    // Step 5: fill, continue
    await page.fill('textarea[placeholder="Your full career journey..."]', 'Started at age 16');
    await page.fill('textarea[placeholder*="Senior Product Manager"]', 'CTO, VP Eng, Director');
    await page.click('button:has-text("Continue")');

    // Now go back to step 5
    await page.click('button:has-text("Back")');
    await expect(page.locator('textarea[placeholder="Your full career journey..."]')).toHaveValue('Started at age 16');
    await expect(page.locator('textarea[placeholder*="Senior Product Manager"]')).toHaveValue('CTO, VP Eng, Director');

    // Back to step 4
    await page.click('button:has-text("Back")');
    await expect(page.locator('textarea[placeholder="Your best job experience..."]')).toHaveValue('My amazing startup');
    await expect(page.locator('textarea[placeholder="How you found your path..."]')).toHaveValue('Fell into coding');
    await expect(page.locator('textarea[placeholder="People who shaped your career..."]')).toHaveValue('Dr. Smith');
    await expect(page.locator('textarea[placeholder="Things you took on beyond your role..."]')).toHaveValue('Mentoring juniors');
    await expect(page.locator('textarea[placeholder="Your go-to reputation..."]')).toHaveValue('Architecture guru');

    // Go back further to step 3, then step 2
    await page.click('button:has-text("Back")');
    await expect(page.locator('text=Do you have a cover letter?')).toBeVisible();
    await page.click('button:has-text("Back")');
    await expect(page.locator('input[placeholder="https://linkedin.com/in/yourprofile"]')).toHaveValue('https://linkedin.com/in/e2etester');

    // Go back to name
    await page.click('button:has-text("Back")');
    await page.click('button:has-text("Back")');
    await expect(page.locator('input[placeholder="Enter your first name"]')).toHaveValue('E2E Tester');

    // Now go forward all the way — answers should still be there
    await page.click('button:has-text("Continue")'); // to step 1
    await page.click('button:has-text("Continue")'); // to step 2
    await page.click('button:has-text("Continue")'); // to step 3
    await page.click('button:has-text("Continue")'); // to step 4
    await expect(page.locator('textarea[placeholder="Your best job experience..."]')).toHaveValue('My amazing startup');
    await expect(page.locator('textarea[placeholder="Your go-to reputation..."]')).toHaveValue('Architecture guru');
  });

  test('answers persist through late-stage back navigation (step 11 → 7 → 11)', async ({ page }) => {
    await passSetupSteps(page, { skipCoverLetter: true });
    await fillAllQuestions(page);

    // Now on step 12 (Results). Go back to step 11.
    await page.click('button:has-text("Back")');
    await expect(page.locator('textarea[placeholder="How you\'d spend a sabbatical..."]')).toHaveValue('Sabbatical answer');
    await expect(page.locator('textarea[placeholder="Anything else on your mind..."]')).toHaveValue('Anything else answer');

    // Go back to step 10
    await page.click('button:has-text("Back")');
    await expect(page.locator('textarea[placeholder="A proud moment that never made the resume..."]')).toHaveValue('Accomplishment answer');

    // Go back to step 8 (How You Think — skip trivia backwards)
    await page.click('button:has-text("Back")');  // step 9 (trivia)
    await page.click('button:has-text("Back")');  // step 8
    await expect(page.locator('textarea[placeholder="A quote or idea that changed your approach..."]')).toHaveValue('Quote answer');
    await expect(page.locator('textarea[placeholder="A book or movie you revisit and why..."]')).toHaveValue('Book answer');

    // Back to step 7 (Your Impact)
    await page.click('button:has-text("Back")');
    await expect(page.locator('textarea[placeholder="Your key contributions per role..."]')).toHaveValue('Impact per role answer');
    await expect(page.locator('textarea[placeholder="Metrics and numbers that back up your impact..."]')).toHaveValue('Metrics answer');

    // Now go forward all the way back to results
    await page.click('button:has-text("Continue")'); // step 8
    await page.click('button:has-text("Continue")'); // step 9
    await page.click('button:has-text("Continue")'); // step 10
    await page.click('button:has-text("Continue")'); // step 11
    await page.click('button:has-text("Continue")'); // step 12

    await expect(page.locator('h2:has-text("Your Score")')).toBeVisible();
  });

  // ─────────────────────────────────────────────
  // SUBMISSION PAYLOAD VERIFICATION
  // ─────────────────────────────────────────────

  test('submit sends correct payload with all 15 answer keys', async ({ page }) => {
    await passSetupSteps(page);

    // Fill all questions
    // Step 4
    await page.fill('textarea[placeholder="Your best job experience..."]', 'Best job val');
    await page.fill('textarea[placeholder="How you found your path..."]', 'Career choice val');
    await page.fill('textarea[placeholder="People who shaped your career..."]', 'Mentors val');
    await page.fill('textarea[placeholder="Things you took on beyond your role..."]', 'Beyond val');
    await page.fill('textarea[placeholder="Your go-to reputation..."]', 'Colleagues val');
    await page.click('button:has-text("Continue")');

    // Step 5
    await page.fill('textarea[placeholder="Your full career journey..."]', 'Career history val');
    await page.fill('textarea[placeholder*="Senior Product Manager"]', 'Target roles val');
    await page.click('button:has-text("Continue")');

    // Step 6: skip
    await page.click('button:has-text("Continue")');

    // Step 7
    await page.fill('textarea[placeholder="Your key contributions per role..."]', 'Impact val');
    await page.fill('textarea[placeholder="Metrics and numbers that back up your impact..."]', 'Metrics val');
    await page.click('button:has-text("Continue")');

    // Step 8
    await page.fill('textarea[placeholder="A quote or idea that changed your approach..."]', 'Quote val');
    await page.fill('textarea[placeholder="A book or movie you revisit and why..."]', 'Book val');
    await page.click('button:has-text("Continue")');

    // Step 9: skip trivia
    await page.click('button:has-text("Skip Trivia")');
    await page.waitForTimeout(2000);

    // Step 10
    await page.fill('textarea[placeholder="A proud moment that never made the resume..."]', 'Accomplishment val');
    await page.fill('textarea[placeholder="Your hobbies, side projects, interests..."]', 'Hobbies val');
    await page.click('button:has-text("Continue")');

    // Step 11
    await page.fill('textarea[placeholder="How you\'d spend a sabbatical..."]', 'Sabbatical val');
    await page.fill('textarea[placeholder="Anything else on your mind..."]', 'Anything else val');
    await page.click('button:has-text("Continue")');

    // Step 12: intercept the API call, then click Submit
    let capturedPayload: any = null;
    await page.route('**/api/onboarding-form', async (route) => {
      capturedPayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK' }),
      });
    });

    // Also intercept file upload requests
    await page.route('**/api/uploads/request-url', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ uploadURL: 'https://fake.com/upload', objectPath: '/uploads/test.pdf' }),
      });
    });
    await page.route('https://fake.com/upload', async (route) => {
      await route.fulfill({ status: 200 });
    });

    await page.waitForTimeout(3000); // let score animate
    await page.click('button:has-text("Submit")');
    await page.waitForTimeout(2000);

    // Verify the payload
    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload.name).toBe('E2E Tester');
    expect(capturedPayload.linkedIn).toBe('https://linkedin.com/in/e2etester');

    // All 15 answer keys present
    const answers = capturedPayload.answers;
    expect(answers.bestJob).toBe('Best job val');
    expect(answers.careerChoice).toBe('Career choice val');
    expect(answers.mentors).toBe('Mentors val');
    expect(answers.beyondJobDescription).toBe('Beyond val');
    expect(answers.colleaguesComeToYouFor).toBe('Colleagues val');
    expect(answers.careerHistory).toBe('Career history val');
    expect(answers.targetRoles).toBe('Target roles val');
    expect(answers.impactPerRole).toBe('Impact val');
    expect(answers.impactMetrics).toBe('Metrics val');
    expect(answers.principlesQuotes).toBe('Quote val');
    expect(answers.bookOrMovie).toBe('Book val');
    expect(answers.unlistedAccomplishment).toBe('Accomplishment val');
    expect(answers.hobbiesSideProjects).toBe('Hobbies val');
    expect(answers.sabbatical).toBe('Sabbatical val');
    expect(answers.anythingElse).toBe('Anything else val');

    // File names included
    expect(answers.resumeFileName).toBe('resume.pdf');
    expect(answers.coverLetterFileName).toBe('cover.pdf');

    // Tier and points
    expect(capturedPayload.totalPoints).toBe(1900);
    expect(capturedPayload.tier).toBe('Operator Status');
  });

  test('submit with N/A LinkedIn sends null linkedIn', async ({ page }) => {
    await passSetupSteps(page, { noLinkedIn: true, skipCoverLetter: true });
    await fillAllQuestions(page);

    let capturedPayload: any = null;
    await page.route('**/api/onboarding-form', async (route) => {
      capturedPayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
    await page.route('**/api/uploads/request-url', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ uploadURL: 'https://fake.com/upload', objectPath: '/uploads/test.pdf' }),
      });
    });
    await page.route('https://fake.com/upload', async (route) => {
      await route.fulfill({ status: 200 });
    });

    await page.waitForTimeout(3000);
    await page.click('button:has-text("Submit")');
    await page.waitForTimeout(2000);

    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload.linkedIn).toBeNull();
  });

  // ─────────────────────────────────────────────
  // SCORING EDGE CASES
  // ─────────────────────────────────────────────

  test('NPC tier — rush through with nothing filled', async ({ page }) => {
    await page.fill('input[placeholder="Enter your first name"]', 'Rusher');
    await page.click('button:has-text("Continue")');

    // Resume is required — upload minimal
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

    // Steps 4-11: skip everything (empty textareas)
    await page.click('button:has-text("Continue")'); // step 4 → 5
    await page.click('button:has-text("Continue")'); // step 5 → 6
    await page.click('button:has-text("Continue")'); // step 6 → 7
    await page.click('button:has-text("Continue")'); // step 7 → 8
    await page.click('button:has-text("Continue")'); // step 8 → 9 (trivia)
    await page.click('button:has-text("Skip Trivia")');
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Continue")'); // step 10 → 11
    await page.click('button:has-text("Continue")'); // step 11 → 12 (results)

    // Total: name(100) + resume(100) = 200. That's NPC.
    await page.waitForTimeout(3000);
    await expect(page.locator('text=NPC Status')).toBeVisible();
    await expect(page.locator('text=Did you even try?')).toBeVisible();
  });

  test('points are NOT double-awarded when navigating back and forward', async ({ page }) => {
    await passSetupSteps(page, { skipCoverLetter: true });

    // Step 4: fill all 5 questions (+500)
    await page.fill('textarea[placeholder="Your best job experience..."]', 'Best job here');
    await page.fill('textarea[placeholder="How you found your path..."]', 'Career choice here');
    await page.fill('textarea[placeholder="People who shaped your career..."]', 'Mentor here');
    await page.fill('textarea[placeholder="Things you took on beyond your role..."]', 'Beyond job here');
    await page.fill('textarea[placeholder="Your go-to reputation..."]', 'Colleague stuff');
    await page.click('button:has-text("Continue")');

    // Step 5: fill
    await page.fill('textarea[placeholder="Your full career journey..."]', 'Full career');
    await page.fill('textarea[placeholder*="Senior Product Manager"]', 'Roles here');
    await page.click('button:has-text("Continue")');

    // Now at step 6. Go back to step 4.
    await page.click('button:has-text("Back")'); // step 5
    await page.click('button:has-text("Back")'); // step 4

    // Go forward again — these steps should NOT award points again
    await page.click('button:has-text("Continue")'); // step 4 → 5
    await page.click('button:has-text("Continue")'); // step 5 → 6

    // Skip to results quickly
    await page.click('button:has-text("Continue")'); // step 6 → 7
    await page.click('button:has-text("Continue")'); // step 7 → 8
    await page.click('button:has-text("Continue")'); // step 8 → 9 (trivia)
    await page.click('button:has-text("Skip Trivia")');
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Continue")'); // step 10 → 11
    await page.click('button:has-text("Continue")'); // step 11 → 12 (results)

    await page.waitForTimeout(3000);

    // Expected: name(100) + resume(100) + linkedin(100) + step4(500) + step5(200) = 1000
    // Should NOT be 1500 or 2000 from double-awarding
    // Points display on result page
    const scoreText = await page.locator('.text-7xl').textContent();
    const score = parseInt(scoreText!.replace(/,/g, ''));
    expect(score).toBe(1000);
  });

  test('easter egg on step 1 adds exactly 50 points', async ({ page }) => {
    // Step 0
    await page.fill('input[placeholder="Enter your first name"]', 'Egg Hunter');
    await page.click('button:has-text("Continue")');

    // Step 1: Click the "point" easter egg word
    const pointSpan = page.locator('span', { hasText: 'point' }).first();
    await pointSpan.click();

    // Upload resume
    const resumeInput = page.locator('input[type="file"][accept=".pdf,.doc,.docx"]').first();
    await resumeInput.setInputFiles({
      name: 'r.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('x'),
    });
    await page.waitForTimeout(3000);
    await page.click('button:has-text("Continue")');

    // LinkedIn N/A
    await page.click('label[for="no-linkedin"]');
    await page.click('button:has-text("Continue")');

    // Skip everything to results
    await page.click('button:has-text("Continue")'); // cover letter → step 4
    await page.click('button:has-text("Continue")'); // step 4 → 5
    await page.click('button:has-text("Continue")'); // step 5 → 6
    await page.click('button:has-text("Continue")'); // step 6 → 7
    await page.click('button:has-text("Continue")'); // step 7 → 8
    await page.click('button:has-text("Continue")'); // step 8 → 9 (trivia)
    await page.click('button:has-text("Skip Trivia")');
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Continue")'); // step 10 → 11
    await page.click('button:has-text("Continue")'); // step 11 → 12 (results)

    await page.waitForTimeout(3000);

    // name(100) + easter egg(50) + resume(100) = 250
    const scoreText = await page.locator('.text-7xl').textContent();
    const score = parseInt(scoreText!.replace(/,/g, ''));
    expect(score).toBe(250);
  });

  test('easter egg cannot be claimed twice', async ({ page }) => {
    await page.fill('input[placeholder="Enter your first name"]', 'Double Egg');
    await page.click('button:has-text("Continue")');

    const pointSpan = page.locator('span', { hasText: 'point' }).first();
    await pointSpan.click();
    await page.waitForTimeout(200);
    await pointSpan.click(); // click again

    // Upload and continue to see points
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

    // Skip to results (cover letter → step 4 → 5 → 6 → 7 → 8 → 9 trivia → 10 → 11 → 12)
    await page.click('button:has-text("Continue")'); // cover letter → 4
    await page.click('button:has-text("Continue")'); // 4 → 5
    await page.click('button:has-text("Continue")'); // 5 → 6
    await page.click('button:has-text("Continue")'); // 6 → 7
    await page.click('button:has-text("Continue")'); // 7 → 8
    await page.click('button:has-text("Continue")'); // 8 → 9
    await page.click('button:has-text("Skip Trivia")');
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Continue")'); // 10 → 11
    await page.click('button:has-text("Continue")'); // 11 → 12

    await page.waitForTimeout(3000);
    // Should still be 250, not 300
    const scoreText = await page.locator('.text-7xl').textContent();
    const score = parseInt(scoreText!.replace(/,/g, ''));
    expect(score).toBe(250);
  });

  test('partial step 4 — only 2 of 5 questions filled scores 200 not 500', async ({ page }) => {
    await passSetupSteps(page, { skipCoverLetter: true });

    // Only fill 2 of 5 questions on step 4
    await page.fill('textarea[placeholder="Your best job experience..."]', 'Best job here');
    await page.fill('textarea[placeholder="How you found your path..."]', 'Career choice here');
    // Leave mentors, beyondJobDescription, colleaguesComeToYouFor empty
    await page.click('button:has-text("Continue")');

    // Skip the rest
    await page.click('button:has-text("Continue")'); // step 5 → 6
    await page.click('button:has-text("Continue")'); // step 6 → 7
    await page.click('button:has-text("Continue")'); // step 7 → 8
    await page.click('button:has-text("Continue")'); // step 8 → 9 (trivia)
    await page.click('button:has-text("Skip Trivia")');
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Continue")'); // step 10 → 11
    await page.click('button:has-text("Continue")'); // step 11 → 12 (results)

    await page.waitForTimeout(3000);
    // name(100) + resume(100) + linkedin(100) + step4(200 for 2 questions) = 500
    const scoreText = await page.locator('.text-7xl').textContent();
    const score = parseInt(scoreText!.replace(/,/g, ''));
    expect(score).toBe(500);
  });

  // ─────────────────────────────────────────────
  // TIER BOUNDARIES
  // ─────────────────────────────────────────────

  test('tier boundary: 1900 = Operator, not Gamer', async ({ page }) => {
    // Full completion, all questions, with cover letter, no extras
    // name(100) + resume(100) + linkedin(100) + cover(100) + 15 questions(1500) = 1900
    await passSetupSteps(page); // includes cover letter = 1900 total
    await fillAllQuestions(page);

    await page.waitForTimeout(3000);
    await expect(page.locator('text=Operator Status')).toBeVisible();
  });

  test('tier boundary: > 1900 = Gamer Status', async ({ page }) => {
    // Everything + trivia Q1 = 1900 + 100 = 2000
    await passSetupSteps(page);

    // Step 4-8: fill all
    await page.fill('textarea[placeholder="Your best job experience..."]', 'Answer');
    await page.fill('textarea[placeholder="How you found your path..."]', 'Answer');
    await page.fill('textarea[placeholder="People who shaped your career..."]', 'Answer');
    await page.fill('textarea[placeholder="Things you took on beyond your role..."]', 'Answer');
    await page.fill('textarea[placeholder="Your go-to reputation..."]', 'Answer');
    await page.click('button:has-text("Continue")');

    await page.fill('textarea[placeholder="Your full career journey..."]', 'Answer');
    await page.fill('textarea[placeholder*="Senior Product Manager"]', 'Answer');
    await page.click('button:has-text("Continue")');

    await page.click('button:has-text("Continue")'); // puzzle

    await page.fill('textarea[placeholder="Your key contributions per role..."]', 'Answer');
    await page.fill('textarea[placeholder="Metrics and numbers that back up your impact..."]', 'Answer');
    await page.click('button:has-text("Continue")');

    await page.fill('textarea[placeholder="A quote or idea that changed your approach..."]', 'Answer');
    await page.fill('textarea[placeholder="A book or movie you revisit and why..."]', 'Answer');
    await page.click('button:has-text("Continue")');

    // Trivia: answer Q1 only for +100
    await page.click('button:has-text("Sandpaper")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Continue")');

    await page.fill('textarea[placeholder="A proud moment that never made the resume..."]', 'Answer');
    await page.fill('textarea[placeholder="Your hobbies, side projects, interests..."]', 'Answer');
    await page.click('button:has-text("Continue")');

    await page.fill('textarea[placeholder="How you\'d spend a sabbatical..."]', 'Answer');
    await page.fill('textarea[placeholder="Anything else on your mind..."]', 'Answer');
    await page.click('button:has-text("Continue")');

    await page.waitForTimeout(3000);
    // 1900 + 100 = 2000 → Gamer Status (> 1900)
    await expect(page.locator('text=Gamer Status')).toBeVisible();
    await expect(page.locator('text=Love the effort on the extras')).toBeVisible();
  });

  // ─────────────────────────────────────────────
  // BREAKING THE FLOW — EDGE CASES
  // ─────────────────────────────────────────────

  test('cannot proceed past step 0 without name', async ({ page }) => {
    // Continue button should be disabled when name is empty
    const continueBtn = page.locator('button:has-text("Continue")');
    await expect(continueBtn).toBeDisabled();
    // Should still be on step 0
    await expect(page.locator('text=Who are you?')).toBeVisible();
  });

  test('cannot proceed past step 1 without resume', async ({ page }) => {
    await page.fill('input[placeholder="Enter your first name"]', 'Test');
    await page.click('button:has-text("Continue")');

    // On step 1, click continue without uploading
    const continueBtn = page.locator('button:has-text("Continue")');
    await expect(continueBtn).toBeDisabled();
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

    // On step 2, Continue should be disabled without LinkedIn or N/A
    const continueBtn = page.locator('button:has-text("Continue")');
    await expect(continueBtn).toBeDisabled();
    // Should still be on step 2
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

    // Check N/A box
    await page.click('label[for="no-linkedin"]');
    // Input should be disabled
    await expect(page.locator('input[placeholder="https://linkedin.com/in/yourprofile"]')).toBeDisabled();
    // Continue should work now
    await page.click('button:has-text("Continue")');
    await expect(page.locator('text=Do you have a cover letter?')).toBeVisible();
  });

  test('special characters in answers do not break the form', async ({ page }) => {
    await passSetupSteps(page, { skipCoverLetter: true });

    const specialText = `O'Brien said "hello" & wrote <script>alert('xss')</script> with 100% confidence — it's a "test"`;
    await page.fill('textarea[placeholder="Your best job experience..."]', specialText);
    await page.fill('textarea[placeholder="How you found your path..."]', 'Normal answer');
    await page.fill('textarea[placeholder="People who shaped your career..."]', 'Normal');
    await page.fill('textarea[placeholder="Things you took on beyond your role..."]', 'Normal');
    await page.fill('textarea[placeholder="Your go-to reputation..."]', 'Normal');
    await page.click('button:has-text("Continue")');

    // Go back and verify the special text survived
    await page.click('button:has-text("Back")');
    await expect(page.locator('textarea[placeholder="Your best job experience..."]')).toHaveValue(specialText);

    // Continue forward — form shouldn't crash
    await page.click('button:has-text("Continue")');
    await expect(page.locator('h2:has-text("Career Narrative Part 2")')).toBeVisible();
  });

  test('very long answer does not break the form', async ({ page }) => {
    await passSetupSteps(page, { skipCoverLetter: true });

    const longText = 'A'.repeat(5000);
    await page.fill('textarea[placeholder="Your best job experience..."]', longText);
    await page.fill('textarea[placeholder="How you found your path..."]', 'Short');
    await page.fill('textarea[placeholder="People who shaped your career..."]', 'Short');
    await page.fill('textarea[placeholder="Things you took on beyond your role..."]', 'Short');
    await page.fill('textarea[placeholder="Your go-to reputation..."]', 'Short');
    await page.click('button:has-text("Continue")');

    // Should proceed normally
    await expect(page.locator('h2:has-text("Career Narrative Part 2")')).toBeVisible();

    // Go back and verify long text survived
    await page.click('button:has-text("Back")');
    const value = await page.locator('textarea[placeholder="Your best job experience..."]').inputValue();
    expect(value.length).toBe(5000);
  });

  test('submit from results after navigating back and re-entering results', async ({ page }) => {
    await passSetupSteps(page, { skipCoverLetter: true });
    await fillAllQuestions(page);

    // On results page. Go back to step 11.
    await page.click('button:has-text("Back")');
    await expect(page.locator('h2:has-text("Perspective Part 2")')).toBeVisible();

    // Edit an answer
    await page.fill('textarea[placeholder="Anything else on your mind..."]', 'UPDATED answer');

    // Go forward to results again
    await page.click('button:has-text("Continue")');
    await expect(page.locator('h2:has-text("Your Score")')).toBeVisible();

    // Intercept and submit
    let capturedPayload: any = null;
    await page.route('**/api/onboarding-form', async (route) => {
      capturedPayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
    await page.route('**/api/uploads/request-url', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ uploadURL: 'https://fake.com/upload', objectPath: '/uploads/test.pdf' }),
      });
    });
    await page.route('https://fake.com/upload', async (route) => {
      await route.fulfill({ status: 200 });
    });

    await page.click('button:has-text("Submit")');
    await page.waitForTimeout(2000);

    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload.answers.anythingElse).toBe('UPDATED answer');
    // Rest of answers should still be intact
    expect(capturedPayload.answers.bestJob).toBe('Best job answer');
    expect(capturedPayload.answers.sabbatical).toBe('Sabbatical answer');
  });

  test('submit failure shows error and does not navigate away', async ({ page }) => {
    await passSetupSteps(page, { skipCoverLetter: true });
    await fillAllQuestions(page);

    // Mock API failure
    await page.route('**/api/uploads/request-url', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' }),
      });
    });

    await page.waitForTimeout(3000);
    await page.click('button:has-text("Submit")');
    await page.waitForTimeout(2000);

    // Should still be on results page (not the "Hell Yeah" submitted screen)
    await expect(page.locator('h2:has-text("Your Score")')).toBeVisible();
    // Submit button should be re-enabled
    await expect(page.locator('button:has-text("Submit")')).toBeEnabled();
  });

  test('successful submit shows completion screen with Calendly link', async ({ page }) => {
    await passSetupSteps(page, { skipCoverLetter: true });
    await fillAllQuestions(page);

    await page.route('**/api/onboarding-form', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
    await page.route('**/api/uploads/request-url', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ uploadURL: 'https://fake.com/upload', objectPath: '/uploads/test.pdf' }),
      });
    });
    await page.route('https://fake.com/upload', async (route) => {
      await route.fulfill({ status: 200 });
    });

    await page.waitForTimeout(3000);
    await page.click('button:has-text("Submit")');
    await page.waitForTimeout(2000);

    // Should show the completion screen
    await expect(page.locator('text=Hell Yeah')).toBeVisible();
    await expect(page.locator('text=Book your first onboarding call')).toBeVisible();
    // Calendly link should exist
    const calendlyLink = page.locator('a[href*="calendly.com"]');
    await expect(calendlyLink).toBeVisible();
  });

  // ─────────────────────────────────────────────
  // QUESTION COUNT PER STEP
  // ─────────────────────────────────────────────

  test('correct textarea count per step: 5, 2, 2, 2, 2, 2', async ({ page }) => {
    await passSetupSteps(page, { skipCoverLetter: true });

    // Step 4: 5 textareas
    await expect(page.locator('textarea')).toHaveCount(5);
    await page.click('button:has-text("Continue")');

    // Step 5: 2 textareas
    await expect(page.locator('textarea')).toHaveCount(2);
    await page.click('button:has-text("Continue")');

    // Step 6: puzzle (0 textareas)
    await expect(page.locator('textarea')).toHaveCount(0);
    await page.click('button:has-text("Continue")');

    // Step 7: 2 textareas
    await expect(page.locator('textarea')).toHaveCount(2);
    await page.click('button:has-text("Continue")');

    // Step 8: 2 textareas
    await expect(page.locator('textarea')).toHaveCount(2);
    await page.click('button:has-text("Continue")');

    // Step 9: trivia (0 textareas)
    await expect(page.locator('textarea')).toHaveCount(0);
    await page.click('button:has-text("Skip Trivia")');
    await page.waitForTimeout(2000);

    // Step 10: 2 textareas
    await expect(page.locator('textarea')).toHaveCount(2);
    await page.click('button:has-text("Continue")');

    // Step 11: 2 textareas
    await expect(page.locator('textarea')).toHaveCount(2);
  });

  // ─────────────────────────────────────────────
  // PROGRESS BAR
  // ─────────────────────────────────────────────

  test('progress bar advances and does not show on results page', async ({ page }) => {
    // Step 0: progress bar should be visible
    const progressText = page.locator('text=/Part \\d+ of \\d+/');
    await expect(progressText).toBeVisible();
    await expect(progressText).toContainText('Part 1 of');

    await page.fill('input[placeholder="Enter your first name"]', 'Progress Test');
    await page.click('button:has-text("Continue")');

    // Step 1: part 2
    await expect(progressText).toContainText('Part 2 of');

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
    // Step 4: should be part 5 (career group)
    await expect(progressText).toContainText('Part 5 of');

    // Skip to results
    await page.click('button:has-text("Continue")'); // step 4 → 5
    await page.click('button:has-text("Continue")'); // step 5 → 6 (puzzle)
    await page.click('button:has-text("Continue")'); // step 6 → 7
    await page.click('button:has-text("Continue")'); // step 7 → 8
    await page.click('button:has-text("Continue")'); // step 8 → 9 (trivia)
    await page.click('button:has-text("Skip Trivia")');
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Continue")'); // step 10 → 11
    await page.click('button:has-text("Continue")'); // step 11 → 12 (results)

    // Results page: progress bar should be hidden
    await expect(page.locator('text=/Part \\d+ of \\d+/')).not.toBeVisible();
  });
});
