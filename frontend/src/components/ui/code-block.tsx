"use client"

import { useState } from 'react';
import { ChevronRight, Copy, Check, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MarkdownRenderer } from './markdown-renderer';

interface CodeBlockProps {
  code: {
    language: string;
    content: string;
  };
}

export const CodeBlock = ({ code }: CodeBlockProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(code.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const lineCount = code.content.split('\n').length;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden text-sm transition-all duration-300 hover:shadow-lg">
      <div className="flex flex-col">
        {/* Collapsible Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gray-50 border border-gray-100 shadow-sm">
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              </motion.div>
            </div>
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-[10px] font-bold tracking-[0.12em] text-gray-400 uppercase font-mono leading-none">
                {code.language}
              </span>
              <div className="flex items-center gap-1">
                <Hash className="w-2.5 h-2.5 text-gray-300" />
                <span className="text-[11px] text-gray-400 font-medium font-sans">
                  {lineCount} {lineCount === 1 ? 'line' : 'lines'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              copyCode();
            }}
            className="group/copy flex items-center gap-2 px-2.5 py-1.5 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 rounded-lg transition-all duration-200"
            title="Copy code"
          >
            <AnimatePresence mode="wait">
              {isCopied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <span className="text-[10px] font-bold text-emerald-500 font-sans">Copied!</span>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <span className="text-[10px] font-bold text-gray-400 group-hover/copy:text-gray-600 transition-colors font-sans">Copy</span>
                  <Copy className="w-3.5 h-3.5 text-gray-300 group-hover/copy:text-gray-500 transition-colors" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </button>

        {/* Code Content */}
        <AnimatePresence>
          {(
            <motion.div
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="overflow-hidden bg-[#0A0A0A] border-t border-gray-100"
              style={{ height: isExpanded ? "auto" : 0 }}
            >
              <div className="relative group/code min-h-[60px]">
                {/* Decorative dots */}
                <div className="absolute top-3 left-4 flex gap-1.5 z-10">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/10 border border-red-500/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/10 border border-amber-500/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20" />
                </div>

                <div className="pt-8 px-4 pb-4">
                  <MarkdownRenderer type="dark">
                    {`\`\`\`${code.language}\n${code.content}`}
                  </MarkdownRenderer>
                </div>
              </div>
            </motion.div>

          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
