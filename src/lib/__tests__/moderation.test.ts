import { describe, expect, it } from "vitest";
import { isCrisis, isHeld, screenText } from "../moderation";

describe("screenText", () => {
  it.each([
    ["Please pray for my mother's surgery on Thursday.", []],
    ["We are $500 short on rent this month, pray for provision", []],
    ["Call me at 555-123-4567", ["contact-info"]],
    ["email me jane@example.com", ["contact-info", "link"]],
    ["see www.example.org for details", ["link"]],
    ["send money to my cashapp $janehelp", ["money"]],
    ["please donate to my gofundme", ["money"]],
    ["I want to end my life", ["crisis-self"]],
    ["I don't want to live anymore", ["crisis-self"]],
    ["he hits me when he drinks", ["crisis-abuse"]],
  ])("%s", (text, flags) => {
    expect(screenText(text)).toEqual(flags);
  });

  it("holds money and contact info but not crisis", () => {
    expect(isHeld(["money"])).toBe(true);
    expect(isHeld(["crisis-self"])).toBe(false);
    expect(isCrisis(["crisis-abuse"])).toBe(true);
  });
});
