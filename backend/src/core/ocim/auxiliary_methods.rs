use rustc_hash::{FxHashMap, FxHashSet};

use crate::core::ocim::common_data::GlobalData;

/// Shared related types for (a,b) that are non-divergent in at least one context activity.
pub fn get_non_divergent_types(
    a: &String,
    b: &String,
    context_activities: &[String],
    global_data: &GlobalData,
) -> FxHashSet<String> {
    let shared_related: FxHashSet<String> = match (
        global_data.related.get(a),
        global_data.related.get(b),
    ) {
        (Some(rel_a), Some(rel_b)) => rel_a.intersection(rel_b).cloned().collect(),
        _ => FxHashSet::default(),
    };

    shared_related
        .into_iter()
        .filter(|ot| {
            // Python: not all(ot not in related[c] or ot in divergence[c] for c in context)
            !context_activities.iter().all(|c| {
                let in_related = global_data
                    .related
                    .get(c)
                    .map(|rel| rel.contains(ot))
                    .unwrap_or(false);
                let in_div = global_data
                    .divergence
                    .get(c)
                    .map(|div| div.contains(ot))
                    .unwrap_or(false);
                !in_related || in_div
            })
        })
        .collect()
}

/// Shared related types for (a,b) that are divergent across the full context.
pub fn get_divergent_types(
    a: &String,
    b: &String,
    context_activities: &[String],
    global_data: &GlobalData,
) -> FxHashSet<String> {
    let shared_related: FxHashSet<String> = match (
        global_data.related.get(a),
        global_data.related.get(b),
    ) {
        (Some(rel_a), Some(rel_b)) => rel_a.intersection(rel_b).cloned().collect(),
        _ => FxHashSet::default(),
    };

    shared_related
        .into_iter()
        .filter(|ot| {
            context_activities.iter().all(|c| {
                let is_related = global_data
                    .related
                    .get(c)
                    .map(|rel| rel.contains(ot))
                    .unwrap_or(false);
                let is_divergent = global_data
                    .divergence
                    .get(c)
                    .map(|div| div.contains(ot))
                    .unwrap_or(false);
                !is_related || is_divergent
            })
        })
        .collect()
}
