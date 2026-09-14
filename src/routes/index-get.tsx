import type { App } from '../app';
import { IndexPage } from './index';

export function handleIndexGet(app: App): Response {
  return app.html(app.render(<IndexPage {...app.view} />));
}
