import { test, expect, Locator } from '@playwright/test';

['v3', 'v4'].forEach((version) => {
    test.describe(`zod ${version}`, () => {
        test(`POST /posts`, async ({ page }) => {
          await page.goto(`http://localhost:3000/api/zod-${version}`);
        
          await page.getByRole('button', { name: `POST /zod-${version}/posts` }).first().click()
          await expect(await page.getByText('Request body')).toBeVisible()
          await page.getByRole('tab', { name: 'Schema', exact: true }).click()
          const tabPanel = await page.getByRole('tabpanel', { name: 'Schema', exact: true });
          
          await tabPanel.getByRole('button', { name: '[...]' }).first().click()
          await tabPanel.getByRole('button', { name: '[...]' }).first().click()
          await tabPanel.getByRole('button', { name: '[...]' }).first().click()
          await tabPanel.getByRole('button', { name: '[...]' }).first().click()
          await tabPanel.getByRole('button', { name: 'Array [ 2 ]' }).first().click()
        
          await expectField(tabPanel, { name: 'title', type: 'string', required: true, description: 'The title of the post' });
          await expectField(tabPanel, { name: 'content', type: 'string', required: true, description: 'The content of the post' });
          await expectField(tabPanel, { name: 'authorId', type: 'number', required: true, description: 'The ID of the author of the post' });
          await expectField(tabPanel, { name: 'visibility', type: 'string', required: true, description: 'The visibility of the post', enumValues: ['public', 'private'] });
        });
    
        test.describe(`GET /posts`, () => {
          // https://github.com/BenLorantfy/nestjs-zod/issues/120
          test('#120', async ({ page }) => {
            await page.goto(`http://localhost:3000/api/zod-${version}`);
        
            await page.getByRole('button', { name: `GET /zod-${version}/posts` }).first().click()
            const tbody = await page.getByRole('table').first().locator('tbody')
            await expect(tbody).toHaveText('title *string(query)');
          })
        })
    });
});



async function expectField(locator: Locator, { name, type, required, description, enumValues }: { name: string, type: string, required: boolean, description: string, enumValues?: string[] }) {
  const field = `${name}${required ? '*' : ''}${type}${description}`
  await expect(locator).toContainText(field)
  if (enumValues) {
    await expect(locator).toContainText(enumValues.join(', '))
  }
}