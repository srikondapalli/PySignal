import { Streamdown } from "streamdown";

/**
 * Renders lesson markdown content with the course prose styling.
 */
export function MarkdownText({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div className={`lesson-prose text-[0.95rem] text-foreground/90 ${className}`}>
      <Streamdown>{children}</Streamdown>
    </div>
  );
}
