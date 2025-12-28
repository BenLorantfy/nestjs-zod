import { test, expect } from '@playwright/test';

test.describe(`issue#202 - ESM support`, () => {
    test(`Shows field descriptions properly`, async ({ page }) => {
        await page.goto(`http://localhost:3000/api`);
      
        await page.getByRole('button', { name: `Book_Output` }).click()
        await page.getByRole('button', { name: /\[\.\.\.\]|\{\.\.\.\}/ }).first().click();
      
        expect(await page.getByText('The title of the book')).toBeAttached();
    });
});


