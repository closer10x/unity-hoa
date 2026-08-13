/**
 * The exact sentence somebody agrees to when they tick the text-message box.
 *
 * A constant, and stored on the row as text rather than referenced, because
 * consent is proved by what the person actually read. Change the wording here
 * and every future row records the new wording; the old rows keep theirs,
 * which is the whole point.
 */
export const SMS_CONSENT_TEXT =
  "I agree to receive text messages from Unity Grid Management about my " +
  "association account — dues reminders, maintenance and community notices. " +
  "Message and data rates may apply. Reply STOP to opt out at any time.";
