use process_mining::{
    OCEL, export_ocel_json_path, import_ocel_json_from_path, import_ocel_xml_file,
    ocel::ocel_struct::{OCELEvent, OCELObject, OCELRelationship, OCELType},
};

use std::fs::File;
use std::io::Write;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
struct Measure {
    name: String,
    value: f64,
}

#[derive(Serialize, Deserialize, Debug)]
struct Result_Case_Notion {
    case_notion: String,
    name_of_event_log: String,
    object_type: String,
    measures: Vec<Measure>,
    total_score: f64,
}

#[derive(Serialize, Deserialize, Debug)]
struct Runtime_Case_Notion {
    name_of_event_log: String,
    time: f64,
    method: String,
    case_notions: Vec<Result_Case_Notion>,
}
fn main() {
    // let log = create_leading_example_log();
    // // write log to file
    // let file_path = "leading_example_log.json";
    // export_ocel_json_path(&log, file_path).expect("Error exporting OCEL log to file");
    // let results = execute_single_log(
    //     log,
    //     "acn".to_string(),
    //     "leading_example_log".to_string(),
    //     true,
    // );
    // return;
    // Create (or overwrite) the output file.
    // let file_path = "results_absolute_simplicity_(0.8, 10).json";
    // let file_path = "results_".to_string() + file_path;
    // let mut file = File::create(file_path).expect("Unable to create file");
    // file.write_all(
    //     serde_json::to_string(&results)
    //         .expect("error parsing to json")
    //         .as_bytes(),
    // )
    // .expect("error writing to file");
    // return;

    let log_paths = vec![
        "/home/richard-schuppener/Downloads/Event_logs/order-management.xmlocel",
        "/home/richard-schuppener/Downloads/Event_logs/o2c.xmlocel",
        "/home/richard-schuppener/Downloads/Event_logs/p2p.xmlocel",
        "/home/richard-schuppener/Downloads/Event_logs/transfer_order.xmlocel",
        "/home/richard-schuppener/Downloads/Event_logs/recruiting.xmlocel",
        "/home/richard-schuppener/Downloads/Event_logs/github_pm4py.xmlocel",
        "/home/richard-schuppener/Downloads/Event_logs/ContainerLogistics.xmlocel",
        "/home/richard-schuppener/Downloads/Event_logs/socel_hinge.xml",
        "/home/richard-schuppener/Downloads/Event_logs/BPIC15_1.xmlocel",
        "/home/richard-schuppener/Downloads/Event_logs/BPIC15_2.xmlocel",
        "/home/richard-schuppener/Downloads/Event_logs/BPIC15_3.xmlocel",
        "/home/richard-schuppener/Downloads/Event_logs/BPIC15_4.xmlocel",
        "/home/richard-schuppener/Downloads/Event_logs/BPIC15_5.xmlocel",
        "/home/richard-schuppener/Downloads/Event_logs/BPIC17.xmlocel",
        "/home/richard-schuppener/Downloads/Event_logs/bpic19.xmlocel",
        // "/home/richard-schuppener/Downloads/Event_logs/angular_github_commits_ocel.xml",
    ];

    // Create (or overwrite) the output file.
    // let file_path = "results_absolute_simplicity_(0.8, 10).json";
    let file_path = "bpic17+19-results_all_measures_extended_simplicity=(0.6, 20).json";
    let mut file = File::create(file_path).expect("Unable to create file");

    let methods = vec!["acn_mt", "tdcn", "cccn"];

    let mut results = vec![];

    // for log in logs..
    // TODO: split results into 2 files. one contains runtime (whole case notion), the other the measurements (per case notion per object type)
    for log_path in log_paths {
        let name_of_event_log = log_path
            .split('/')
            .last()
            .unwrap_or("unknown_event_log")
            .split('.')
            .next()
            .unwrap_or("unknown_event_log")
            .to_string();
        println!("Processing log: {}", name_of_event_log);
        let log = import_ocel_xml_file(log_path);

        for method in &methods {
            use std::time::Instant;
            let now = Instant::now();

            let mut result = Runtime_Case_Notion {
                name_of_event_log: name_of_event_log.clone(),
                time: 0.0, // Placeholder for runtime, can be updated later
                method: method.to_string(),
                case_notions: execute_log(
                    log.clone(),
                    method.to_string(),
                    name_of_event_log.clone(),
                ),
            };

            let elapsed = now.elapsed();

            result.time = elapsed.as_secs_f64();

            //println!("{:?}", result);

            results.push(result);
        }
    }

    // Write to file
    file.write_all(
        serde_json::to_string(&results)
            .expect("error parsing to json")
            .as_bytes(),
    )
    .expect("error writing to file");
}

