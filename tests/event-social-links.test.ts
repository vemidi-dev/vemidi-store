import assert from "node:assert/strict";
import test from "node:test";
import { eventFacebookUrl, eventShareUrl, isEventFacebookUrl } from "@/lib/events/social-links";
import { defaultEventRegistrationSettings, parseEventRegistrationSettings } from "@/lib/events/registration-config";

test("Facebook event links only accept trusted HTTPS hosts", () => {
  for (const url of ["https://www.facebook.com/events/123", "https://www.facebook.com/share/abc/", "https://fb.me/e/abc"]) assert.equal(isEventFacebookUrl(url), true);
  for (const url of ["javascript:alert(1)", "http://facebook.com/events/1", "https://facebook.com.evil.test/", "https://user:pass@facebook.com/", "https://facebook.com:8080/"]) assert.equal(isEventFacebookUrl(url), false);
  assert.equal(eventFacebookUrl(null), undefined);
  assert.equal(eventFacebookUrl({ facebookEventUrl: "https://evil.test" }), undefined);
});

test("optional event Facebook setting survives parsing and can be cleared", () => {
  const url = "https://www.facebook.com/events/123";
  const parsed = parseEventRegistrationSettings({ ...defaultEventRegistrationSettings, facebookEventUrl: ` ${url} ` });
  assert.equal(parsed.error, undefined);
  assert.equal(parsed.settings.facebookEventUrl, url);
  assert.equal(eventFacebookUrl(parsed.settings), url);
  assert.equal(parseEventRegistrationSettings({ ...parsed.settings, facebookEventUrl: "" }).settings.facebookEventUrl, undefined);
  assert.match(parseEventRegistrationSettings({ ...parsed.settings, facebookEventUrl: "https://evil.test" }).error ?? "", /Facebook/);
  assert.match(parseEventRegistrationSettings({ ...parsed.settings, facebookEventUrl: 123 }).error ?? "", /Facebook/);
});

test("shared link uses the configured canonical domain, not the current browser", () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    process.env.NEXT_PUBLIC_SITE_URL = "https://vemidi-crafts.com";
    assert.equal(eventShareUrl("autumn-workshop"), "https://vemidi-crafts.com/sabitiya/autumn-workshop");
    assert.equal(new URL(eventShareUrl("test?preview=1#abc")).search, "");
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previous;
  }
});
