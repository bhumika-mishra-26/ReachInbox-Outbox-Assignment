'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Strike from '@tiptap/extension-strike';
import {
  Bold, Italic, Underline as UnderlineIcon,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Quote, Strikethrough,
  Undo, Redo, Paperclip
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onAttach?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded text-sm transition-colors ${
        isActive
          ? 'bg-gray-200 text-gray-800'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-gray-200 mx-0.5" />;
}

export default function RichTextEditor({ value, onChange, placeholder = 'Type Your Reply...', onAttach }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Keep bulletList, orderedList, listItem enabled (default)
        // Disable built-in strike so our separate Strike extension takes over
        strike: false,
        // Ensure heading is on so TextAlign can target it
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Strike,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'min-h-[200px] px-4 py-3 text-sm text-gray-700 focus:outline-none leading-relaxed',
        'data-placeholder': placeholder,
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Body area */}
      <EditorContent editor={editor} />

      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-0.5 px-3 py-2 border-t border-gray-100 bg-gray-50/50">
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo size={13} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo size={13} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold size={13} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <Italic size={13} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline"
        >
          <UnderlineIcon size={13} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough size={13} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Align Left"
        >
          <AlignLeft size={13} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Align Center"
        >
          <AlignCenter size={13} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Align Right"
        >
          <AlignRight size={13} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List size={13} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered size={13} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Quote"
        >
          <Quote size={13} />
        </ToolbarButton>

        {onAttach && (
          <>
            <Divider />
            <div className="relative">
              <input
                type="file"
                multiple
                onChange={onAttach}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <ToolbarButton onClick={() => {}} title="Attach Files">
                <Paperclip size={13} />
              </ToolbarButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
