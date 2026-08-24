import type { JSX } from 'hono/jsx/jsx-runtime';
import type { ViewContext } from '../../app';
import type { MappedErrors } from '../../lib/map-validation-to-errors';
import { pageLayout } from '../layouts/main';

export interface CreateFormValues {
  homeTeam?: string;
  guestTeam?: string;
  originalMatchDateTime?: string;
}

export interface CreatePageProps extends ViewContext {
  title?: string;
  changeMode?: boolean;
  sessionId?: string;
  ownerPassword?: string;
  values?: CreateFormValues;
  errors?: MappedErrors;
  globalError?: string;
}

interface CreateFieldProps {
  t: ViewContext['t'];
  id: string;
  name: 'homeTeam' | 'guestTeam' | 'originalMatchDateTime';
  labelKey: 'home_team' | 'guest_team' | 'original_match_date_time_label';
  value: string;
  error?: string;
  placeholder?: string;
  lang?: string;
  autocomplete?: string;
}

function CreateField(props: CreateFieldProps): JSX.Element {
  const invalid = !!props.error;
  return (
    <div class={`field label border fill${invalid ? ' invalid' : ''}`}>
      <input
        type="text"
        id={props.id}
        name={props.name}
        required
        aria-required="true"
        value={props.value}
        placeholder={props.placeholder}
        lang={props.lang}
        autocomplete={props.autocomplete}
        aria-invalid={invalid ? 'true' : undefined}
        aria-describedby={invalid ? `${props.id}-error` : undefined}
      />
      <label for={props.id}>{props.t(props.labelKey)}</label>
      <span id={`${props.id}-error`} class="error" role="alert">{props.error ?? ''}</span>
    </div>
  );
}

export function CreatePage(props: CreatePageProps): JSX.Element {
  const changeMode = !!props.changeMode;
  const title = props.title ?? (changeMode
    ? props.t('change_match_details_title')
    : props.t('create_postponement_title'));

  const fieldError = (name: 'homeTeam' | 'guestTeam' | 'originalMatchDateTime'): string | undefined =>
    props.errors?.fields[name];

  const content = (
    <section id="create-section" class="padding small-round surface-variant">
      <header>
        <h2>{title}</h2>
      </header>

      {changeMode ? (
        <p>
          <a href={`/create/scrape?sessionId=${props.sessionId}&ownerPassword=${props.ownerPassword}`}>
            {props.t('change_via_scrape')}
          </a>
        </p>
      ) : null}

      <form action="/create" method="post">
        {changeMode ? (
          <>
            <input type="hidden" name="sessionId" value={props.sessionId} />
            <input type="hidden" name="ownerPassword" value={props.ownerPassword} />
          </>
        ) : null}
        <CreateField
          t={props.t}
          id="home-team"
          name="homeTeam"
          labelKey="home_team"
          value={props.values?.homeTeam ?? ''}
          error={fieldError('homeTeam')}
        />
        <CreateField
          t={props.t}
          id="guest-team"
          name="guestTeam"
          labelKey="guest_team"
          value={props.values?.guestTeam ?? ''}
          error={fieldError('guestTeam')}
        />
        <CreateField
          t={props.t}
          id="original-match-date-time"
          name="originalMatchDateTime"
          labelKey="original_match_date_time_label"
          value={props.values?.originalMatchDateTime ?? ''}
          error={fieldError('originalMatchDateTime')}
          placeholder={props.inputFormat}
          lang={props.locale}
          autocomplete="off"
        />
        <div class="right-align">
          <button type="submit">{changeMode ? props.t('save_changes') : props.t('create_button')}</button>
        </div>
      </form>

      {changeMode ? (
        <div class="right-align">
          <a href={`/edit/${props.sessionId}?ownerPassword=${props.ownerPassword}`}>
            {props.t('back_to_postponement')}
          </a>
        </div>
      ) : null}
    </section>
  );

  return pageLayout(props, content, title, props.globalError);
}
