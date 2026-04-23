/**
 * Tiny safe Markdown renderer for AI report output.
 * Supports headings (#, ##, ###), bullet lists, bold (**text**), italics (*text*), and paragraphs.
 * No HTML injection: every node is constructed via React.
 */
import { Fragment } from 'react';

function inline(text: string): React.ReactNode {
  // bold then italic — simple non-greedy
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/;
  while (remaining.length > 0) {
    const m = remaining.match(pattern);
    if (!m || m.index == null) {
      parts.push(<Fragment key={key++}>{remaining}</Fragment>);
      break;
    }
    if (m.index > 0) parts.push(<Fragment key={key++}>{remaining.slice(0, m.index)}</Fragment>);
    const tok = m[0];
    if (tok.startsWith('**')) {
      parts.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith('`')) {
      parts.push(<code key={key++} className="font-mono text-[11px] bg-muted px-1 rounded">{tok.slice(1, -1)}</code>);
    } else {
      parts.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    }
    remaining = remaining.slice(m.index + tok.length);
  }
  return <>{parts}</>;
}

export function SimpleMarkdown({ source }: { source: string }) {
  const lines = source.split(/\r?\n/);
  const out: React.ReactNode[] = [];
  let listBuf: string[] = [];
  const flushList = (key: number) => {
    if (listBuf.length === 0) return;
    out.push(
      <ul key={`ul-${key}`} className="list-disc pl-5 space-y-0.5 text-sm">
        {listBuf.map((li, i) => (
          <li key={i}>{inline(li)}</li>
        ))}
      </ul>,
    );
    listBuf = [];
  };
  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (/^\s*[-*]\s+/.test(line)) {
      listBuf.push(line.replace(/^\s*[-*]\s+/, ''));
      return;
    }
    flushList(i);
    if (line.startsWith('### ')) {
      out.push(<h4 key={i} className="text-sm font-semibold mt-3">{inline(line.slice(4))}</h4>);
    } else if (line.startsWith('## ')) {
      out.push(<h3 key={i} className="text-sm font-bold mt-3 text-primary">{inline(line.slice(3))}</h3>);
    } else if (line.startsWith('# ')) {
      out.push(<h2 key={i} className="text-base font-bold mt-3">{inline(line.slice(2))}</h2>);
    } else if (line.trim() === '') {
      out.push(<div key={i} className="h-1.5" />);
    } else {
      out.push(<p key={i} className="text-sm leading-relaxed">{inline(line)}</p>);
    }
  });
  flushList(lines.length);
  return <div data-testid="simple-markdown" className="space-y-1">{out}</div>;
}