# Test report

All data synthetic. [Successful native CI and Docker run](https://github.com/umair24171/sales-call-to-crm-sync/actions/runs/40031451224), verified code commit `cc1bc499c73958e810218b9baee00d2c6fd3f8e0`. Complete actual stdout: docs/native-ci-output.txt.

| Environment                    | Discovered | Passed | Failed | Skipped |
| ------------------------------ | ---------: | -----: | -----: | ------: |
| PostgreSQL service             |         30 |     30 |      0 |       0 |
| Embedded PostgreSQL complement |         30 |     30 |      0 |       0 |

All 30 distinct cases passed in at least one appropriate environment. No test cases were skipped.

Dependency install, formatting, TypeScript, native database tests, embedded complement, configured full-history secret scan, native demo and Docker Compose build/demo passed. Docker ran from a fresh Actions checkout and isolated volume, with no deployment. Earlier fresh local-clone evidence remains in docs/clean-clone-output.txt. Live Claude requests were not made. There are no real customer fixtures.

Known platform-specific assertion/implementation fixes are in PROGRESS.md and history. No test was deleted or weakened.
