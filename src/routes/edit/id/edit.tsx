import type { JSX } from 'hono/jsx/jsx-runtime';
import { raw } from 'hono/utils/html';
import type { ViewContext } from '../../../app';
import type { Postponement } from '../../../lib/models';
import { matchUpLine } from '../../../lib/postponement';
import { pageLayout } from '../../layouts/main';
import { StatusAnnouncement } from '../../partials/status-announcement';
import { inviteLinkLabels } from './invite-link-labels';
import { GenerateForm, ProposedDatesRail, type EditGridProps } from './proposed-dates-section';
import { StatusChip } from './status-chip';
import { TeamSection } from './team-section';

export interface EditPageProps extends ViewContext, EditGridProps {
  title?: string;
  session: Postponement;
  organizerPassword?: string;
  /** Original match datetime in the locale's Intl reading format (page heading). */
  proposedDateTimeDisplay?: string;
  /** Original match datetime in the locale's input token format (add-date prefill). */
  proposedDateTime?: string;
  globalError?: string;
}

interface InviteLinksProps {
  baseUrl: string;
  session: Postponement;
  t: ViewContext['t'];
}

function InviteLinks(props: InviteLinksProps): JSX.Element {
  const homeLink = `${props.baseUrl}/join/${props.session.id}/home?token=${props.session.invitationPassword}`;
  const awayLink = `${props.baseUrl}/join/${props.session.id}/away?token=${props.session.invitationPassword}`;
  const labels = inviteLinkLabels(props.session, props.t);

  return (
    <div class="invite">
      <span>
        <a href={homeLink}>{labels.home}</a>
        <button
          class="copy-btn"
          data-copy={homeLink}
          data-copied-label={props.t('copied_to_clipboard')}
          aria-label={props.t('copy_to_clipboard')}
          type="button"
        >
          <i aria-hidden="true">content_copy</i>
        </button>
      </span>
      <span>
        <a href={awayLink}>{labels.away}</a>
        <button
          class="copy-btn"
          data-copy={awayLink}
          data-copied-label={props.t('copied_to_clipboard')}
          aria-label={props.t('copy_to_clipboard')}
          type="button"
        >
          <i aria-hidden="true">content_copy</i>
        </button>
      </span>
    </div>
  );
}

function SidebarStatus(props: { status: EditGridProps['status']; reopenCount: number; sessionId: string; t: ViewContext['t'] }): JSX.Element {
  const confirmed = props.status === 'Confirmed';
  return (
    <div class="side-block">
      <StatusChip status={props.status} t={props.t}/>
      {props.reopenCount > 0 ? <p class="muted">{props.t('reopened_count', {count: String(props.reopenCount)})}</p> : null}
      {confirmed ? (
        <form hx-post={`/edit/${props.sessionId}/reopen`} hx-target="#edit-grid" class="mt-4">
          <button type="submit" class="button outline">{props.t('reopen')}</button>
        </form>
      ) : null}
    </div>
  );
}

function EditGrid(props: EditPageProps): JSX.Element {
  const venueOptions = props.venues.length > 0
                       ? props.venues.map((venue) => (
      <option key={venue.venueNumber} value={venue.venueNumber}>
        ({venue.venueNumber}) - {venue.shortName}
      </option>
    ))
                       : Array.from({length: props.proposedDates.length === 0 ? 10 : props.venues.length}, (_, index) => (
                         <option key={index + 1} value={index + 1}>{index + 1}</option>
                       ));

  return (
    <div id="edit-grid" class="edit-grid">
      <ProposedDatesRail {...props} />
      <div class="edit-sidebar">
        <SidebarStatus status={props.status} reopenCount={props.reopenCount} sessionId={props.sessionId} t={props.t}/>
        <div class="side-block">
          <h3>{props.t('invite_link_label')}</h3>
          <InviteLinks baseUrl={props.baseUrl} session={props.session} t={props.t}/>
          <p class="muted">{props.t('organizer_join_note')}</p>
        </div>
        <details class="side-block side-details" open>
          <summary>{props.t('players')}</summary>
          <TeamSection
            sessionId={props.sessionId}
            players={props.session.players}
            organizerPlayers={props.organizerPlayers}
            ownTeamResults={props.ownTeamResults}
            t={props.t}
            playerName={props.playerName}
            teamId={props.teamId}
            error={props.playerError}
          />
        </details>
        <details class="side-block side-details" open>
          <summary>{props.t('proposed_dates_generate_section')}</summary>
          <GenerateForm
            sessionId={props.sessionId}
            t={props.t}
            locale={props.locale}
            venueOptions={venueOptions}
            times={props.times}
            invalidRow={props.generatorInvalidRow}
            error={props.generatorError}
            successCount={props.generatorSuccessCount}
            fromError={props.generatorFromError}
            toError={props.generatorToError}
            fromDate={props.fromDate}
            toDate={props.toDate}
          />
        </details>
      </div>
    </div>
  );
}

export function EditPage(props: EditPageProps): JSX.Element {
  const title = props.title ?? props.t('app_title');

  const headingTitle = (
    <span class="redesign-headline">
      <span>{matchUpLine(props.session.homeTeam ?? '', props.session.guestTeam ?? '')}</span>
      {props.proposedDateTimeDisplay ? (
        <>
          <span class="redesign-headline-sep">·</span>
          <span>{props.proposedDateTimeDisplay}</span>
        </>
      ) : null}
    </span>
  );

  const content = (
    <div class="edit-redesign">
      {props.organizerPassword ? (
        <div class="toast primary white-text top" role="status">
          <i aria-hidden="true">info</i>
          <div class="max">
            <p><strong>{props.t('postponement_created_success')}</strong></p>
            <p>
              {raw(props.t('organizer_password_label'))} <span class="password-display" translate="no">{props.organizerPassword}</span>
              <button
                class="copy-btn"
                data-copy={props.organizerPassword}
                data-copied-label={props.t('copied_to_clipboard')}
                aria-label={props.t('copy_organizer_password')}
                type="button"
              >
                <i aria-hidden="true">content_copy</i>
              </button>
            </p>
            <p>{props.t('save_password_warning')}</p>
          </div>
        </div>
      ) : null}

      <StatusAnnouncement message={props.statusMessage} isOob={props.isPartial}/>

      <EditGrid {...props} />
    </div>
  );

  return pageLayout(props, content, title, props.globalError, headingTitle);
}
