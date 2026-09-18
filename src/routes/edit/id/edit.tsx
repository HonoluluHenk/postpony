import type { JSX } from 'hono/jsx/jsx-runtime';
import type { ViewContext } from '../../../app';
import type { Postponement, Team } from '../../../lib/models';
import { matchUpLine } from '../../../lib/postponement';
import { pageLayout } from '../../layouts/main';
import { StatusAnnouncement } from '../../partials/status-announcement';
import { OrganizerWorkflowInstructions } from '../../partials/workflow-instructions';
import { withOrganizerPassword } from './edit-auth';
import { inviteLinkLabels } from './invite-link-labels';
import { GenerateForm, ProposedDatesRail, type EditGridProps } from './proposed-dates-section';
import { StatusChip } from './status-chip';
import { TeamSection } from './team-section';

export interface EditPageProps extends ViewContext, EditGridProps {
  title?: string;
  session: Postponement;
  /** Original match datetime in the locale's Intl reading format (page heading). */
  proposedDateTimeDisplay?: string;
  /** The URL the organizer should bookmark to get back to this page. */
  currentUrl?: string;
  globalError?: string;
}

interface InviteLinksProps {
  baseUrl: string;
  session: Postponement;
  t: ViewContext['t'];
}

function InviteLinks(props: InviteLinksProps): JSX.Element {
  const {session, baseUrl, t} = props;
  const labels = inviteLinkLabels(session, t);

  const joinLink = (side: Team): string =>
    `${baseUrl}/join/${session.id}/${side}?token=${side === 'home'
                                                   ? session.homePlayerPassword
                                                   : session.awayPlayerPassword}`;

  const links: {
    href: string;
    label: string
  }[] = [
    {href: joinLink(session.organizerTeam), label: labels.own},
    {
      href: `${baseUrl}/opponent/${session.id}?opponentCaptainPassword=${session.opponentCaptainPassword}`,
      label: labels.opponentCaptain,
    },
  ];

  return (
    <div class="invite">
      {links.map((link) => (
        <span key={link.href}>
          <a href={link.href}>{link.label}</a>
          <button
            class="copy-btn"
            data-copy={link.href}
            data-copied-label={props.t('copied_to_clipboard')}
            aria-label={props.t('copy_to_clipboard')}
            type="button"
          >
            <i aria-hidden="true">content_copy</i>
          </button>
        </span>
      ))}
    </div>
  );
}

function SidebarStatus(props: {
  status: EditGridProps['status'];
  reopenCount: number;
  sessionId: string;
  t: ViewContext['t'];
  organizerPassword?: string
}): JSX.Element {
  const confirmed = props.status === 'Confirmed';
  return (
    <div class="side-block">
      <StatusChip status={props.status} t={props.t}/>
      {props.reopenCount > 0
       ? <p class="muted">{props.t('reopened_count', {count: String(props.reopenCount)})}</p>
       : null}
      {confirmed ? (
        <form hx-post={withOrganizerPassword(`/edit/${props.sessionId}/reopen`, props.organizerPassword)}
              hx-target="#edit-grid" class="mt-4">
          <button type="submit" class="button outline">{props.t('reopen')}</button>
        </form>
      ) : null}
    </div>
  );
}

export function EditGrid(props: EditPageProps): JSX.Element {
  const venueOptions = props.venues.length > 0
                       ? props.venues.map((venue) => (
      <option key={venue.venueNumber} value={venue.venueNumber}>
        ({venue.venueNumber}) - {venue.shortName}
      </option>
    ))
                       : Array.from({length: props.proposedDates.length === 0 ? 10 : props.venues.length}, (
      _,
      index,
    ) => (
      <option key={index + 1} value={index + 1}>{index + 1}</option>
    ));

  return (
    <div id="edit-grid" class="edit-grid">
      <ProposedDatesRail {...props} />
      <div class="edit-sidebar">
        <SidebarStatus status={props.status} reopenCount={props.reopenCount} sessionId={props.sessionId} t={props.t}
                       organizerPassword={props.organizerPassword}/>
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
            organizerPassword={props.organizerPassword}
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
            organizerPassword={props.organizerPassword}
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
      {!props.isPartial ? (
        <div class="toast primary white-text top" role="status">
          <i aria-hidden="true">info</i>
          <div class="max">
            <p><strong>{props.t('bookmark_edit_title')}</strong></p>
            <p>{props.t('bookmark_edit_hint')}</p>
            <p>
              {props.t('copy_edit_url_label')}
              <button
                class="copy-btn"
                data-copy={props.currentUrl ?? props.baseUrl}
                data-copied-label={props.t('copied_to_clipboard')}
                aria-label={props.t('copy_edit_url')}
                type="button"
              >
                <i aria-hidden="true">content_copy</i>
              </button>
            </p>
          </div>
        </div>
      ) : null}

      <StatusAnnouncement message={props.statusMessage} isOob={props.isPartial}/>

      <OrganizerWorkflowInstructions
        t={props.t}
        confirmed={props.session.status === 'Confirmed'}
        tip={props.t('workflow_sort_tip')}
      />

      <EditGrid {...props} />
    </div>
  );

  return pageLayout(props, content, title, props.globalError, headingTitle);
}
