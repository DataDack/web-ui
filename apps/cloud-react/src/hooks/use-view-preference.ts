import { useCallback, useState } from "react"

import { useSearchParams } from "react-router-dom"

/**
 * A view choice — grid or table, compact or comfortable — that is both
 * shareable and sticky.
 *
 * Two stores, deliberately, because neither answers the whole question.
 * `useQueryParamState` alone deletes the fallback value from the URL to keep
 * default views clean, which means a user whose preference IS the non-default
 * can never produce a link that carries it. localStorage alone is not in the URL
 * at all. So: the URL wins when present, storage is the personal default behind
 * it, and an explicit choice writes BOTH — always setting the param, never
 * deleting it.
 *
 * Storage is written only from `setValue`, never mirrored from the URL in an
 * effect: opening a colleague's ?view=list link is not a decision about your own
 * default, and treating it as one silently rewrites a preference you never
 * touched.
 */
export function useViewPreference<T extends string>(
	paramKey: string,
	allowed: readonly T[],
	fallback: T,
	storageKey: string
): [T, (value: T) => void] {
	const [searchParams, setSearchParams] = useSearchParams()

	const isAllowed = (raw: string | null): raw is T => allowed.includes(raw as T)

	// Read once per mount, via a lazy initialiser: storage is a side channel, and
	// re-reading it every render would let a write race its own read.
	const [stored, setStored] = useState<T>(() => readStored(storageKey, isAllowed) ?? fallback)

	const fromUrl = searchParams.get(paramKey)
	const value = isAllowed(fromUrl) ? fromUrl : stored

	const setValue = useCallback(
		(next: T) => {
			setStored(next)
			writeStored(storageKey, next)
			setSearchParams(
				(prev) => {
					const params = new URLSearchParams(prev)
					params.set(paramKey, next)
					return params
				},
				// Flipping a view is not a navigation; stacking history entries
				// would make Back feel broken.
				{ replace: true }
			)
		},
		[paramKey, storageKey, setSearchParams]
	)

	return [value, setValue]
}

/**
 * Storage access is guarded rather than assumed: `localStorage` throws on access
 * in a Safari private window and in an iframe with third-party storage blocked,
 * and an unreadable preference must degrade to the default, not take the page
 * down.
 */
function readStored<T extends string>(
	key: string,
	isAllowed: (raw: string | null) => raw is T
): T | null {
	try {
		const raw = window.localStorage.getItem(key)
		return isAllowed(raw) ? raw : null
	} catch {
		return null
	}
}

function writeStored(key: string, value: string): void {
	try {
		window.localStorage.setItem(key, value)
	} catch {
		// A preference that cannot be persisted still applies for this session.
	}
}
