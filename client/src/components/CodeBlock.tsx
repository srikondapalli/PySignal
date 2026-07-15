import { useState } from "react";
import { Check, Copy } from "lucide-react";
import SyntaxHighlighter from "react-syntax-highlighter/dist/esm/prism-light";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import matlab from "react-syntax-highlighter/dist/esm/languages/prism/matlab";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("matlab", matlab);

interface CodeBlockProps {
  code: string;
  language?: "python" | "matlab";
  title?: string | null;
}

/**
 * Syntax-highlighted code block with a header bar and copy-to-clipboard button.
 */
export function CodeBlock({ code, language = "python", title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="group my-4 overflow-hidden rounded-lg border border-[#3a3f4b] bg-[#282c34] shadow-sm">
      <div className="flex items-center justify-between border-b border-[#3a3f4b] bg-[#21252b] px-4 py-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <span
            className={`inline-block h-2 w-2 shrink-0 rounded-full ${language === "matlab" ? "bg-orange-400" : "bg-emerald-400"}`}
          />
          <span className="truncate font-mono text-xs text-zinc-400">
            {title || (language === "matlab" ? "MATLAB" : "Python")}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-400 transition-colors duration-150 hover:bg-white/10 hover:text-zinc-100"
          aria-label="Copy code to clipboard">
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          background: "transparent",
          fontSize: "0.825rem",
          lineHeight: 1.65,
          padding: "1rem 1.25rem",
        }}
        codeTagProps={{ style: { fontFamily: "var(--font-mono)" } }}
        wrapLongLines={false}>
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
