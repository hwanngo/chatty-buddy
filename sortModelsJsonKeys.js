import fs from 'node:fs/promises';

function sortObjectKeys(value) {
  if (Array.isArray(value)) {
    const entries = value.map(sortObjectKeys);
    if (entries.every((entry) => entry && typeof entry.name === 'string'))
      entries.sort((a, b) => a.name.localeCompare(b.name));
    return entries;
  }
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortObjectKeys(value[key])])
    );
  return value;
}

const response = await fetch('https://openrouter.ai/api/v1/models', {
  signal: AbortSignal.timeout(15000),
});
if (!response.ok)
  throw new Error(`Model catalog request failed (${response.status}).`);
const catalog = await response.json();
if (
  !Array.isArray(catalog.data) ||
  !catalog.data.every(
    (model) =>
      typeof model.id === 'string' && typeof model.context_length === 'number'
  )
) {
  throw new Error(
    'Unexpected model catalog format; existing snapshot was not changed.'
  );
}
const output = new URL('./public/models.json', import.meta.url);
const temporary = new URL('./public/models.json.tmp', import.meta.url);
try {
  await fs.writeFile(
    temporary,
    JSON.stringify(sortObjectKeys(catalog), null, 2) + '\n'
  );
  await fs.rename(temporary, output);
} finally {
  await fs.rm(temporary, { force: true });
}
console.log('Updated public/models.json. Review the diff and run pnpm check.');
