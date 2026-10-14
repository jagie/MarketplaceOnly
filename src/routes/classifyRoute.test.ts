import { describe, expect, it } from 'vitest';
import { classifyRoute, pathSegments, type RouteClass } from './classifyRoute';

const FB = 'https://www.facebook.com';
const WEB = 'https://web.facebook.com';

function expectRoutes(cases: ReadonlyArray<readonly [string, RouteClass]>) {
  it.each(cases)('%s -> %s', (url, expected) => {
    expect(classifyRoute(url)).toBe(expected);
  });
}

describe('classifyRoute', () => {
  describe('feed', () => {
    expectRoutes([
      [`${FB}/`, 'feed'],
      [FB, 'feed'],
      [`${FB}/?sk=h_chr`, 'feed'],
      [`${FB}/?ref=logo`, 'feed'],
      [`${FB}/home.php`, 'feed'],
      [`${FB}/home.php?ref=bookmarks`, 'feed'],
      [`${FB}/stories/123456/`, 'feed'],
      [`${FB}/#notifications`, 'feed'],
    ]);
  });

  describe('reels', () => {
    expectRoutes([
      [`${FB}/reel/123456789`, 'reels'],
      [`${FB}/reel/123456789/?s=ifu`, 'reels'],
      [`${FB}/reels/`, 'reels'],
      [`${FB}/reels/create`, 'reels'],
    ]);
  });

  describe('watch', () => {
    expectRoutes([
      [`${FB}/watch`, 'watch'],
      [`${FB}/watch/`, 'watch'],
      [`${FB}/watch/live/`, 'watch'],
      // One shared video stays reachable.
      [`${FB}/watch/?v=123456`, 'other'],
      [`${FB}/watch/live/?v=123456&ref=share`, 'other'],
    ]);
  });

  describe('groups', () => {
    expectRoutes([
      [`${FB}/groups/`, 'groups'],
      [`${FB}/groups/feed/`, 'groups'],
      [`${FB}/groups/123456789/`, 'groups'],
      [`${FB}/groups/123456789/posts/987654321/`, 'groups'],
      [`${FB}/groups/joins/?nav_source=tab`, 'groups'],
      [`${FB}/groups`, 'groups'],
      [`${FB}/GROUPS/123/`, 'groups'],
      [`${FB}/%67roups/123/`, 'groups'],
      [`${FB}//groups//123`, 'groups'],
    ]);
  });

  describe('gaming and notifications', () => {
    expectRoutes([
      [`${FB}/gaming/`, 'gaming'],
      [`${FB}/gaming/feed/`, 'gaming'],
      [`${FB}/notifications`, 'notifications'],
      [`${FB}/notifications/`, 'notifications'],
      [`${FB}/notifications/?ref=bell`, 'notifications'],
    ]);
  });

  describe('marketplace', () => {
    expectRoutes([
      [`${FB}/marketplace/`, 'marketplace'],
      [`${FB}/marketplace`, 'marketplace'],
      [`${FB}/marketplace/item/123456789/`, 'marketplace'],
      [`${FB}/marketplace/item/123456789/?ref=search&referral_code=null`, 'marketplace'],
      [`${FB}/marketplace/seattle/search/?query=bike`, 'marketplace'],
      [`${FB}/marketplace/category/vehicles`, 'marketplace'],
      [`${FB}/marketplace/you/selling`, 'marketplace'],
      [`${FB}/marketplace/profile/123456/`, 'marketplace'],
      [`${FB}/commerce/listing/123456/`, 'marketplace'],
    ]);
  });

  describe('messenger', () => {
    expectRoutes([
      [`${FB}/messages/`, 'messenger'],
      [`${FB}/messages/t/123456789`, 'messenger'],
      [`${FB}/messages/e2ee/t/123456789`, 'messenger'],
      [`${FB}/messages/requests/`, 'messenger'],
    ]);
  });

  describe('always allowed', () => {
    expectRoutes([
      [`${FB}/login/`, 'always-allowed'],
      [`${FB}/login.php?next=%2Fgroups%2F`, 'always-allowed'],
      [`${FB}/login/identify/?ctx=recover`, 'always-allowed'],
      [`${FB}/logout.php`, 'always-allowed'],
      [`${FB}/checkpoint/?next`, 'always-allowed'],
      [`${FB}/two_step_verification/authentication/`, 'always-allowed'],
      [`${FB}/recover/initiate/`, 'always-allowed'],
      [`${FB}/settings/`, 'always-allowed'],
      [`${FB}/settings/?tab=privacy`, 'always-allowed'],
      [`${FB}/privacy/checkup/`, 'always-allowed'],
      [`${FB}/help/123/`, 'always-allowed'],
      [`${FB}/policies/cookies/`, 'always-allowed'],
      [`${FB}/dialog/oauth?client_id=1`, 'always-allowed'],
      [`${FB}/v19.0/dialog/oauth?client_id=1`, 'always-allowed'],
      [`${FB}/v2/dialog/share`, 'always-allowed'],
      [`${FB}/l.php?u=https%3A%2F%2Fexample.com`, 'always-allowed'],
      [`${FB}/r.php`, 'always-allowed'],
    ]);
  });

  describe('allowed areas (not toggles in v1)', () => {
    expectRoutes([
      [`${FB}/events/`, 'events'],
      [`${FB}/events/123456/`, 'events'],
      [`${FB}/pages/`, 'pages'],
      [`${FB}/pages/Some-Old-Page/123456`, 'pages'],
      [`${FB}/friends/`, 'friends'],
      [`${FB}/friends/requests`, 'friends'],
    ]);
  });

  describe('profiles and pages', () => {
    expectRoutes([
      [`${FB}/profile.php?id=100012345678`, 'profile-or-page'],
      [`${FB}/profile.php?id=100012345678&sk=about`, 'profile-or-page'],
      [`${FB}/zuck`, 'profile-or-page'],
      [`${FB}/zuck/`, 'profile-or-page'],
      [`${FB}/john.smith.123`, 'profile-or-page'],
      [`${FB}/zuck/photos`, 'profile-or-page'],
      [`${FB}/SomeBusiness-123456789/`, 'profile-or-page'],
      [`${FB}/people/Jane-Doe/100012345678/`, 'profile-or-page'],
      // Usernames that start with an area name are not that area.
      [`${FB}/groupsforgood`, 'profile-or-page'],
      [`${FB}/groups.of.friends`, 'profile-or-page'],
      [`${FB}/watchmojo`, 'profile-or-page'],
      [`${FB}/reelstudio`, 'profile-or-page'],
      [`${FB}/gamingnews`, 'profile-or-page'],
      [`${FB}/notificationsguy`, 'profile-or-page'],
      [`${FB}/marketplacedeals`, 'profile-or-page'],
      [`${FB}/messagesfromhome`, 'profile-or-page'],
      [`${FB}/homepage.php.fans`, 'profile-or-page'],
      // A Page's own reels and videos are part of that Page, not the Reels area.
      [`${FB}/somepage/reels/`, 'profile-or-page'],
      [`${FB}/somepage/videos/123`, 'profile-or-page'],
    ]);
  });

  describe('other (allowed, fail open)', () => {
    expectRoutes([
      [`${FB}/permalink.php?story_fbid=1&id=2`, 'other'],
      [`${FB}/story.php?story_fbid=1`, 'other'],
      [`${FB}/photo/?fbid=123`, 'other'],
      [`${FB}/photo.php?fbid=123`, 'other'],
      [`${FB}/search/top/?q=bike`, 'other'],
      [`${FB}/bookmarks/`, 'other'],
      [`${FB}/saved/`, 'other'],
      [`${FB}/games/`, 'other'],
      [`${FB}/somescript.php`, 'other'],
      [`${FB}/%E0%A4%A`, 'other'],
    ]);
  });

  describe('web.facebook.com', () => {
    expectRoutes([
      [`${WEB}/`, 'feed'],
      [`${WEB}/groups/123/`, 'groups'],
      [`${WEB}/marketplace/item/1/`, 'marketplace'],
      [`${WEB}/messages/t/1`, 'messenger'],
      [`${WEB}/zuck`, 'profile-or-page'],
    ]);
  });

  describe('hosts and inputs we never act on', () => {
    expectRoutes([
      ['https://m.facebook.com/groups/123', 'other'],
      ['https://facebook.com.evil.example/groups/123', 'other'],
      ['https://www.messenger.com/t/123', 'other'],
      ['https://example.com/groups/123', 'other'],
      ['https://accountscenter.facebook.com/', 'other'],
      ['not a url', 'other'],
      ['/groups/123', 'other'],
      ['', 'other'],
    ]);

    it('accepts URL objects', () => {
      expect(classifyRoute(new URL(`${FB}/groups/1`))).toBe('groups');
    });
  });
});

describe('pathSegments', () => {
  it('splits, decodes, lowercases, and drops empty segments', () => {
    expect(pathSegments('/Groups//%31%32%33/')).toEqual(['groups', '123']);
  });

  it('keeps malformed encodings as raw text instead of throwing', () => {
    expect(pathSegments('/%E0%A4%A/')).toEqual(['%e0%a4%a']);
  });
});
