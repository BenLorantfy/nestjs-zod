import { test, expect, Locator } from '@playwright/test';

test(`GET /api/people`, async ({ page }) => {
  await page.goto(`http://localhost:3001/api`);

  await page.getByRole('button', { name: `GET /api/people` }).first().click()
  await expect(await page.getByText('Responses')).toBeVisible()
  await page.getByRole('tab', { name: 'Schema', exact: true }).click()
  
  const tabPanel = await page.getByRole('tabpanel', { name: 'Schema', exact: true });

  await expandAll(tabPanel);
  
  await expectField(tabPanel, { name: 'name', type: 'string', required: true });

  // Test `created` field codec is correctly a string:
  await expectField(tabPanel, { name: 'created', type: 'string', required: true });
});

async function expectField(locator: Locator, { name, type, required, description, enumValues }: { name: string, type: string, required: boolean, description?: string, enumValues?: string[] }) {
  const field = `${name}${required ? '*' : ''}${type}${description ?? ''}`
  await expect(locator).toContainText(field)
  if (enumValues) {
    await expect(locator).toContainText(enumValues.join(', '))
  }
}

async function expandAll(locator: Locator) {
  while (true) {
    const numFields = await locator.getByRole('button', { name: /\[\.\.\.\]|\{\.\.\.\}/ }).count();
    if (numFields === 0) {
      break;
    }
    for (let i = 0; i < numFields; i++) {
      await locator.getByRole('button', { name: /\[\.\.\.\]|\{\.\.\.\}/ }).first().click();
    }
  }
}
