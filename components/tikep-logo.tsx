type TikepLogoProps = {
  showWordmark?: boolean;
  className?: string;
  iconClassName?: string;
};

export function TikepLogo({ showWordmark = true, className = "", iconClassName = "h-8 w-8" }: TikepLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-label="Tikep">
      <svg
        viewBox="0 0 48 48"
        className={`${iconClassName} shrink-0`}
        role="img"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="tikep-logo-gradient" x1="8" x2="40" y1="8" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4f46e5" />
            <stop offset="1" stopColor="#0891b2" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="14" fill="url(#tikep-logo-gradient)" />
        <path
          d="M13 13h22c3.2 0 5.5 2.2 5.5 5.2S38.2 23.4 35 23.4h-7.4V36h-7.2V23.4H13V13Zm7.4 6.1v-1.2h14.1c.8 0 1.3.5 1.3 1.2 0 .8-.5 1.2-1.3 1.2H20.4Z"
          fill="white"
        />
        <circle cx="36" cy="35" r="5" fill="#22c55e" />
      </svg>
      {showWordmark ? <span className="text-xl font-bold tracking-tight text-indigo-600">Tikep</span> : null}
    </span>
  );
}
