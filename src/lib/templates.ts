import { Eta } from 'eta';
import config from '../config';
import { compiledTemplateBodies } from './generated/eta-templates';

// ponytail: disk loading assumes the process runs from the repo root (local
// dev). A packaged/deployed Node build would need the templates copied into
// dist; out of scope for this Workers-prep step, which keeps dev unchanged.
const VIEWS_DIR = process.cwd() + '/src/routes';

function buildInMemoryEta(): Eta {
  // The default `Eta` forces filesystem `readFile`/`resolvePath`. Nulling them
  // switches rendering to the in-memory template cache only — no `node:fs`
  // access. Required for runtimes without a filesystem (Cloudflare Workers).
  const eta = new Eta();
  // The node `Eta` types `readFile`/`resolvePath` as non-null; the browser
  // build leaves them null, which is exactly the in-memory behaviour we want.
  const fsless = eta as unknown as { readFile: null; resolvePath: null };
  fsless.readFile = null;
  fsless.resolvePath = null;
  for (const [name, body] of Object.entries(compiledTemplateBodies)) {
    // ponytail: the artifact stores precompiled function *sources*, not live
    // functions, so it stays a plain JSON module (no `node:fs`, serialisable,
    // bundleable). We rebuild the function at module load via `new Function`;
    // the only consumer is this trusted build artifact, never untrusted input.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval -- reconstructing precompiled template functions from a trusted build artifact.
    const template = new Function('it', 'options', body) as unknown as Parameters<typeof eta.loadTemplate>[1];
    eta.loadTemplate(name, template);
  }
  return eta;
}

const inMemoryEta = buildInMemoryEta();

let diskEta: Eta | null = null;

function getDiskEta(): Eta {
  diskEta ??= new Eta({ views: VIEWS_DIR });
  return diskEta;
}

export function useInMemoryTemplates(): boolean {
  const source = config.get('template-source');
  if (source === 'memory') return true;
  if (source === 'disk') return false;
  // ponytail: no Node `process` => a filesystem-less runtime (Cloudflare Workers).
  // The Workers build must externalize/bundle eta's browser entry so this module
  // never pulls in node:fs; upgrade when the deploy target is wired.
  return typeof process === 'undefined' || !process.versions.node;
}

export function selectEta(): Eta {
  return useInMemoryTemplates() ? inMemoryEta : getDiskEta();
}
