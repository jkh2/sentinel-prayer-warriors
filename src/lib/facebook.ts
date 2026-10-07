// Facebook stays hidden until its login is switched on in Supabase and NEXT_PUBLIC_FACEBOOK_LOGIN=on is set.
// Lives outside the "use client" sign-in buttons so server pages read the real value, not a client reference.
export const FACEBOOK_ON = process.env.NEXT_PUBLIC_FACEBOOK_LOGIN === "on";
