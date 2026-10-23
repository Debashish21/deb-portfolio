// Copy, links, doodles and timings for the single-page site. Case studies live in content/projects/.

export const site = {
  name: "Debashish",
  role: "Product Owner",
  email: "hello@debashish.com",
  cvHref: "/Debashish-CV.pdf",
  linkedin: "https://www.linkedin.com/",
  github: "https://github.com/",
  signoff: "Bootstrapping ideas, one sprint at a time.",
};

export const hero = {
  eyebrow: "Product Owner",
  sub: "From an everyday annoyance to a product people want, with the customer, the tech and the numbers in view.",
  primary: "See what I've shipped",
  secondary: "Say hello",
};

export const footer = {
  eyebrow: "Your turn",
  headline: "Got something bugging you? Let's ship it.",
  hint: "Click the disc to write",
  placeholder: "Write your idea…",
  sent: "Opening your mail app ✓",
  hiring: "Hiring?",
  sayHi: "Just say hi",
  subject: "An idea worth shipping",
};

/** icon: optional 3D render (transparent PNG) that pops up in place of the drawing when the torch finds it. */
export type DoodleDef = { x: string; y: string; w: string; r: string; paths: string[]; note: string; icon?: string };

/** Everyday things the torch reveals in the hero, each with a question I've asked myself. */
export const doodles: DoodleDef[] = [
  { x: "60%", y: "17%", w: "72px", r: "-6deg", icon: "/hero3d/chat.png", note: "Could a social app be built to give you your attention back?",
    paths: ["M10 24 Q10 16 18 16 L52 16 Q60 16 60 24 L60 42 Q60 50 52 50 L30 50 L19 61 L21 50 L18 50 Q10 50 10 42 Z", "M20 28 L48 28", "M20 37 L40 37", "M58 16 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0", "M65 13 L65 19"] },
  { x: "85%", y: "22%", w: "82px", r: "8deg", icon: "/hero3d/receipt.png", note: "Money out isn't money spent. Why does every app pretend it is?",
    paths: ["M22 9 L58 8 L59 63 L54 68 L49 62 L44 68 L39 62 L34 68 L29 62 L24 68 L21 63 Z", "M29 19 L50 18", "M29 27 L46 27", "M29 35 L52 34", "M29 47 L38 47", "M44 47 L52 46", "M21 32 L33 37 L27 47"] },
  { x: "72%", y: "48%", w: "78px", r: "-4deg", icon: "/hero3d/bulb.png", note: "Good ideas rarely show up at the desk. Mine arrive in queues.",
    paths: ["M40 12 C26 12 18 22 20 34 C21 43 29 47 31 56 L49 56 C51 47 59 43 60 34 C62 22 54 12 40 12 Z", "M32 62 L48 62", "M34 68 L46 68", "M34 42 L37 35 L40 42 L43 35 L46 42", "M12 18 L6 14", "M68 18 L74 14", "M40 6 L40 2"] },
  { x: "92%", y: "60%", w: "86px", r: "10deg", icon: "/hero3d/headphones.png", note: "Why do lyrics live in another window, not where my eyes already are?",
    paths: ["M17 46 C15 20 65 20 63 46", "M11 44 Q11 41 15 41 L20 41 Q23 41 23 44 L23 60 Q23 63 20 63 L15 63 Q11 63 11 60 Z", "M57 44 Q57 41 60 41 L65 41 Q69 41 69 44 L69 60 Q69 63 65 63 L60 63 Q57 63 57 60 Z", "M62 22 L62 6 L72 4 L72 18", "M55 22 a3.5 3 0 1 0 7 0 a3.5 3 0 1 0 -7 0", "M65 18 a3.5 3 0 1 0 7 0 a3.5 3 0 1 0 -7 0"] },
  { x: "80%", y: "82%", w: "80px", r: "-8deg", icon: "/hero3d/calendar.png", note: "Why does a two-week sprint always feel like four days?",
    paths: ["M12 19 L66 18 L67 66 L13 67 Z", "M12 29 L66 29", "M25 12 L25 23", "M53 12 L53 23", "M19 41 L23 45 L30 37", "M37 41 L41 45 L48 37", "M19 56 L23 60 L30 52", "M38 52 L48 52 L48 61 L38 61 Z"] },
  { x: "61%", y: "80%", w: "70px", r: "5deg", icon: "/hero3d/mug.png", note: "How much caffeine is 'enough'? Still collecting data.",
    paths: ["M18 30 L60 30 L56 65 Q55 69 50 69 L28 69 Q23 69 22 65 Z", "M59 38 C71 38 71 55 57 55", "M30 22 C26 17 34 13 30 7", "M40 22 C36 17 44 13 40 7", "M50 22 C46 17 54 13 50 7"] },
  { x: "7%", y: "89%", w: "62px", r: "-10deg", icon: "/hero3d/sticky.png", note: "If everything's a priority, which note survives Friday?",
    paths: ["M14 14 L64 15 L65 51 L51 65 L15 64 Z", "M51 65 L51 52 L65 51", "M22 27 L52 26", "M22 35 L48 36", "M22 43 L38 43"] },
];

export const timings = {
  inkFadeMs: 1500,
  inkCapPx: 2400,
  flightMs: 1800,
  burnMs: 2400,
  spotlightPx: 240,
  doodleOpacity: 0.08,
  reducedDoodleOpacity: 0.18,
  roamTapMs: 4200,
  roamTouchMs: 4500,
  shipWhooshMs: 1150,
  /** Fraction of the whoosh at which "Ship it" is back in place (the 82% keyframe) */
  shipLandAt: 0.8,
  backToTopMs: 2000,
  /** Apple-style springs (SwiftUI response / dampingFraction). Discs: a touch of bounce. */
  discSpring: { response: 0.55, dampingFraction: 0.78 },
  /** The first-time "you can drag me" peek: a sideways kick in discs/second that the spring brings back */
  discPeekVelocity: 6,
  /** Page settling onto the projects: smooth, no overshoot */
  settleSpring: { response: 0.7, dampingFraction: 1 },
  /** How long scrolling must pause before the page settles */
  settleIdleMs: 160,
  trail: true,
};
