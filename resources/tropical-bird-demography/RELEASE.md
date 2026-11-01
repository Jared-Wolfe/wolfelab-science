# Seven-station Explorer release

Prepared November 1, 2026 from the verified October 30 results package for CJS job 73481 and Pradel job 73737. The website retains its existing audience and hosting configuration.

The release contains 126 species, seven stations, 264 species-by-station populations, 8,236 annual intervals per metric, and 792 long-term summaries. Stations are BDFFP KM41, BDFFP 2303, BDFFP 3304, Tiputini Harpia, Tiputini Puma, Limbo, and Taricaya. Species display only their eligible stations.

Apparent survival uses CJS; recruitment/entry and population growth use the joint Pradel posterior. Medians and 90% credible intervals are copied from the accepted summaries. Long-term summaries average annual values within posterior draws before summarizing. All modeled intervals remain, including 1,320 intervals per metric without local sampling. No models were refitted.

Package ZIP SHA-256: `fb8758731b8017c59d9851835858c3729f6152fbbad4c7ff436a58dcb507a2d4`.
Canonical model data SHA-256: `6795e25e52b0994d9984ac07e569ad5565dff6b949ed8778ec746d501ccc948e`.

All package hashes passed. Every published annual and long-term mean, median, q05, and q95 was checked against the package tables. Annual effort, capture support, station identifiers, and cross-metric interval joins passed. Browser checks covered all metrics, station toggles, aligned support strips, BDFFP additions, Limbo, and Taricaya. CSV exports retain interval counts and native diagnostic flags.

CJS remains ACCEPT_WITH_BDFFP_DATA_CAUTION. Pradel remains ACCEPT_WITH_RECRUITMENT_CAUTION. Sparse or gap-adjacent recruitment intervals and temporal variance allocation require caution. The interface and provenance retain those limitations. Seven stations represent four climate regions, not seven independent climate replicates.

The prior interrupted chat did not leave a committed website update. This release rebuilds from the verified source package and publishes the complete file set together.

The HTML entry point, JavaScript module imports, and JSON requests use a shared release version in their URLs. This prevents a returning visitor's cached five-station scripts or data from mixing with the seven-station release.
