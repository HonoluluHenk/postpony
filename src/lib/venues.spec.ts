import { describe, expect, it } from 'vitest';
import type { Venue } from './models';
import { defaultVenueNumber, resolveVenue, venueShortName } from './venues';

function aVenue(overrides: Partial<Venue> = {}): Venue {
  return {
    venueNumber: 1,
    name: 'Turnhalle orange, UG, Schule Dennigkofen',
    shortName: 'Turnhalle orange',
    address: 'Dennigkofenweg 169',
    postalCode: '3072',
    city: 'Ostermundigen',
    ...overrides,
  };
}

describe('venues', () => {
  describe('defaultVenueNumber', () => {
    it('treats an absent venue number as venue 1', () => {
      expect(defaultVenueNumber(undefined))
        .toBe(1);
    });

    it('keeps a stored venue number', () => {
      expect(defaultVenueNumber(3))
        .toBe(3);
    });
  });

  describe('resolveVenue', () => {
    const venues = [
      aVenue(),
      aVenue({venueNumber: 2, name: 'Turnhalle grün', shortName: 'Turnhalle grün'}),
    ];

    it('looks a venue up by its number', () => {
      expect(resolveVenue(2, venues)?.name)
        .toBe('Turnhalle grün');
    });

    it('resolves an absent venue number to venue 1', () => {
      expect(resolveVenue(undefined, venues)?.shortName)
        .toBe('Turnhalle orange');
    });

    it('returns undefined when no venue matches', () => {
      expect(resolveVenue(4, venues))
        .toBeUndefined();
    });

    it('returns undefined for an absent venue number when venue 1 is unknown', () => {
      expect(resolveVenue(undefined, [aVenue({venueNumber: 2})]))
        .toBeUndefined();
    });
  });

  describe('venueShortName', () => {
    it('returns the resolved venue short name', () => {
      expect(venueShortName(undefined, [aVenue()]))
        .toBe('Turnhalle orange');
    });

    it('returns undefined when no venue matches', () => {
      expect(venueShortName(9, [aVenue()]))
        .toBeUndefined();
    });
  });
});
