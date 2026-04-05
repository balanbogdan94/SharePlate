import { spawnSync } from 'node:child_process';
import path from 'node:path';

const eslintBin = path.resolve(
	'node_modules',
	'.bin',
	process.platform === 'win32' ? 'eslint.cmd' : 'eslint',
);

const args = process.argv.slice(2);
const lintTargets = args.length > 0 ? args : ['src'];
const result = spawnSync(eslintBin, ['--max-warnings', '0', ...lintTargets], {
	stdio: 'inherit',
	env: {
		...process.env,
		STRICT_LINT: '1',
	},
});

if (typeof result.status === 'number') {
	process.exit(result.status);
}

process.exit(1);
