const coverSizes = [144, 480, 800, 1200];
const exampleSizes = [480, 800];
const editions = new Map<string, number[]>();
for (const name of ['yeahgrind-landing', 'studyloop-1', 'clicki-1', 'ddc-1', 'shmagro-1', 'blcsoftsale-1'])
  editions.set('/screens/' + name + '.webp', coverSizes);
for (const name of ['shmagro-2', 'blcsoftsale-2', 'clicki-4', 'ddc-2', 'studyloop-3', 'yeahgrind-lesson'])
  editions.set('/screens/' + name + '.webp', exampleSizes);

export function screenPreview(src: string, width: number) {
  if (!editions.get(src)?.includes(width)) return src;
  return src.replace('/screens/', '/screens/previews/').replace('.webp', '-' + width + '.webp');
}

export function screenSources(src: string) {
  const sizes = editions.get(src);
  if (!sizes) return undefined;
  return [...sizes.map(width => screenPreview(src, width) + ' ' + width + 'w'), src + ' 1600w'].join(', ');
}
