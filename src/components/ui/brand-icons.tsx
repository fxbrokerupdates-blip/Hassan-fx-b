import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({ viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true, ...p });

export const FacebookIcon = (p: P) => (
  <svg {...base(p)}><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4V10.5H7.8v3h2.6V21h3.1z" /></svg>
);
export const LinkedinIcon = (p: P) => (
  <svg {...base(p)}><path d="M6.9 8.8H3.8V20h3.1V8.8zM5.3 3.8a1.8 1.8 0 100 3.6 1.8 1.8 0 000-3.6zM20.2 13.6c0-3-1.6-4.9-4.2-4.9-1.4 0-2.4.8-2.8 1.5V8.8h-3V20h3.1v-5.6c0-1.5.3-2.9 2.1-2.9 1.8 0 1.8 1.7 1.8 3V20h3.1l-.1-6.4z" /></svg>
);
export const InstagramIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 7.3a4.7 4.7 0 100 9.4 4.7 4.7 0 000-9.4zm0 7.7a3 3 0 110-6 3 3 0 010 6zm6-7.9a1.1 1.1 0 11-2.2 0 1.1 1.1 0 012.2 0zM21 8c0-1.6-.4-3-1.5-4.1S17 2.4 15.4 2.3C13.8 2.2 10.2 2.2 8.6 2.3 7 2.4 5.6 2.8 4.5 3.9S3 6.4 2.9 8c-.1 1.6-.1 6.4 0 8 .1 1.6.4 3 1.6 4.1s2.5 1.5 4.1 1.6c1.6.1 6.4.1 8 0 1.6-.1 3-.4 4.1-1.6 1.1-1.1 1.5-2.5 1.5-4.1.1-1.6.1-6.4 0-8zm-2.1 9.8a3.2 3.2 0 01-1.8 1.8c-1.2.5-4.2.4-5.1.4s-3.9.1-5.1-.4a3.2 3.2 0 01-1.8-1.8c-.5-1.2-.4-4.2-.4-5.8s-.1-4.6.4-5.8a3.2 3.2 0 011.8-1.8c1.2-.5 4.2-.4 5.1-.4s3.9-.1 5.1.4a3.2 3.2 0 011.8 1.8c.5 1.2.4 4.2.4 5.8s.1 4.6-.4 5.8z" /></svg>
);
export const YoutubeIcon = (p: P) => (
  <svg {...base(p)}><path d="M21.6 7.2a2.6 2.6 0 00-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.6 2.6 0 002.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.6 2.6 0 001.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 001.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3L10 15z" /></svg>
);
export const TelegramIcon = (p: P) => (
  <svg {...base(p)}><path d="M21.4 4.2L2.9 11.3c-1.3.5-1.2 1.2-.2 1.5l4.7 1.5 1.8 5.6c.2.6.1.9.8.9.5 0 .7-.2 1-.5l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.3-.5-1.8-1.4-1.5zM8.7 14l9-5.7c.4-.3.8-.1.5.2l-7.7 7-.3 3.2L8.7 14z" /></svg>
);
export const XIcon = (p: P) => (
  <svg {...base(p)}><path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L2 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z" /></svg>
);

export const SOCIAL_ICONS: Record<string, (p: P) => React.JSX.Element> = {
  facebook: FacebookIcon, linkedin: LinkedinIcon, instagram: InstagramIcon, youtube: YoutubeIcon, telegram: TelegramIcon, x: XIcon,
};
