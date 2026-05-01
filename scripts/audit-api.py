"""Find API routes with zero non-self callers in the codebase."""
import subprocess
import os

routes = []
for root, dirs, files in os.walk('src/app/api'):
    for f in files:
        if f == 'route.ts':
            full = os.path.join(root, f).replace(os.sep, '/')
            api_path = full.replace('src/app', '').replace('/route.ts', '')
            routes.append(api_path)


def count_callers(api_path: str) -> tuple[int, list[str]]:
    static = api_path.split('[')[0].rstrip('/')
    if not static or static == '/api':
        return 0, []
    cmd = ['grep', '-rln', '--include=*.ts', '--include=*.tsx', static, 'src/']
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
    files = [f for f in result.stdout.strip().split('\n') if f and 'src/app/api' not in f]
    return len(files), files


results: list[tuple[int, str, list[str]]] = []
for api_path in routes:
    count, sample = count_callers(api_path)
    results.append((count, api_path, sample))

results.sort()
zeros = [r for r in results if r[0] == 0]

print('=== ZERO-CALLER ROUTES ===')
for _, path, _ in zeros:
    print(f'  {path}')
print(f'\nZero-caller: {len(zeros)} / {len(routes)}')
