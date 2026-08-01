import { useCallback, useState } from "react"

import { toast } from "sonner"

import { shortSha } from "../build-format"

interface LogViewInput {
	buildId: string
	/** The build is still in flight — drives the default follow behaviour. */
	active: boolean
	text: string
	isLoading: boolean
}

interface LogView {
	following: boolean
	wrap: boolean
	lineCount: number
	/** What the body shows while there is no text yet. */
	placeholder: string
	toggleFollow: () => void
	toggleWrap: () => void
	/** Raised by the body when the user scrolls away from the tail. */
	leaveTail: () => void
	copy: () => void
	download: () => void
}

/**
 * Everything a log shell needs around LogBody/LogToolbar, so the sheet and the
 * inline viewer behave identically instead of drifting apart.
 *
 * Follow defaults to "on" for a running build and "off" for a settled one, and
 * re-arms per build. It is held as an override keyed by build id rather than
 * synced in an effect, so switching build — which the inline viewer does on its
 * own the moment a new build starts — resets it during render instead of on a
 * second pass.
 */
export function useLogView({ buildId, active, text, isLoading }: Readonly<LogViewInput>): LogView {
	const [wrap, setWrap] = useState(true)
	const [followOverride, setFollowOverride] = useState<{
		buildId: string
		value: boolean
	} | null>(null)

	const following = followOverride?.buildId === buildId ? followOverride.value : active

	const leaveTail = useCallback(() => {
		setFollowOverride({ buildId, value: false })
	}, [buildId])

	const toggleFollow = useCallback(() => {
		setFollowOverride({ buildId, value: !following })
	}, [buildId, following])

	const toggleWrap = useCallback(() => {
		setWrap((current) => !current)
	}, [])

	const copy = useCallback(() => {
		void (async () => {
			try {
				await navigator.clipboard.writeText(text)
				toast.success("Log copied")
			} catch {
				toast.error("Could not copy the log")
			}
		})()
	}, [text])

	const download = useCallback(() => {
		const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
		const url = URL.createObjectURL(blob)
		const link = document.createElement("a")
		link.href = url
		link.download = `build-${shortSha(buildId)}.log`
		link.click()
		URL.revokeObjectURL(url)
	}, [buildId, text])

	let placeholder = "No log output."
	if (isLoading) placeholder = "Loading log…"
	else if (active) placeholder = "Waiting for output…"

	return {
		following,
		wrap,
		lineCount: text === "" ? 0 : text.split("\n").length,
		placeholder,
		toggleFollow,
		toggleWrap,
		leaveTail,
		copy,
		download,
	}
}
