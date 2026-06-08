import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import { PluginKey } from '@tiptap/pm/state';
import { searchAction } from '@/components/search/actions';
import { InternalLinkList, type InternalLinkListHandle } from './internal-link-suggestion';
import type { SearchResult } from '@/lib/search';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Type "[[" in any RichTextEditor to autocomplete an internal link. Queries the
 * shared searchContent; selecting a result replaces "[[query" with an inline
 * <a href> — the same anchor a manual paste would produce.
 */
export const InternalLink = Extension.create({
  name: 'internalLink',

  addProseMirrorPlugins() {
    return [
      Suggestion<SearchResult>({
        editor: this.editor,
        char: '[[',
        pluginKey: new PluginKey('internalLink'),
        allowSpaces: false,
        startOfLine: false,

        items: async ({ query }) => {
          if (query.trim().length < 2) return [];
          const r = await searchAction(query);
          return [...r.brands, ...r.articles, ...r.authors].slice(0, 10);
        },

        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, `<a href="${props.url}">${escapeHtml(props.title)}</a> `)
            .run();
        },

        render: () => {
          let renderer: ReactRenderer<InternalLinkListHandle> | null = null;
          let wrapper: HTMLDivElement | null = null;

          const place = (rect: DOMRect | null | undefined) => {
            if (!wrapper || !rect) return;
            wrapper.style.position = 'absolute';
            wrapper.style.left = `${rect.left + window.scrollX}px`;
            wrapper.style.top = `${rect.bottom + window.scrollY + 4}px`;
            wrapper.style.zIndex = '60';
          };

          return {
            onStart: (props) => {
              renderer = new ReactRenderer(InternalLinkList, {
                props: { items: props.items, command: props.command },
                editor: props.editor,
              });
              wrapper = document.createElement('div');
              wrapper.appendChild(renderer.element);
              document.body.appendChild(wrapper);
              place(props.clientRect?.());
            },
            onUpdate: (props) => {
              renderer?.updateProps({ items: props.items, command: props.command });
              place(props.clientRect?.());
            },
            onKeyDown: (props) => {
              if (props.event.key === 'Escape') return false; // close, leave literal "[[query"
              return renderer?.ref?.onKeyDown(props) ?? false;
            },
            onExit: () => {
              renderer?.destroy();
              wrapper?.remove();
              renderer = null;
              wrapper = null;
            },
          };
        },
      }),
    ];
  },
});
