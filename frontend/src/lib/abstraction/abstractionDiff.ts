import type { OCLanguageAbstraction } from '~/types/abstraction.types';

export interface DfgDiff {
    uniqueEvents: Set<string>;
    sharedEvents: Set<string>;
    uniqueEdges: Set<string>;
    sharedEdges: Set<string>;
}

function eventsForOt(abstraction: OCLanguageAbstraction, ot: string): Set<string> {
    const events = new Set<string>();
    for (const [from, to] of abstraction.directly_follows_ev_types_per_ob_type[ot] ?? []) {
        events.add(from);
        events.add(to);
    }
    return events;
}

function edgesForOt(abstraction: OCLanguageAbstraction, ot: string): Set<string> {
    return new Set(
        (abstraction.directly_follows_ev_types_per_ob_type[ot] ?? []).map(([from, to]) => `${from}|${to}`)
    );
}

/**
 * Computes which events and DF-edges are unique to `thisOt` vs `otherOt`,
 * and which are shared. Returns the result from `thisOt`'s perspective.
 */
export function computeDfgDiff(
    abstraction: OCLanguageAbstraction,
    thisOt: string,
    otherOt: string
): DfgDiff {
    const thisEvents = eventsForOt(abstraction, thisOt);
    const otherEvents = eventsForOt(abstraction, otherOt);
    const thisEdges = edgesForOt(abstraction, thisOt);
    const otherEdges = edgesForOt(abstraction, otherOt);

    const uniqueEvents = new Set<string>();
    const sharedEvents = new Set<string>();
    for (const ev of thisEvents) {
        if (otherEvents.has(ev)) sharedEvents.add(ev);
        else uniqueEvents.add(ev);
    }

    const uniqueEdges = new Set<string>();
    const sharedEdges = new Set<string>();
    for (const edge of thisEdges) {
        if (otherEdges.has(edge)) sharedEdges.add(edge);
        else uniqueEdges.add(edge);
    }

    return { uniqueEvents, sharedEvents, uniqueEdges, sharedEdges };
}
