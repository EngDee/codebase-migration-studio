import { getCookie, setCookie, getRequestUrl, setResponseHeader } from "@tanstack/react-start/server";
import { guestSessionHash, newGuestToken, validGuestToken } from "./guest-rules";
export async function guestSession(create = false) {
  setResponseHeader("Cache-Control", "no-store");
  let token = getCookie("ccak_guest_shop");
  if (!validGuestToken(token)) {
    if (!create) throw new Error("Your private order session is unavailable. Open this order in the browser used at checkout.");
    token = newGuestToken();
    setCookie("ccak_guest_shop", token, { httpOnly: true, secure: getRequestUrl().protocol === "https:", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 90 });
  }
  return guestSessionHash(token);
}