fn execute_log(
    log_res_ocel: OCEL,
    method: String,
    name_of_event_log: String,
) -> Vec<Result_Case_Notion> {
    let total_number_of_events = log_res_ocel.events.len();
    let total_number_of_objects = log_res_ocel.objects.len();

    // --- Precomputation Steps ---
    let obj_id_to_type = map_object_id_to_type(&log_res_ocel.objects);
    let unique_object_types = log_res_ocel
        .object_types
        .iter()
        .map(|o| o.name.clone())
        .collect::<FxHashSet<String>>();

    
    let unique_activities = log_res_ocel
        .event_types
        .iter()
        .map(|e| e.name.clone())
        .collect::<FxHashSet<String>>();
    println!(
        "Log loaded: {} events, {} objects, {} object types, {} unique activities",
        total_number_of_events,
        total_number_of_objects,
        unique_object_types.len(),
        unique_activities.len()
    );
    let event_identifiers =
        build_event_identifiers(&log_res_ocel.events, &obj_id_to_type, &unique_object_types);

    let object_identifiers = build_object_identifiers(&log_res_ocel.objects, &log_res_ocel.events);

    let cleaned_event_identifiers: FxHashMap<String, (String, BTreeSet<String>)> =
        event_identifiers
            .iter()
            .map(|(k, v)| (k.clone(), (v.0.clone(), v.1.clone())))
            .collect();

    let mut arches = FxHashSet::default();
    for (event_id, (_, object_ids)) in &cleaned_event_identifiers {
        for object_id in object_ids {
            arches.insert((event_id.clone(), object_id.clone()));
        }
    }

    let mut results = vec![];

    if method == "acn" {
        let diverging_map = detect_diverging_object_types(
            &event_identifiers,
            &unique_object_types,
            &unique_activities,
        );

        for object_type in &unique_object_types {
            let case_notion = advanced_case_notion_for_ot(
                &cleaned_event_identifiers,
                &object_identifiers,
                object_type.clone(),
                &diverging_map,
            );

            let list_of_measures = calculate_measures(
                &case_notion,
                &event_identifiers,
                &object_identifiers,
                &arches,
                total_number_of_objects,
                total_number_of_events,
            );
            let arithmetic_mean = list_of_measures.iter().map(|m| m.value).sum::<f64>()
                / list_of_measures.len() as f64;

            // println!(
            //     "ACN Case notion for object type: {:?}:\nSimplicity of case notion: {}\nCorrectness of case notion: {}\nTotal score for case notion (ot={}): {}\nHomogeneity of case notion (ot={}): {}\n\n----------------------------------\n----------------------------------\n----------------------------------",
            //     object_type,
            //     simplicity,
            //     correctness,
            //     object_type,
            //     (2.0 * correctness * simplicity) / (correctness + simplicity),
            //     object_type,
            //     homogeneity
            // );

            results.push(Result_Case_Notion {
                case_notion: "Advanced Case Notion".to_string(),
                name_of_event_log: name_of_event_log.clone(),
                object_type: object_type.to_string(),
                measures: list_of_measures,
                total_score: arithmetic_mean,
            });
        }
    } else if method == "acn_mt" {
        let diverging_map = detect_diverging_object_types(
            &event_identifiers,
            &unique_object_types,
            &unique_activities,
        );

        use rayon::prelude::*;

        let mt_results: Vec<Result_Case_Notion> = unique_object_types
            .par_iter()
            .map(|object_type| {
                let case_notion = advanced_case_notion_for_ot(
                    &cleaned_event_identifiers,
                    &object_identifiers,
                    object_type.clone(),
                    &diverging_map,
                );

                let list_of_measures = calculate_measures(
                    &case_notion,
                    &event_identifiers,
                    &object_identifiers,
                    &arches,
                    total_number_of_objects,
                    total_number_of_events,
                );
                let arithmetic_mean = list_of_measures.iter().map(|m| m.value).sum::<f64>()
                    / list_of_measures.len() as f64;

                // println!(
                //     "ACN_MT Case notion for object type: {:?}:\nSimplicity of case notion: {}\nCorrectness of case notion: {}\nTotal score for case notion (ot={}): {}\nHomogeneity of case notion (ot={}): {}\n\n----------------------------------\n----------------------------------\n----------------------------------",
                //     object_type,
                //     simplicity,
                //     correctness,
                //     object_type,
                //     (2.0 * correctness * simplicity) / (correctness + simplicity),
                //     object_type,
                //     homogeneity
                // );
                Result_Case_Notion {
                    case_notion: "Advanced Case Notion (Multi-Threaded)".to_string(),
                    name_of_event_log: name_of_event_log.clone(),
                    object_type: object_type.to_string(),
                    measures: list_of_measures,
                    total_score: arithmetic_mean,
                }
            })
            .collect();

        results.extend(mt_results);
    } else if method == "tdcn" {
        for object_type in &unique_object_types {
            let case_notion =
                traditional_case_notion_for_ot(&object_identifiers, object_type.clone());

            let list_of_measures = calculate_measures(
                &case_notion,
                &event_identifiers,
                &object_identifiers,
                &arches,
                total_number_of_objects,
                total_number_of_events,
            );
            let arithmetic_mean = list_of_measures.iter().map(|m| m.value).sum::<f64>()
                / list_of_measures.len() as f64;

            // println!(
            //     "ACN Case notion for object type: {:?}:\nSimplicity of case notion: {}\nCorrectness of case notion: {}\nTotal score for case notion (ot={}): {}\nHomogeneity of case notion (ot={}): {}\n\n----------------------------------\n----------------------------------\n----------------------------------",
            //     object_type,
            //     simplicity,
            //     correctness,
            //     object_type,
            //     (2.0 * correctness * simplicity) / (correctness + simplicity),
            //     object_type,
            //     homogeneity
            // );

            results.push(Result_Case_Notion {
                case_notion: "Advanced Case Notion".to_string(),
                name_of_event_log: name_of_event_log.clone(),
                object_type: object_type.to_string(),
                measures: list_of_measures,
                total_score: arithmetic_mean,
            });
        }
    } else if method == "cccn" {
        let case_notion =
            connected_components_notion(cleaned_event_identifiers, object_identifiers.clone());

        let list_of_measures = calculate_measures(
            &case_notion,
            &event_identifiers,
            &object_identifiers,
            &arches,
            total_number_of_objects,
            total_number_of_events,
        );
        let arithmetic_mean =
            list_of_measures.iter().map(|m| m.value).sum::<f64>() / list_of_measures.len() as f64;

        // println!(
        //     "ACN Case notion for object type: {:?}:\nSimplicity of case notion: {}\nCorrectness of case notion: {}\nTotal score for case notion (ot={}): {}\nHomogeneity of case notion (ot={}): {}\n\n----------------------------------\n----------------------------------\n----------------------------------",
        //     object_type,
        //     simplicity,
        //     correctness,
        //     object_type,
        //     (2.0 * correctness * simplicity) / (correctness + simplicity),
        //     object_type,
        //     homogeneity
        // );

        results.push(Result_Case_Notion {
            case_notion: "Advanced Case Notion".to_string(),
            name_of_event_log: name_of_event_log.clone(),
            object_type: "None".to_string(),
            measures: list_of_measures,
            total_score: arithmetic_mean,
        });
    }
    results
}