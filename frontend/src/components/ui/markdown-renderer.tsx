// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import React, { Suspense, useCallback, useEffect, useState } from "react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { codeToTokens, bundledLanguages, ThemedToken } from "shiki";

import { cn } from "@/lib/utils"
import { CopyButton } from "@/components/ui/copy-button"

interface MarkdownRendererProps {
	children: string,
	type: 'dark' | 'light',
}

export function MarkdownRenderer({ children, type }: MarkdownRendererProps) {
	const newCodeFunc = useCallback((...args) => {
		return COMPONENTS.code(type, ...args)
	}, [type]);
	
	return (
		<Markdown
			remarkPlugins={[remarkGfm]}
			components={{...COMPONENTS, code: newCodeFunc}}
			className="space-y-3"
		>
			{children}
		</Markdown>
	)
}

const loadShikiLight = async (code: string, language: string) => {
	if (!(language in bundledLanguages)) return null
	return codeToTokens(code, {
		lang: language as keyof typeof bundledLanguages,
		defaultColor: false,
	themes: { light: "catppuccin-latte", dark: "catppuccin-latte" },
	});
}

const loadShikiDark = async (code: string, language: string) => {
	if (!(language in bundledLanguages)) return null
	return codeToTokens(code, {
		lang: language as keyof typeof bundledLanguages,
		defaultColor: false,
		themes: { light: "aurora-x", dark: "andromeeda" },
	})
}

const HighlightedPre = ({ children, language, type, ...props }: CodeBlockProps) => {
	const [tokens, setTokens] = useState<Array<Array<ThemedToken>>>([])

	useEffect(() => {
		if (type === 'dark') {
			loadShikiDark(children as string, language).then((result) => {
				if (result) setTokens(result.tokens)
			})
		}
		if (type === 'light') {
			loadShikiLight(children as string, language).then((result) => {
				if (result) setTokens(result.tokens)
			})
		}

	}, [children, language, type])

	return tokens.length ? (
		<pre {...props}>
			<code>
				{tokens.map((line, lineIndex) => (
					<span key={lineIndex}>
						{line.map((token, tokenIndex) => (
							<span
								key={tokenIndex}
								className="text-shiki-light bg-shiki-light-bg dark:text-shiki-dark dark:bg-shiki-dark-bg"
								style={typeof token.htmlStyle === "string" ? {} : token.htmlStyle}
							>
								{token.content}
							</span>
						))}
						{"\n"}
					</span>
				))}
			</code>
		</pre>
	) : (
		<pre {...props}>{children}</pre>
	)
}

interface CodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
	children: React.ReactNode
	className?: string
	language: string
	type: 'dark' | 'light'
}

const CodeBlock = ({ children, className, language, type, ...restProps }: CodeBlockProps) => {
	const code = typeof children === "string" ? children : flattenChildren(children)

	return (
		<div className="group/code relative mb-4">
			<Suspense fallback={<pre className={cn("p-4 rounded-md", className)} {...restProps}>{children}</pre>}>
				<HighlightedPre type={type} language={language} className={cn("overflow-x-auto p-4", className)}>
					{code}
				</HighlightedPre>
			</Suspense>

			<div className="invisible absolute right-2 top-2 flex space-x-1 rounded-lg p-1 opacity-0 transition-opacity group-hover/code:visible group-hover/code:opacity-100">
				<CopyButton content={code} copyMessage="Copied code to clipboard" />
			</div>
		</div>
	)
}

function flattenChildren(element: Element): string {
	if (typeof element === "string") return element
	if (
		React.isValidElement(element)
		&& element.props 
		&& typeof element.props === 'object'
		&& 'children' in element.props
	) {
		return React.Children.toArray(element.props.children)
			.map(flattenChildren)
			.join("")
	}
	return ""
}

const COMPONENTS = {
	h1: withClass("h1", "text-2xl font-semibold"),
	h2: withClass("h2", "font-semibold text-xl"),
	h3: withClass("h3", "font-semibold text-lg"),
	h4: withClass("h4", "font-semibold text-base"),
	h5: withClass("h5", "font-medium"),
	strong: withClass("strong", "font-semibold"),
	a: withClass("a", "text-primary underline underline-offset-2"),
	blockquote: withClass("blockquote", "border-l-2 border-primary pl-4"),
	code: (type: 'light' | 'dark', { children, className, ...rest }: any) => {
		const match = /language-(\w+)/.exec(className || "")
		return match ? (
			<CodeBlock className={className} type={type} language={match[1]} {...rest}>
				{children}
			</CodeBlock>
		) : (
			<code className={cn("font-mono rounded-md bg-background/50 px-1 py-0.5")} {...rest}>
				{children}
			</code>
		)
	},
	pre: ({ children }: any) => children,
	ol: withClass("ol", "list-decimal space-y-2 pl-6"),
	ul: withClass("ul", "list-disc space-y-2 pl-6"),
	li: withClass("li", "my-1.5"),
	table: withClass("table", "w-full border-collapse rounded-md border border-foreground/20"),
	th: withClass("th", "border px-4 py-2 text-left font-bold"),
	td: withClass("td", "border px-4 py-2 text-left"),
	tr: withClass("tr", "border-t even:bg-muted"),
	p: withClass("p", "whitespace-pre-wrap"),
	hr: withClass("hr", "border-foreground/20"),
}

function withClass(Tag: keyof JSX.IntrinsicElements, classes: string) {
	const Component = ({ node, ...props }: any) => <Tag className={classes} {...props} />
	Component.displayName = Tag
	return Component
}

export default MarkdownRenderer

