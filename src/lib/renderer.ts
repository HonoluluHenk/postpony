import { Eta } from 'eta';
import * as path from 'path';

export const eta = new Eta({views: path.join(process.cwd(), 'src/views')});

export function render(template: string, data: object) {
  return eta.render(template, data);
}
