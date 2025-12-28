import { test, expect } from '@playwright/test';

test.describe(`issue#202 - ESM support`, () => {
    test(`Shows field descriptions properly`, async ({ page }) => {
        await page.goto(`http://localhost:3002/api`);
      
        await page.getByRole('button', { name: `Book_Output` }).click()
        await page.getByRole('button', { name: /\[\.\.\.\]|\{\.\.\.\}/ }).first().click();
      
        const bookSchema = await page.locator('[data-name="Book_Output"]');
        await expect(bookSchema).toContainText('The title of the book');
    });
});


