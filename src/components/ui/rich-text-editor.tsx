'use client';

import { forwardRef, useImperativeHandle, useState, type ReactNode } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { InternalLink } from './internal-link-extension';
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered, Link as LinkIcon,
  Quote, Code, Code2, Image as ImageIcon, Table as TableIcon, Undo, Redo, Code as CodeBlockIcon,
} from 'lucide-react';

export type RichTextEditorHandle = { setContent: (html: string) => void; getHTML: () => string };

type Props = {
  name: string;
  defaultValue: string;
  placeholder?: string;
  onChange?: (html: string) => void;
  onImageUpload?: (file: File) => Promise<string | null>;
};

const CONTENT_CLASS =
  'min-h-64 max-w-none px-3 py-2 text-sm leading-relaxed focus:outline-none ' +
  '[&_p]:my-2 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold ' +
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 ' +
  '[&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground ' +
  '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs ' +
  '[&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:text-xs [&_img]:max-w-full [&_img]:rounded ' +
  '[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:bg-muted [&_th]:p-2 ' +
  '[&_.is-editor-empty:first-child::before]:text-muted-foreground [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:h-0';

function Btn({ onClick, active, disabled, title, children }: { onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex size-8 items-center justify-center rounded-md text-sm hover:bg-muted disabled:opacity-40 ${active ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, onImage }: { editor: Editor; onImage?: () => void }) {
  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', prev ?? 'https://');
    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b p-1">
      <Btn title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="size-4" /></Btn>
      <Btn title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="size-4" /></Btn>
      <Btn title="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="size-4" /></Btn>
      <Btn title="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="size-4" /></Btn>
      <Btn title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="size-4" /></Btn>
      <Btn title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="size-4" /></Btn>
      <Btn title="Link" active={editor.isActive('link')} onClick={setLink}><LinkIcon className="size-4" /></Btn>
      <Btn title="Blockquote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="size-4" /></Btn>
      <Btn title="Code block" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><CodeBlockIcon className="size-4" /></Btn>
      <Btn title="Inline code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}><Code2 className="size-4" /></Btn>
      {onImage ? <Btn title="Insert image" onClick={onImage}><ImageIcon className="size-4" /></Btn> : null}
      <Btn title="Insert table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon className="size-4" /></Btn>
      <span className="mx-1 h-5 w-px bg-border" />
      <Btn title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo className="size-4" /></Btn>
      <Btn title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo className="size-4" /></Btn>
      <span className="ml-auto" />
      <Code className="size-4 text-muted-foreground" />
    </div>
  );
}

export const RichTextEditor = forwardRef<RichTextEditorHandle, Props>(function RichTextEditor(
  { name, defaultValue, placeholder, onChange, onImageUpload },
  ref,
) {
  const [html, setHtml] = useState(defaultValue || '');
  const [source, setSource] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, HTMLAttributes: { rel: 'noopener', target: '_blank' } } }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: placeholder ?? 'Write the article…' }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      InternalLink,
    ],
    content: defaultValue || '',
    editorProps: { attributes: { class: CONTENT_CLASS } },
    onUpdate: ({ editor }) => {
      const h = editor.getHTML();
      setHtml(h);
      onChange?.(h);
    },
  });

  useImperativeHandle(
    ref,
    () => ({
      setContent: (h: string) => {
        editor?.commands.setContent(h);
        setHtml(h);
        onChange?.(h);
      },
      getHTML: () => editor?.getHTML() ?? html,
    }),
    [editor, html, onChange],
  );

  const pickImage = () => {
    if (!onImageUpload) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/gif';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      const url = await onImageUpload(f);
      if (url) editor?.chain().focus().setImage({ src: url, alt: '' }).run();
    };
    input.click();
  };

  const toggleSource = () => {
    if (source) {
      // returning to the editor — push the (possibly hand-edited) HTML back in
      editor?.commands.setContent(html);
    }
    setSource((s) => !s);
  };

  return (
    <div className="rounded-lg border focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      <input type="hidden" name={name} value={html} />
      <div className="flex items-center justify-between border-b">
        {editor && !source ? <Toolbar editor={editor} onImage={onImageUpload ? pickImage : undefined} /> : <div className="p-2 text-xs text-muted-foreground">HTML source</div>}
        <button type="button" onClick={toggleSource} className="mr-2 shrink-0 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted">
          {source ? 'Editor' : 'Source'}
        </button>
      </div>

      {source ? (
        <textarea
          value={html}
          onChange={(e) => {
            setHtml(e.target.value);
            onChange?.(e.target.value);
          }}
          rows={16}
          className="w-full resize-y px-3 py-2 font-mono text-xs focus:outline-none"
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
});
