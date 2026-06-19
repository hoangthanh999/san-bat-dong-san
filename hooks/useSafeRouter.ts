import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;
type PushTarget = Parameters<Router['push']>[0];
type ReplaceTarget = Parameters<Router['replace']>[0];
type NavigateTarget = Parameters<Router['navigate']>[0];

const DEFAULT_NAVIGATION_LOCK_MS = 800;

const getRouteKey = (action: string, target: unknown) => {
    if (typeof target === 'string') return `${action}:${target}`;

    try {
        return `${action}:${JSON.stringify(target)}`;
    } catch {
        return `${action}:${String(target)}`;
    }
};

export function useSafeRouter(lockMs = DEFAULT_NAVIGATION_LOCK_MS) {
    const router = useRouter();
    const lockedKeyRef = useRef<string | null>(null);
    const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearLock = useCallback(() => {
        lockedKeyRef.current = null;
        unlockTimerRef.current = null;
    }, []);

    const runGuarded = useCallback((key: string, action: () => void) => {
        if (lockedKeyRef.current === key) return false;

        if (unlockTimerRef.current) {
            clearTimeout(unlockTimerRef.current);
        }

        lockedKeyRef.current = key;
        action();
        unlockTimerRef.current = setTimeout(clearLock, lockMs);
        return true;
    }, [clearLock, lockMs]);

    useEffect(() => () => {
        if (unlockTimerRef.current) {
            clearTimeout(unlockTimerRef.current);
        }
    }, []);

    const safePush = useCallback((target: PushTarget) => (
        runGuarded(getRouteKey('push', target), () => router.push(target))
    ), [router, runGuarded]);

    const safeReplace = useCallback((target: ReplaceTarget) => (
        runGuarded(getRouteKey('replace', target), () => router.replace(target))
    ), [router, runGuarded]);

    const safeNavigate = useCallback((target: NavigateTarget) => (
        runGuarded(getRouteKey('navigate', target), () => router.navigate(target))
    ), [router, runGuarded]);

    return { router, safePush, safeReplace, safeNavigate };
}
