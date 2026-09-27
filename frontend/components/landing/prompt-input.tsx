"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const EXAMPLE_PROMPTS = [
  "Find me jobs that are hiring freshers of computer science and engineering in bangalore",
  "Get me the latest research papers on quantum computing from arxiv",
  "Collect pricing data for SaaS project management tools",
  "Gather competitor analysis for AI-powered code review platforms",
];

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  isLoading?: boolean;
}

export function PromptInput({ onSubmit, isLoading = false }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>(undefined);

  // Typewriter effect for placeholder
  useEffect(() => {
    if (isFocused || prompt.length > 0) return;

    const target = EXAMPLE_PROMPTS[placeholderIndex];
    let charIndex = 0;

    const typeChar = () => {
      if (charIndex <= target.length) {
        setDisplayedPlaceholder(target.slice(0, charIndex));
        charIndex++;
        typingTimeoutRef.current = setTimeout(typeChar, 30 + Math.random() * 40);
      } else {
        setIsTyping(false);
        typingTimeoutRef.current = setTimeout(() => {
          // Erase
          let eraseIndex = target.length;
          const eraseChar = () => {
            if (eraseIndex >= 0) {
              setDisplayedPlaceholder(target.slice(0, eraseIndex));
              eraseIndex--;
              typingTimeoutRef.current = setTimeout(eraseChar, 15);
            } else {
              setPlaceholderIndex((prev) => (prev + 1) % EXAMPLE_PROMPTS.length);
            }
          };
          eraseChar();
        }, 3000);
      }
    };

    typeChar();
    return () => clearTimeout(typingTimeoutRef.current);
  }, [placeholderIndex, isFocused, prompt.length]);

  const handleSubmit = () => {
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        {/* Glow effect behind input */}
        <div
          className={cn(
            "absolute -inset-1 rounded-2xl opacity-0 transition-opacity duration-500 blur-xl",
            isFocused
              ? "bg-gradient-to-r from-cyan/20 via-violet/20 to-cyan/20 opacity-100"
              : "bg-gradient-to-r from-cyan/10 via-violet/10 to-cyan/10"
          )}
        />

        {/* Input container */}
        <div
          className={cn(
            "relative rounded-2xl transition-all duration-500",
            "bg-card-solid border",
            isFocused
              ? "border-cyan/40 shadow-[0_0_30px_rgba(0,240,255,0.15)]"
              : "border-border-subtle hover:border-border-glow/50"
          )}
        >
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={isFocused ? "Describe what data you need..." : displayedPlaceholder}
            rows={3}
            className={cn(
              "w-full bg-transparent px-6 py-5 pr-14",
              "text-text-primary text-lg font-body",
              "placeholder:text-text-muted/60",
              "resize-none outline-none",
              "rounded-2xl"
            )}
          />

          {/* Submit button */}
          <div className="absolute right-4 bottom-4">
            <motion.button
              onClick={handleSubmit}
              disabled={!prompt.trim() || isLoading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl",
                "transition-all duration-300",
                prompt.trim() && !isLoading
                  ? "bg-gradient-to-r from-cyan to-violet text-void shadow-lg shadow-cyan/25"
                  : "bg-elevated text-text-muted"
              )}
            >
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, rotate: 0 }}
                    animate={{ opacity: 1, rotate: 360 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Loader2 className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="arrow"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 5 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ArrowRight className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        {/* Keyboard shortcut hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="mt-3 text-center text-xs text-text-muted"
        >
          Press{" "}
          <kbd className="px-1.5 py-0.5 rounded border border-border-subtle bg-elevated text-text-secondary text-[10px] font-mono">
            Enter
          </kbd>{" "}
          to run &middot;{" "}
          <kbd className="px-1.5 py-0.5 rounded border border-border-subtle bg-elevated text-text-secondary text-[10px] font-mono">
            Shift+Enter
          </kbd>{" "}
          for new line
        </motion.p>
      </motion.div>

      {/* Example chips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="mt-8 flex flex-wrap justify-center gap-2"
      >
        {EXAMPLE_PROMPTS.map((example, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setPrompt(example);
              textareaRef.current?.focus();
            }}
            className={cn(
              "group flex items-center gap-2 px-4 py-2 rounded-full",
              "bg-elevated/50 border border-border-subtle",
              "text-sm text-text-secondary",
              "hover:border-cyan/30 hover:text-cyan hover:bg-cyan/5",
              "transition-all duration-300"
            )}
          >
            <Sparkles className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
            <span className="max-w-[280px] truncate">{example}</span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
